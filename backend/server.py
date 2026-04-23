from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("queue_app")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Queue Management System")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL = timedelta(days=7)

bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + ACCESS_TTL,
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
Role = Literal["admin", "merchant", "customer"]
MerchantStatus = Literal["pending", "approved", "rejected", "suspended"]
QueueStatus = Literal["waiting", "called", "served", "skipped", "cancelled"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Role = "customer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: dict


class CategoryIn(BaseModel):
    name: str
    avg_service_minutes: int = 5


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    avg_service_minutes: int = 5


class MerchantIn(BaseModel):
    name: str
    description: Optional[str] = ""
    address: Optional[str] = ""
    image_url: Optional[str] = ""


class Merchant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    name: str
    description: str = ""
    address: str = ""
    image_url: str = ""
    status: MerchantStatus = "pending"
    categories: List[Category] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=now_utc)


class JoinQueueIn(BaseModel):
    merchant_id: str
    category_id: str
    customer_name: Optional[str] = None  # guest name if not member


class QueueEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    merchant_id: str
    category_id: str
    category_name: str
    user_id: Optional[str] = None
    customer_name: str
    queue_number: int
    status: QueueStatus = "waiting"
    created_at: datetime = Field(default_factory=now_utc)
    called_at: Optional[datetime] = None
    served_at: Optional[datetime] = None


class UpdateMerchantStatusIn(BaseModel):
    status: MerchantStatus


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------
def user_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "created_at": iso(u["created_at"]) if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


def merchant_public(m: dict) -> dict:
    return {
        "id": m["id"],
        "owner_id": m["owner_id"],
        "name": m["name"],
        "description": m.get("description", ""),
        "address": m.get("address", ""),
        "image_url": m.get("image_url", ""),
        "status": m.get("status", "pending"),
        "categories": m.get("categories", []),
        "created_at": iso(m["created_at"]) if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    }


def entry_public(e: dict) -> dict:
    return {
        "id": e["id"],
        "merchant_id": e["merchant_id"],
        "category_id": e["category_id"],
        "category_name": e.get("category_name", ""),
        "user_id": e.get("user_id"),
        "customer_name": e["customer_name"],
        "queue_number": e["queue_number"],
        "status": e["status"],
        "created_at": iso(e["created_at"]) if isinstance(e.get("created_at"), datetime) else e.get("created_at"),
        "called_at": iso(e["called_at"]) if isinstance(e.get("called_at"), datetime) else e.get("called_at"),
        "served_at": iso(e["served_at"]) if isinstance(e.get("served_at"), datetime) else e.get("served_at"),
    }


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register", response_model=AuthOut)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot self-register as admin")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "created_at": now_utc(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": user_public(user)}


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": user_public(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


# ---------------------------------------------------------------------------
# Merchant endpoints
# ---------------------------------------------------------------------------
@api.post("/merchants")
async def create_merchant(body: MerchantIn, user: dict = Depends(require_role("merchant", "admin"))):
    m = Merchant(owner_id=user["id"], name=body.name, description=body.description or "",
                 address=body.address or "", image_url=body.image_url or "").dict()
    # Auto-approve for admin
    if user["role"] == "admin":
        m["status"] = "approved"
    await db.merchants.insert_one(m)
    return merchant_public(m)


@api.get("/merchants")
async def list_merchants():
    # Public browsing -> only approved merchants
    cursor = db.merchants.find({"status": "approved"}, {"_id": 0})
    return [merchant_public(m) async for m in cursor]


@api.get("/merchants/mine")
async def my_merchants(user: dict = Depends(require_role("merchant", "admin"))):
    cursor = db.merchants.find({"owner_id": user["id"]}, {"_id": 0})
    return [merchant_public(m) async for m in cursor]


@api.get("/merchants/{merchant_id}")
async def get_merchant(merchant_id: str):
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return merchant_public(m)


@api.put("/merchants/{merchant_id}")
async def update_merchant(merchant_id: str, body: MerchantIn, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.merchants.update_one(
        {"id": merchant_id},
        {"$set": {"name": body.name, "description": body.description or "",
                  "address": body.address or "", "image_url": body.image_url or ""}},
    )
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    return merchant_public(m)


@api.post("/merchants/{merchant_id}/categories")
async def add_category(merchant_id: str, body: CategoryIn, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    cat = Category(name=body.name, avg_service_minutes=body.avg_service_minutes).dict()
    await db.merchants.update_one({"id": merchant_id}, {"$push": {"categories": cat}})
    return cat


@api.delete("/merchants/{merchant_id}/categories/{category_id}")
async def delete_category(merchant_id: str, category_id: str, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.merchants.update_one({"id": merchant_id}, {"$pull": {"categories": {"id": category_id}}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Queue endpoints
# ---------------------------------------------------------------------------
async def next_queue_number(merchant_id: str) -> int:
    today = now_utc().strftime("%Y-%m-%d")
    key = f"{merchant_id}:{today}"
    res = await db.queue_counters.find_one_and_update(
        {"key": key},
        {"$inc": {"seq": 1}, "$setOnInsert": {"key": key, "created_at": now_utc()}},
        upsert=True,
        return_document=True,
    )
    # motor returns doc after update when return_document=ReturnDocument.AFTER; but default returns before
    # Safer: re-read
    doc = await db.queue_counters.find_one({"key": key})
    return doc["seq"]


@api.post("/queue/join")
async def join_queue(body: JoinQueueIn, request: Request,
                     credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    # optional auth
    user = None
    if credentials and credentials.credentials:
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
            user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        except jwt.PyJWTError:
            user = None

    m = await db.merchants.find_one({"id": body.merchant_id})
    if not m or m.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Merchant unavailable")
    cat = next((c for c in m.get("categories", []) if c["id"] == body.category_id), None)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    customer_name = (body.customer_name or (user["name"] if user else None) or "Guest").strip()

    number = await next_queue_number(body.merchant_id)
    entry = QueueEntry(
        merchant_id=body.merchant_id,
        category_id=body.category_id,
        category_name=cat["name"],
        user_id=user["id"] if user else None,
        customer_name=customer_name,
        queue_number=number,
    ).dict()
    await db.queue_entries.insert_one(entry)
    return entry_public(entry)


@api.get("/queue/{entry_id}")
async def get_queue_entry(entry_id: str):
    e = await db.queue_entries.find_one({"id": entry_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    # compute position and eta
    ahead = await db.queue_entries.count_documents({
        "merchant_id": e["merchant_id"],
        "category_id": e["category_id"],
        "status": "waiting",
        "queue_number": {"$lt": e["queue_number"]},
    })
    m = await db.merchants.find_one({"id": e["merchant_id"]}, {"_id": 0})
    cat = next((c for c in (m.get("categories", []) if m else []) if c["id"] == e["category_id"]), None)
    avg = cat["avg_service_minutes"] if cat else 5
    data = entry_public(e)
    data["position"] = ahead
    data["estimated_wait_minutes"] = ahead * avg
    return data


@api.get("/queue/mine/active")
async def my_active_queues(user: dict = Depends(get_current_user)):
    cursor = db.queue_entries.find(
        {"user_id": user["id"], "status": {"$in": ["waiting", "called"]}},
        {"_id": 0},
    ).sort("created_at", -1)
    entries = []
    async for e in cursor:
        ahead = await db.queue_entries.count_documents({
            "merchant_id": e["merchant_id"],
            "category_id": e["category_id"],
            "status": "waiting",
            "queue_number": {"$lt": e["queue_number"]},
        })
        m = await db.merchants.find_one({"id": e["merchant_id"]}, {"_id": 0})
        cat = next((c for c in (m.get("categories", []) if m else []) if c["id"] == e["category_id"]), None)
        avg = cat["avg_service_minutes"] if cat else 5
        d = entry_public(e)
        d["position"] = ahead
        d["estimated_wait_minutes"] = ahead * avg
        d["merchant_name"] = m["name"] if m else ""
        entries.append(d)
    return entries


@api.get("/merchants/{merchant_id}/queue")
async def merchant_queue(merchant_id: str, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    cursor = db.queue_entries.find({"merchant_id": merchant_id}, {"_id": 0}).sort("queue_number", 1)
    entries = [entry_public(e) async for e in cursor]
    return entries


@api.post("/merchants/{merchant_id}/queue/next")
async def call_next(merchant_id: str, category_id: Optional[str] = None,
                    user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    # mark any currently-called -> served
    await db.queue_entries.update_many(
        {"merchant_id": merchant_id, "status": "called", **({"category_id": category_id} if category_id else {})},
        {"$set": {"status": "served", "served_at": now_utc()}},
    )
    q = {"merchant_id": merchant_id, "status": "waiting"}
    if category_id:
        q["category_id"] = category_id
    nxt = await db.queue_entries.find_one_and_update(
        q,
        {"$set": {"status": "called", "called_at": now_utc()}},
        sort=[("queue_number", 1)],
        return_document=True,
    )
    if not nxt:
        return {"entry": None}
    entry = await db.queue_entries.find_one({"id": nxt["id"] if "id" in nxt else q}, {"_id": 0})
    # Safer re-read:
    entry = await db.queue_entries.find_one({"merchant_id": merchant_id, "status": "called"}, {"_id": 0}, sort=[("called_at", -1)])
    return {"entry": entry_public(entry) if entry else None}


@api.post("/merchants/{merchant_id}/queue/{entry_id}/skip")
async def skip_entry(merchant_id: str, entry_id: str, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.queue_entries.update_one(
        {"id": entry_id, "merchant_id": merchant_id},
        {"$set": {"status": "skipped"}},
    )
    return {"ok": True}


@api.post("/merchants/{merchant_id}/queue/{entry_id}/serve")
async def serve_entry(merchant_id: str, entry_id: str, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.queue_entries.update_one(
        {"id": entry_id, "merchant_id": merchant_id},
        {"$set": {"status": "served", "served_at": now_utc()}},
    )
    return {"ok": True}


# Public TV display endpoint
@api.get("/merchants/{merchant_id}/queue/tv")
async def tv_display(merchant_id: str):
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    now_serving = await db.queue_entries.find_one(
        {"merchant_id": merchant_id, "status": "called"},
        {"_id": 0},
        sort=[("called_at", -1)],
    )
    cursor = db.queue_entries.find(
        {"merchant_id": merchant_id, "status": "waiting"}, {"_id": 0}
    ).sort("queue_number", 1).limit(6)
    upcoming = [entry_public(e) async for e in cursor]
    recent_served = await db.queue_entries.find(
        {"merchant_id": merchant_id, "status": "served"},
        {"_id": 0},
    ).sort("served_at", -1).limit(3).to_list(3)
    return {
        "merchant": merchant_public(m),
        "now_serving": entry_public(now_serving) if now_serving else None,
        "upcoming": upcoming,
        "recent_served": [entry_public(e) for e in recent_served],
    }


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    cursor = db.users.find({}, {"_id": 0, "password_hash": 0})
    return [user_public(u) async for u in cursor]


@api.get("/admin/merchants")
async def admin_merchants(user: dict = Depends(require_role("admin"))):
    cursor = db.merchants.find({}, {"_id": 0})
    return [merchant_public(m) async for m in cursor]


@api.put("/admin/merchants/{merchant_id}/status")
async def admin_update_merchant_status(merchant_id: str, body: UpdateMerchantStatusIn,
                                       user: dict = Depends(require_role("admin"))):
    res = await db.merchants.update_one({"id": merchant_id}, {"$set": {"status": body.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Merchant not found")
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    return merchant_public(m)


@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    return {
        "users": await db.users.count_documents({}),
        "merchants": await db.merchants.count_documents({}),
        "pending_merchants": await db.merchants.count_documents({"status": "pending"}),
        "approved_merchants": await db.merchants.count_documents({"status": "approved"}),
        "total_queues_today": await db.queue_entries.count_documents({
            "created_at": {"$gte": datetime.combine(now_utc().date(), datetime.min.time()).replace(tzinfo=timezone.utc)}
        }),
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"message": "Queue Management System API", "status": "ok"}


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.merchants.create_index("id", unique=True)
    await db.merchants.create_index("owner_id")
    await db.queue_entries.create_index("id", unique=True)
    await db.queue_entries.create_index([("merchant_id", 1), ("status", 1), ("queue_number", 1)])
    await db.queue_counters.create_index("key", unique=True)

    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@queue.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "System Admin",
            "role": "admin",
            "created_at": now_utc(),
        })
        logger.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )
        logger.info("Updated admin password")


@app.on_event("shutdown")
async def shutdown():
    client.close()
