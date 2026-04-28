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

import asyncio
import re
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
# Available themes (admin picks one)
# ---------------------------------------------------------------------------
THEMES = {
    "slate_emerald": {
        "key": "slate_emerald", "label": "Slate & Emerald",
        "primary": "#0F766E", "primaryDark": "#0B5953", "soft": "#D1FAE5",
        "bg": "#F8FAFC", "text": "#0F172A", "muted": "#64748B",
        "accent": "#10B981",
    },
    "navy_gold": {
        "key": "navy_gold", "label": "Navy & Gold",
        "primary": "#1E3A8A", "primaryDark": "#1E293B", "soft": "#DBEAFE",
        "bg": "#F8FAFC", "text": "#0F172A", "muted": "#64748B",
        "accent": "#D97706",
    },
    "graphite": {
        "key": "graphite", "label": "Graphite Mono",
        "primary": "#1F2937", "primaryDark": "#111827", "soft": "#E5E7EB",
        "bg": "#FAFAFA", "text": "#111827", "muted": "#6B7280",
        "accent": "#EF4444",
    },
    "plum": {
        "key": "plum", "label": "Plum & Lavender",
        "primary": "#6D28D9", "primaryDark": "#4C1D95", "soft": "#EDE9FE",
        "bg": "#FAFAFC", "text": "#1E1B4B", "muted": "#6B7280",
        "accent": "#EC4899",
    },
    "teal_coral": {
        "key": "teal_coral", "label": "Teal & Coral",
        "primary": "#0891B2", "primaryDark": "#155E75", "soft": "#CFFAFE",
        "bg": "#F8FAFC", "text": "#0C4A6E", "muted": "#64748B",
        "accent": "#F97316",
    },
    "pure_white": {
        "key": "pure_white", "label": "Pure White",
        "primary": "#18181B", "primaryDark": "#09090B", "soft": "#F4F4F5",
        "bg": "#FFFFFF", "text": "#18181B", "muted": "#71717A",
        "accent": "#3F3F46",
    },
    "midnight": {
        "key": "midnight", "label": "Midnight Dark",
        "primary": "#6366F1", "primaryDark": "#4338CA", "soft": "#1E1B4B",
        "bg": "#0F0F0F", "text": "#F1F5F9", "muted": "#94A3B8",
        "accent": "#818CF8",
    },
    "crimson": {
        "key": "crimson", "label": "Crimson Red",
        "primary": "#DC2626", "primaryDark": "#991B1B", "soft": "#FEE2E2",
        "bg": "#FFF7F7", "text": "#1C0A0A", "muted": "#6B7280",
        "accent": "#F97316",
    },
    "forest": {
        "key": "forest", "label": "Forest Green",
        "primary": "#15803D", "primaryDark": "#14532D", "soft": "#DCFCE7",
        "bg": "#F7FFF9", "text": "#052E16", "muted": "#6B7280",
        "accent": "#84CC16",
    },
    "sunset": {
        "key": "sunset", "label": "Sunset Orange",
        "primary": "#EA580C", "primaryDark": "#9A3412", "soft": "#FFEDD5",
        "bg": "#FFFBF7", "text": "#1C0A00", "muted": "#6B7280",
        "accent": "#EAB308",
    },
}

DEFAULT_SETTINGS = {
    "app_logo_url": "",
    "theme_key": "slate_emerald",
    "app_name": "QUELESS",
    "app_headline": "Antrian jadi mudah",
    "app_tagline": "Pilih merchant, ambil nomor antrian, pantau posisi Anda secara real-time.",
    "midtrans_server_key": "",
    "midtrans_client_key": "",
    "midtrans_is_production": False,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime]):
    if dt is None:
        return None
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


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r'[àáâãäå]', 'a', s)
    s = re.sub(r'[èéêë]', 'e', s)
    s = re.sub(r'[ìíîï]', 'i', s)
    s = re.sub(r'[òóôõö]', 'o', s)
    s = re.sub(r'[ùúûü]', 'u', s)
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s.strip())
    s = re.sub(r'-+', '-', s)
    return s or "merchant"


def is_within_operating_hours(hours_schedule: list) -> bool:
    """Return True if current local time falls within any scheduled day/hours."""
    if not hours_schedule:
        return True  # No schedule set → always open
    now = datetime.now(tz=timezone(timedelta(hours=7)))  # WIB (UTC+7)
    today = now.weekday()  # 0=Mon, 6=Sun
    current_hm = now.strftime("%H:%M")
    today_entries = [e for e in hours_schedule if e.get("day") == today]
    if not today_entries:
        return True  # Today not in schedule → treat as open
    for entry in today_entries:
        op = entry.get("open", "00:00")
        cl = entry.get("close", "23:59")
        if op <= current_hm <= cl:
            return True
    return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": now_utc() + ACCESS_TTL, "type": "access",
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


async def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[dict]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        return user
    except jwt.PyJWTError:
        return None


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
PaymentStatus = Literal["pending", "paid", "failed", "expired"]
SubStatus = Literal["active", "expired", "suspended"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    username: Optional[str] = None
    role: Role = "customer"


class LoginIn(BaseModel):
    email: str  # accepts email OR username
    password: str


class OAuthProcessIn(BaseModel):
    session_id: str


class AuthOut(BaseModel):
    token: str
    user: dict


class CategoryIn(BaseModel):
    name: str
    avg_service_minutes: int = 5


class MerchantIn(BaseModel):
    name: str
    description: Optional[str] = ""
    address: Optional[str] = ""
    logo_url: Optional[str] = ""
    photo_url: Optional[str] = ""
    tv_photo_url: Optional[str] = ""
    tv_video_url: Optional[str] = ""  # YouTube link for TV display
    hours_text: Optional[str] = ""
    hours_days: Optional[List[int]] = None  # 0=Mon..6=Sun
    hours_open: Optional[str] = ""  # "09:00"
    hours_close: Optional[str] = ""  # "21:00"
    hours_schedule: Optional[List[dict]] = None  # [{day:0, open:"09:00", close:"21:00"}]
    service_enabled: Optional[bool] = False
    is_open: Optional[bool] = True


class JoinQueueIn(BaseModel):
    merchant_id: str
    category_id: Optional[str] = None
    customer_name: Optional[str] = None


class UpdateMerchantStatusIn(BaseModel):
    status: MerchantStatus


class SettingsIn(BaseModel):
    app_logo_url: Optional[str] = None
    theme_key: Optional[str] = None
    app_name: Optional[str] = None
    app_headline: Optional[str] = None
    app_tagline: Optional[str] = None
    midtrans_server_key: Optional[str] = None
    midtrans_client_key: Optional[str] = None
    midtrans_is_production: Optional[bool] = None


class PackageIn(BaseModel):
    name: str
    description: Optional[str] = ""
    price_idr: int = Field(ge=0)
    quota_count: int = Field(ge=1)
    duration_days: int = Field(ge=1)
    active: bool = True
    target: Optional[str] = "customer"  # "customer" or "merchant"


class PaymentCreateIn(BaseModel):
    package_id: str


class UpdateSubIn(BaseModel):
    status: Optional[SubStatus] = None
    credits_remaining: Optional[int] = None
    package_id: Optional[str] = None  # admin can change plan


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------
def user_public(u: dict) -> dict:
    return {
        "id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"],
        "username": u.get("username", ""),
        "is_suspended": bool(u.get("is_suspended", False)),
        "phone": u.get("phone", ""),
        "avatar_url": u.get("avatar_url", ""),
        "created_at": iso(u.get("created_at")),
    }


def merchant_public(m: dict, owner_email: str = "", owner_username: str = "") -> dict:
    schedule = m.get("hours_schedule", [])
    is_open_flag = m.get("is_open", True)
    is_currently_open = is_open_flag and is_within_operating_hours(schedule)
    billing_plan = m.get("billing_plan")
    billing_expires_at = m.get("billing_expires_at")
    billing_active = bool(billing_plan and billing_expires_at and billing_expires_at > now_utc())
    return {
        "id": m.get("id", ""), "owner_id": m.get("owner_id", ""), "name": m.get("name", ""),
        "slug": m.get("slug", slugify(m.get("name", ""))),
        "owner_email": owner_email or m.get("owner_email", ""),
        "owner_username": owner_username or m.get("owner_username", ""),
        "description": m.get("description", ""), "address": m.get("address", ""),
        "logo_url": m.get("logo_url", ""), "photo_url": m.get("photo_url", ""),
        "tv_photo_url": m.get("tv_photo_url", ""),
        "tv_video_url": m.get("tv_video_url", ""),
        "hours_text": m.get("hours_text", ""),
        "hours_days": m.get("hours_days", []),
        "hours_open": m.get("hours_open", ""),
        "hours_close": m.get("hours_close", ""),
        "hours_schedule": schedule,
        "service_enabled": m.get("service_enabled", False),
        "is_open": is_open_flag,
        "is_currently_open": is_currently_open,
        "status": m.get("status", "pending"),
        "categories": m.get("categories", []),
        "created_at": iso(m.get("created_at")),
        "billing_plan": billing_plan,
        "billing_expires_at": iso(billing_expires_at),
        "billing_active": billing_active,
    }


def entry_public(e: dict) -> dict:
    return {
        "id": e["id"], "merchant_id": e["merchant_id"], "category_id": e["category_id"],
        "category_name": e.get("category_name", ""), "user_id": e.get("user_id"),
        "customer_name": e["customer_name"], "queue_number": e["queue_number"],
        "status": e["status"],
        "created_at": iso(e.get("created_at")),
        "called_at": iso(e.get("called_at")), "served_at": iso(e.get("served_at")),
    }


def package_public(p: dict) -> dict:
    return {
        "id": p["id"], "name": p["name"], "description": p.get("description", ""),
        "price_idr": p["price_idr"], "quota_count": p["quota_count"],
        "duration_days": p["duration_days"], "active": p.get("active", True),
        "target": p.get("target", "customer"),
        "created_at": iso(p.get("created_at")),
    }


def sub_public(s: dict) -> dict:
    return {
        "id": s["id"], "user_id": s["user_id"], "package_id": s["package_id"],
        "package_name": s.get("package_name", ""),
        "credits_remaining": s["credits_remaining"], "status": s["status"],
        "expires_at": iso(s.get("expires_at")),
        "created_at": iso(s.get("created_at")),
    }


def payment_public(p: dict) -> dict:
    return {
        "id": p["id"], "user_id": p["user_id"], "package_id": p["package_id"],
        "amount_idr": p["amount_idr"], "status": p["status"],
        "order_id": p["order_id"], "qr_string": p.get("qr_string", ""),
        "qr_image_url": p.get("qr_image_url", ""),
        "provider": p.get("provider", "mock"),
        "created_at": iso(p.get("created_at")),
        "paid_at": iso(p.get("paid_at")),
    }


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register", response_model=AuthOut)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    if body.role != "customer":
        raise HTTPException(status_code=400, detail="Pendaftaran publik hanya untuk Member. Merchant dibuat oleh admin.")
    # Generate unique username
    base_uname = (body.username or "").strip().lower() or email.split("@")[0]
    base_uname = re.sub(r'[^a-z0-9_]', '', base_uname) or "user"
    username = base_uname
    suffix = 1
    while await db.users.find_one({"username": username}):
        username = f"{base_uname}{suffix}"
        suffix += 1
    user = {
        "id": str(uuid.uuid4()), "email": email,
        "password_hash": hash_password(body.password), "name": body.name,
        "username": username,
        "role": "customer", "created_at": now_utc(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": user_public(user)}


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    identifier = body.email.strip()
    if "@" in identifier:
        user = await db.users.find_one({"email": identifier.lower()})
    else:
        user = await db.users.find_one({"username": identifier.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email/username atau password salah")
    if user.get("is_suspended"):
        raise HTTPException(status_code=403, detail="Akun Anda telah disuspend. Hubungi admin.")
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": user_public(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


@api.put("/users/me")
async def update_profile(body: UserUpdateIn, user: dict = Depends(get_current_user)):
    update: dict = {}
    if body.name is not None and body.name.strip():
        update["name"] = body.name.strip()
    if body.username is not None:
        new_uname = re.sub(r'[^a-z0-9_]', '', body.username.strip().lower())
        if new_uname:
            existing = await db.users.find_one({"username": new_uname, "id": {"$ne": user["id"]}})
            if existing:
                raise HTTPException(status_code=400, detail="Username sudah digunakan")
            update["username"] = new_uname
    if body.phone is not None:
        update["phone"] = body.phone.strip()
    if body.avatar_url is not None:
        update["avatar_url"] = body.avatar_url
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return user_public(u)


# ---------------------------------------------------------------------------
# Emergent Google OAuth (session_id exchange)
# ---------------------------------------------------------------------------
import httpx


@api.post("/auth/oauth/process", response_model=AuthOut)
async def oauth_process(body: OAuthProcessIn):
    """Exchange Emergent session_id for the user profile and issue our own JWT.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    async with httpx.AsyncClient(timeout=10) as http:
        resp = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = (data.get("email") or "").lower().strip()
    name = data.get("name") or email.split("@")[0]
    if not email:
        raise HTTPException(status_code=400, detail="Missing email in session data")

    user = await db.users.find_one({"email": email})
    if not user:
        user = {
            "id": str(uuid.uuid4()), "email": email,
            "password_hash": "",  # OAuth user — no password
            "name": name, "role": "customer", "created_at": now_utc(),
            "oauth_provider": "emergent_google",
            "picture": data.get("picture", ""),
        }
        await db.users.insert_one(user)
    else:
        # update picture/name if changed
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": data.get("picture", user.get("picture", "")),
                      "oauth_provider": "emergent_google"}},
        )
        user = await db.users.find_one({"email": email})

    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": user_public(user)}


# ---------------------------------------------------------------------------
# App settings (public read, admin write)
# ---------------------------------------------------------------------------
async def get_settings_doc() -> dict:
    s = await db.app_settings.find_one({"key": "app"})
    if not s:
        doc = {"key": "app", **DEFAULT_SETTINGS, "updated_at": now_utc()}
        await db.app_settings.insert_one(doc)
        s = doc
    return s


@api.get("/settings")
async def get_public_settings():
    s = await get_settings_doc()
    theme = THEMES.get(s.get("theme_key") or "slate_emerald", THEMES["slate_emerald"])
    return {
        "app_logo_url": s.get("app_logo_url", ""),
        "app_name": s.get("app_name", "QUELESS"),
        "app_headline": s.get("app_headline", DEFAULT_SETTINGS["app_headline"]),
        "app_tagline": s.get("app_tagline", DEFAULT_SETTINGS["app_tagline"]),
        "theme_key": theme["key"],
        "theme": theme,
        "available_themes": list(THEMES.values()),
        # Only the client key is exposed publicly. Server key stays server-side.
        "midtrans_client_key": s.get("midtrans_client_key", ""),
        "midtrans_is_production": bool(s.get("midtrans_is_production", False)),
        "midtrans_enabled": bool(s.get("midtrans_server_key")),
    }


@api.get("/admin/settings/full")
async def admin_get_full_settings(user: dict = Depends(require_role("admin"))):
    """Admin-only: includes server_key so admin can view/edit it."""
    s = await get_settings_doc()
    theme = THEMES.get(s.get("theme_key") or "slate_emerald", THEMES["slate_emerald"])
    return {
        "app_logo_url": s.get("app_logo_url", ""),
        "app_name": s.get("app_name", "QUELESS"),
        "app_headline": s.get("app_headline", DEFAULT_SETTINGS["app_headline"]),
        "app_tagline": s.get("app_tagline", DEFAULT_SETTINGS["app_tagline"]),
        "theme_key": theme["key"],
        "theme": theme,
        "available_themes": list(THEMES.values()),
        "midtrans_server_key": s.get("midtrans_server_key", ""),
        "midtrans_client_key": s.get("midtrans_client_key", ""),
        "midtrans_is_production": bool(s.get("midtrans_is_production", False)),
    }


@api.put("/admin/settings")
async def update_settings(body: SettingsIn, user: dict = Depends(require_role("admin"))):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if "theme_key" in update and update["theme_key"] not in THEMES:
        raise HTTPException(status_code=400, detail="Unknown theme key")
    update["updated_at"] = now_utc()
    await db.app_settings.update_one({"key": "app"}, {"$set": update}, upsert=True)
    return await get_public_settings()


# ---------------------------------------------------------------------------
# Merchant endpoints
# ---------------------------------------------------------------------------
@api.post("/merchants")
async def create_merchant(body: MerchantIn, user: dict = Depends(require_role("merchant", "admin"))):
    # 1 user merchant = 1 toko (admin boleh banyak untuk manajemen)
    if user["role"] == "merchant":
        existing = await db.merchants.find_one({"owner_id": user["id"]})
        if existing:
            raise HTTPException(status_code=400, detail="Anda sudah memiliki 1 toko. 1 akun merchant hanya dapat mendaftarkan 1 toko.")
    base_slug = slugify(body.name)
    slug = base_slug
    suffix = 1
    while await db.merchants.find_one({"slug": slug}):
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    m = {
        "id": str(uuid.uuid4()), "owner_id": user["id"],
        "name": body.name, "slug": slug,
        "description": body.description or "",
        "address": body.address or "", "logo_url": body.logo_url or "",
        "photo_url": body.photo_url or "", "tv_photo_url": body.tv_photo_url or "",
        "tv_video_url": body.tv_video_url or "",
        "hours_text": body.hours_text or "",
        "hours_days": body.hours_days or [],
        "hours_open": body.hours_open or "",
        "hours_close": body.hours_close or "",
        "hours_schedule": body.hours_schedule or [],
        "service_enabled": body.service_enabled if body.service_enabled is not None else False,
        "is_open": body.is_open if body.is_open is not None else True,
        "status": "approved" if user["role"] == "admin" else "pending",
        "categories": [], "created_at": now_utc(),
    }
    await db.merchants.insert_one(m)
    return merchant_public(m)


@api.get("/merchants")
async def list_merchants():
    now = now_utc()
    cursor = db.merchants.find({"status": "approved"}, {"_id": 0}).limit(200)
    out = []
    async for m in cursor:
        billing_plan = m.get("billing_plan")
        billing_expires_at = m.get("billing_expires_at")
        billing_active = bool(billing_plan and billing_expires_at and billing_expires_at > now)
        if not billing_active:
            continue
        data = merchant_public(m)
        data["active_queue_count"] = await db.queue_entries.count_documents(
            {"merchant_id": m.get("id", ""), "status": {"$in": ["waiting", "called"]}}
        )
        out.append(data)
    return out


@api.get("/merchants/mine")
async def my_merchants(user: dict = Depends(require_role("merchant", "admin"))):
    # Admin sees ALL merchants so they can edit any profile.
    query = {} if user["role"] == "admin" else {"owner_id": user["id"]}
    cursor = db.merchants.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    return [merchant_public(m) async for m in cursor]


@api.get("/merchants/{merchant_id}")
async def get_merchant(merchant_id: str):
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not m:
        m = await db.merchants.find_one({"slug": merchant_id}, {"_id": 0})
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
    update = body.dict(exclude_unset=False)
    # Preserve proper types: keep lists/bools as-is; only convert None strings to ""
    for k, v in list(update.items()):
        if v is None and k in ("name", "description", "address", "logo_url", "photo_url", "tv_photo_url", "hours_text", "hours_open", "hours_close"):
            update[k] = ""
        elif v is None and k in ("hours_days", "hours_schedule"):
            update[k] = []
        elif v is None and k in ("is_open", "service_enabled"):
            update[k] = True
    # Keep existing slug (never overwrite from update)
    update.pop("slug", None)
    await db.merchants.update_one({"id": merchant_id}, {"$set": update})
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    return merchant_public(m)


@api.post("/merchants/{merchant_id}/categories")
async def add_category(merchant_id: str, body: CategoryIn, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    cat = {"id": str(uuid.uuid4()), "name": body.name, "avg_service_minutes": body.avg_service_minutes}
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
# Subscription packages (admin CRUD)
# ---------------------------------------------------------------------------
@api.get("/packages")
async def public_packages():
    cursor = db.packages.find({"active": True, "target": {"$ne": "merchant"}}, {"_id": 0}).sort("price_idr", 1).limit(50)
    return [package_public(p) async for p in cursor]


@api.get("/admin/packages")
async def admin_list_packages(user: dict = Depends(require_role("admin"))):
    cursor = db.packages.find({}, {"_id": 0}).sort("created_at", -1).limit(200)
    return [package_public(p) async for p in cursor]


@api.post("/admin/packages")
async def admin_create_package(body: PackageIn, user: dict = Depends(require_role("admin"))):
    p = {
        "id": str(uuid.uuid4()), "name": body.name, "description": body.description or "",
        "price_idr": body.price_idr, "quota_count": body.quota_count,
        "duration_days": body.duration_days, "active": body.active,
        "target": body.target or "customer",
        "created_at": now_utc(),
    }
    await db.packages.insert_one(p)
    return package_public(p)


@api.put("/admin/packages/{package_id}")
async def admin_update_package(package_id: str, body: PackageIn, user: dict = Depends(require_role("admin"))):
    res = await db.packages.update_one({"id": package_id}, {"$set": body.dict()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    p = await db.packages.find_one({"id": package_id}, {"_id": 0})
    return package_public(p)


@api.delete("/admin/packages/{package_id}")
async def admin_delete_package(package_id: str, user: dict = Depends(require_role("admin"))):
    await db.packages.delete_one({"id": package_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------
async def active_subscription(user_id: str) -> Optional[dict]:
    now = now_utc()
    sub = await db.subscriptions.find_one(
        {"user_id": user_id, "status": "active", "credits_remaining": {"$gt": 0},
         "expires_at": {"$gt": now}},
        {"_id": 0}, sort=[("expires_at", -1)],
    )
    return sub


@api.get("/subscriptions/mine")
async def my_subscriptions(user: dict = Depends(get_current_user)):
    cursor = db.subscriptions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    subs = [sub_public(s) async for s in cursor]
    active = await active_subscription(user["id"])
    # Per-transaction payment history (each topup preserved)
    pay_cursor = db.payments.find(
        {"user_id": user["id"], "status": "paid"}, {"_id": 0}
    ).sort("paid_at", -1).limit(100)
    payments = []
    async for p in pay_cursor:
        pkg = await db.packages.find_one({"id": p["package_id"]}, {"_id": 0})
        payments.append({
            **payment_public(p),
            "package_name": pkg["name"] if pkg else "Paket",
            "quota_added": pkg["quota_count"] if pkg else 0,
            "duration_days": pkg["duration_days"] if pkg else 0,
        })
    return {"subscriptions": subs, "active": sub_public(active) if active else None, "payments": payments}


@api.get("/admin/subscriptions")
async def admin_subscriptions(user: dict = Depends(require_role("admin"))):
    cursor = db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).limit(500)
    out = []
    async for s in cursor:
        u = await db.users.find_one({"id": s["user_id"]}, {"_id": 0, "password_hash": 0})
        d = sub_public(s)
        d["user"] = user_public(u) if u else None
        out.append(d)
    return out


@api.put("/admin/subscriptions/{sub_id}")
async def admin_update_subscription(sub_id: str, body: UpdateSubIn, user: dict = Depends(require_role("admin"))):
    update = {}
    if body.status is not None:
        update["status"] = body.status
    if body.credits_remaining is not None:
        update["credits_remaining"] = body.credits_remaining
    if body.package_id is not None:
        pkg = await db.packages.find_one({"id": body.package_id}, {"_id": 0})
        if not pkg:
            raise HTTPException(status_code=404, detail="Package not found")
        update["package_id"] = pkg["id"]
        update["package_name"] = pkg["name"]
        update["credits_remaining"] = pkg["quota_count"]
        update["expires_at"] = now_utc() + timedelta(days=pkg["duration_days"])
        update["status"] = "active"
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    res = await db.subscriptions.update_one({"id": sub_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    s = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return sub_public(s)


@api.delete("/admin/subscriptions/{sub_id}")
async def admin_delete_subscription(sub_id: str, user: dict = Depends(require_role("admin"))):
    res = await db.subscriptions.delete_one({"id": sub_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Payments (Midtrans QRIS when configured, else MOCK)
# ---------------------------------------------------------------------------
import base64 as _b64
import hashlib as _hashlib


def _midtrans_base_url(is_production: bool) -> str:
    return "https://api.midtrans.com" if is_production else "https://api.sandbox.midtrans.com"


async def _midtrans_charge_qris(server_key: str, is_production: bool, order_id: str, amount: int) -> dict:
    auth = _b64.b64encode(f"{server_key}:".encode()).decode()
    body = {
        "payment_type": "qris",
        "transaction_details": {"order_id": order_id, "gross_amount": amount},
        "qris": {"acquirer": "gopay"},
    }
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.post(
            f"{_midtrans_base_url(is_production)}/v2/charge",
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json", "Accept": "application/json"},
            json=body,
        )
    data = r.json() if r.content else {}
    if r.status_code >= 300:
        raise HTTPException(status_code=502, detail=f"Midtrans error: {data.get('status_message') or r.text}")
    return data


async def _midtrans_status(server_key: str, is_production: bool, order_id: str) -> dict:
    auth = _b64.b64encode(f"{server_key}:".encode()).decode()
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            f"{_midtrans_base_url(is_production)}/v2/{order_id}/status",
            headers={"Authorization": f"Basic {auth}", "Accept": "application/json"},
        )
    return r.json() if r.content else {}


async def _activate_subscription_for_payment(p: dict):
    """Idempotent: create OR accumulate subscription when payment becomes 'paid'."""
    if p["status"] != "paid":
        return
    # guard against double-activation
    existing_sub_link = await db.subscriptions.find_one({"payment_id": p["id"]})
    if existing_sub_link:
        return
    pkg = await db.packages.find_one({"id": p["package_id"]})
    if not pkg:
        return
    # Accumulative quota (Option 2): if user has an active non-expired subscription,
    # extend it by adding credits and appending the new duration on top of existing expires_at
    existing_active = await db.subscriptions.find_one({
        "user_id": p["user_id"],
        "status": "active",
        "expires_at": {"$gt": now_utc()},
    })
    if existing_active:
        new_credits = int(existing_active.get("credits_remaining", 0)) + int(pkg["quota_count"])
        current_expiry = existing_active["expires_at"]
        new_expires = current_expiry + timedelta(days=int(pkg["duration_days"]))
        await db.subscriptions.update_one(
            {"id": existing_active["id"]},
            {"$set": {
                "credits_remaining": new_credits,
                "expires_at": new_expires,
                "package_id": pkg["id"],
                "package_name": pkg["name"],
                "last_topup_payment_id": p["id"],
                "last_topup_at": now_utc(),
            }},
        )
        return
    # No active sub → create fresh
    expires_at = now_utc() + timedelta(days=int(pkg["duration_days"]))
    sub = {
        "id": str(uuid.uuid4()), "user_id": p["user_id"],
        "package_id": pkg["id"], "package_name": pkg["name"],
        "credits_remaining": int(pkg["quota_count"]),
        "status": "active", "expires_at": expires_at, "created_at": now_utc(),
        "payment_id": p["id"],
    }
    await db.subscriptions.insert_one(sub)


@api.post("/payments/create")
async def payments_create(body: PaymentCreateIn, user: dict = Depends(get_current_user)):
    pkg = await db.packages.find_one({"id": body.package_id, "active": True}, {"_id": 0})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    # Free package: only allowed once per user (first registration)
    if int(pkg.get("price_idr", 0)) == 0:
        prior_free = await db.payments.find_one({
            "user_id": user["id"],
            "amount_idr": 0,
            "status": "paid",
        })
        if prior_free:
            raise HTTPException(status_code=400, detail="Paket gratis hanya berlaku sekali pada pendaftaran awal. Silakan pilih paket berbayar.")

    s = await get_settings_doc()
    server_key = s.get("midtrans_server_key", "")
    is_production = bool(s.get("midtrans_is_production", False))

    order_id = f"ORD-{uuid.uuid4().hex[:12].upper()}"
    payment = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "package_id": pkg["id"],
        "amount_idr": pkg["price_idr"],
        "order_id": order_id, "created_at": now_utc(), "paid_at": None,
        "provider": "midtrans" if server_key else "mock",
        "is_production": is_production if server_key else False,
    }

    # Free packages → auto-paid (no Midtrans call)
    if pkg["price_idr"] == 0:
        payment["status"] = "paid"
        payment["paid_at"] = now_utc()
        payment["qr_string"] = ""
        payment["qr_image_url"] = ""
        await db.payments.insert_one(payment)
        await _activate_subscription_for_payment(payment)
        return payment_public(payment)

    if server_key:
        # Real Midtrans QRIS
        mt = await _midtrans_charge_qris(server_key, is_production, order_id, pkg["price_idr"])
        qr_image_url = ""
        for a in (mt.get("actions") or []):
            if a.get("name") == "generate-qr-code":
                qr_image_url = a.get("url", "")
                break
        payment["status"] = "pending"
        payment["qr_string"] = mt.get("qr_string", "")
        payment["qr_image_url"] = qr_image_url
        payment["midtrans_transaction_id"] = mt.get("transaction_id", "")
    else:
        # Mock
        payment["status"] = "pending"
        payment["qr_string"] = f"mock-qris://{order_id}?amount={pkg['price_idr']}"
        payment["qr_image_url"] = ""

    await db.payments.insert_one(payment)
    return payment_public(payment)


@api.get("/payments/{payment_id}")
async def payments_get(payment_id: str, user: dict = Depends(get_current_user)):
    p = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    if user["role"] != "admin" and p["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return payment_public(p)


@api.post("/payments/{payment_id}/check")
async def payments_check(payment_id: str, user: dict = Depends(get_current_user)):
    """Poll Midtrans for latest status. No-op if using mock provider."""
    p = await db.payments.find_one({"id": payment_id})
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    if p["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    if p.get("provider") != "midtrans" or p["status"] == "paid":
        return payment_public({**p, "_id": None})

    s = await get_settings_doc()
    server_key = s.get("midtrans_server_key", "")
    if not server_key:
        return payment_public({**p, "_id": None})

    data = await _midtrans_status(server_key, bool(s.get("midtrans_is_production", False)), p["order_id"])
    ts = (data.get("transaction_status") or "").lower()
    frs = (data.get("fraud_status") or "").lower()

    new_status = p["status"]
    if ts in ("settlement", "capture") and frs in ("", "accept"):
        new_status = "paid"
    elif ts in ("cancel", "deny", "expire", "failure"):
        new_status = "failed" if ts in ("deny", "failure", "cancel") else "expired"

    if new_status != p["status"]:
        upd = {"status": new_status}
        if new_status == "paid":
            upd["paid_at"] = now_utc()
        await db.payments.update_one({"id": payment_id}, {"$set": upd})
        p = await db.payments.find_one({"id": payment_id})
        await _activate_subscription_for_payment(p)
    return payment_public(p)


@api.post("/payments/{payment_id}/confirm")
async def payments_confirm(payment_id: str, user: dict = Depends(get_current_user)):
    """Mock-only simulator. Blocked when Midtrans is configured to prevent bypass."""
    p = await db.payments.find_one({"id": payment_id})
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    if p["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if p["status"] == "paid":
        return payment_public(p)
    if p.get("provider") == "midtrans":
        raise HTTPException(status_code=400, detail="Midtrans active: complete real payment via QRIS")
    await db.payments.update_one({"id": payment_id}, {"$set": {"status": "paid", "paid_at": now_utc()}})
    p = await db.payments.find_one({"id": payment_id})
    await _activate_subscription_for_payment(p)
    return payment_public(p)


@api.post("/payments/midtrans/notify")
async def midtrans_notify(payload: dict):
    """Midtrans webhook callback — verifies signature then updates payment."""
    s = await get_settings_doc()
    server_key = s.get("midtrans_server_key", "")
    if not server_key:
        raise HTTPException(status_code=400, detail="Midtrans not configured")

    order_id = payload.get("order_id", "")
    status_code = str(payload.get("status_code", ""))
    gross_amount = str(payload.get("gross_amount", ""))
    signature = payload.get("signature_key", "")
    expected = _hashlib.sha512(f"{order_id}{status_code}{gross_amount}{server_key}".encode()).hexdigest()
    if signature != expected:
        raise HTTPException(status_code=401, detail="Invalid signature")

    p = await db.payments.find_one({"order_id": order_id})
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")

    ts = (payload.get("transaction_status") or "").lower()
    frs = (payload.get("fraud_status") or "").lower()
    new_status = p["status"]
    if ts in ("settlement", "capture") and frs in ("", "accept"):
        new_status = "paid"
    elif ts == "pending":
        new_status = "pending"
    elif ts in ("cancel", "deny", "expire", "failure"):
        new_status = "failed" if ts in ("deny", "failure", "cancel") else "expired"

    upd = {"status": new_status}
    if new_status == "paid":
        upd["paid_at"] = now_utc()
    await db.payments.update_one({"order_id": order_id}, {"$set": upd})
    p = await db.payments.find_one({"order_id": order_id})
    await _activate_subscription_for_payment(p)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Queue endpoints
# ---------------------------------------------------------------------------
async def next_queue_number(merchant_id: str) -> int:
    today = now_utc().strftime("%Y-%m-%d")
    key = f"{merchant_id}:{today}"
    await db.queue_counters.find_one_and_update(
        {"key": key},
        {"$inc": {"seq": 1}, "$setOnInsert": {"key": key, "created_at": now_utc()}},
        upsert=True,
    )
    doc = await db.queue_counters.find_one({"key": key})
    return doc["seq"]


@api.post("/queue/join")
async def join_queue(body: JoinQueueIn, user: Optional[dict] = Depends(optional_user)):
    m = await db.merchants.find_one({"id": body.merchant_id})
    if not m or m.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Merchant unavailable")
    if not m.get("is_open", True):
        raise HTTPException(status_code=400, detail="Merchant is currently closed")

    # Duplicate queue guard: 1 customer hanya boleh punya 1 antrian aktif di 1 merchant
    if user:
        existing = await db.queue_entries.find_one({
            "merchant_id": body.merchant_id,
            "user_id": user["id"],
            "status": {"$in": ["waiting", "called"]},
        })
        if existing:
            raise HTTPException(status_code=400, detail="Anda masih punya antrian aktif di merchant ini (#" + str(existing.get("queue_number", "")) + "). Tunggu sampai selesai.")

    # Services are fully optional — not shown in UI. category_id selalu kosong.
    cat = None

    # Subscription enforcement: if packages exist AND user is authenticated customer,
    # require active subscription with remaining credits.
    active_sub = None
    if user and user["role"] == "customer":
        has_packages = (await db.packages.count_documents({"active": True})) > 0
        if has_packages:
            active_sub = await active_subscription(user["id"])
            if not active_sub:
                # Give specific reason so user knows what to do
                any_sub = await db.subscriptions.find_one(
                    {"user_id": user["id"]}, sort=[("expires_at", -1)]
                )
                if any_sub and any_sub.get("credits_remaining", 0) <= 0:
                    raise HTTPException(status_code=402, detail="Kuota antrian Anda habis. Silakan beli paket untuk melanjutkan.")
                if any_sub and any_sub.get("expires_at") and any_sub["expires_at"] < now_utc():
                    raise HTTPException(status_code=402, detail="Paket Anda sudah kadaluarsa. Silakan beli paket baru di menu Pengaturan.")
                raise HTTPException(status_code=402, detail="Diperlukan paket aktif untuk mengambil antrian. Beli paket di menu Pengaturan → Beli Paket.")

    customer_name = (body.customer_name or (user["name"] if user else None) or "Guest").strip()
    number = await next_queue_number(body.merchant_id)
    entry = {
        "id": str(uuid.uuid4()), "merchant_id": body.merchant_id,
        "category_id": cat["id"] if cat else "",
        "category_name": cat["name"] if cat else "Umum",
        "user_id": user["id"] if user else None, "customer_name": customer_name,
        "queue_number": number, "status": "waiting", "created_at": now_utc(),
        "called_at": None, "served_at": None,
    }
    await db.queue_entries.insert_one(entry)

    # Deduct credit after successful insert
    if active_sub:
        await db.subscriptions.update_one(
            {"id": active_sub["id"]}, {"$inc": {"credits_remaining": -1}},
        )
    return entry_public(entry)


@api.get("/queue/{entry_id}")
async def get_queue_entry(entry_id: str):
    e = await db.queue_entries.find_one({"id": entry_id}, {"_id": 0})
    if not e:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    ahead = await db.queue_entries.count_documents({
        "merchant_id": e["merchant_id"], "category_id": e["category_id"],
        "status": "waiting", "queue_number": {"$lt": e["queue_number"]},
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
    ).sort("created_at", -1).limit(50)
    entries = []
    async for e in cursor:
        ahead = await db.queue_entries.count_documents({
            "merchant_id": e["merchant_id"], "category_id": e["category_id"],
            "status": "waiting", "queue_number": {"$lt": e["queue_number"]},
        })
        m = await db.merchants.find_one({"id": e["merchant_id"]}, {"_id": 0})
        cat = next((c for c in (m.get("categories", []) if m else []) if c["id"] == e["category_id"]), None)
        avg = cat["avg_service_minutes"] if cat else 5
        d = entry_public(e)
        d["position"] = ahead
        d["estimated_wait_minutes"] = ahead * avg
        d["merchant_name"] = m["name"] if m else ""
        d["merchant_logo"] = m.get("logo_url", "") if m else ""
        entries.append(d)
    return entries


@api.get("/merchants/{merchant_id}/queue")
async def merchant_queue(merchant_id: str, user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    cursor = db.queue_entries.find({"merchant_id": merchant_id}, {"_id": 0}).sort("queue_number", 1).limit(500)
    return [entry_public(e) async for e in cursor]


@api.post("/merchants/{merchant_id}/queue/next")
async def call_next(merchant_id: str, category_id: Optional[str] = None,
                    user: dict = Depends(get_current_user)):
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.queue_entries.update_many(
        {"merchant_id": merchant_id, "status": "called", **({"category_id": category_id} if category_id else {})},
        {"$set": {"status": "served", "served_at": now_utc()}},
    )
    q = {"merchant_id": merchant_id, "status": "waiting"}
    if category_id:
        q["category_id"] = category_id
    nxt = await db.queue_entries.find_one_and_update(
        q, {"$set": {"status": "called", "called_at": now_utc()}},
        sort=[("queue_number", 1)],
    )
    if not nxt:
        return {"entry": None}
    entry = await db.queue_entries.find_one(
        {"merchant_id": merchant_id, "status": "called"},
        {"_id": 0}, sort=[("called_at", -1)],
    )
    return {"entry": entry_public(entry) if entry else None}


@api.post("/merchants/{merchant_id}/queue/call-prev")
async def call_prev(merchant_id: str, user: dict = Depends(get_current_user)):
    """Re-call the most recent called/served entry (for 'Panggil sebelumnya' button)."""
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if user["role"] != "admin" and m["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Find most recent called or served entry
    e = await db.queue_entries.find_one(
        {"merchant_id": merchant_id, "status": {"$in": ["called", "served"]}},
        sort=[("called_at", -1)],
    )
    if not e:
        raise HTTPException(status_code=404, detail="Tidak ada antrian sebelumnya untuk dipanggil")
    # If currently called entry exists, demote it first to 'served' so only one 'called' at a time
    await db.queue_entries.update_many(
        {"merchant_id": merchant_id, "status": "called", "id": {"$ne": e["id"]}},
        {"$set": {"status": "served", "served_at": now_utc()}},
    )
    await db.queue_entries.update_one(
        {"id": e["id"]}, {"$set": {"status": "called", "called_at": now_utc()}}
    )
    entry = await db.queue_entries.find_one({"id": e["id"]}, {"_id": 0})
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


async def _tv_display_data(m: dict) -> dict:
    merchant_id = m["id"]
    now_serving = await db.queue_entries.find_one(
        {"merchant_id": merchant_id, "status": "called"},
        {"_id": 0}, sort=[("called_at", -1)],
    )
    cursor = db.queue_entries.find(
        {"merchant_id": merchant_id, "status": "waiting"}, {"_id": 0}
    ).sort("queue_number", 1).limit(6)
    upcoming = [entry_public(e) async for e in cursor]
    recent_served = await db.queue_entries.find(
        {"merchant_id": merchant_id, "status": "served"}, {"_id": 0},
    ).sort("served_at", -1).limit(3).to_list(3)
    return {
        "merchant": merchant_public(m),
        "now_serving": entry_public(now_serving) if now_serving else None,
        "upcoming": upcoming,
        "recent_served": [entry_public(e) for e in recent_served],
    }


@api.get("/merchants/{merchant_id}/queue/tv")
async def tv_display(merchant_id: str):
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return await _tv_display_data(m)


@api.get("/tv/{slug}")
async def tv_display_by_slug(slug: str):
    m = await db.merchants.find_one({"slug": slug}, {"_id": 0})
    if not m:
        # Fallback: try by id for existing merchants without slug
        m = await db.merchants.find_one({"id": slug}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return await _tv_display_data(m)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    cursor = db.users.find({}, {"_id": 0, "password_hash": 0}).limit(1000)
    return [user_public(u) async for u in cursor]

@api.put("/admin/users/{user_id}/suspend")
async def suspend_user(user_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_suspended": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User tidak ditemukan")
    return {"message": "User berhasil disuspend"}


@api.put("/admin/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_suspended": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User tidak ditemukan")
    return {"message": "User berhasil diaktifkan"}


@api.put("/admin/users/{user_id}/password")
async def admin_change_user_password(
    user_id: str, body: dict, user: dict = Depends(require_role("admin"))
):
    new_password = body.get("new_password", "")
    if len(new_password) < 6:
        raise HTTPException(400, "Password minimal 6 karakter")
    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": hashed}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User tidak ditemukan")
    return {"message": "Password berhasil diubah"}


@api.get("/admin/merchants")
async def admin_merchants(user: dict = Depends(require_role("admin"))):
    cursor = db.merchants.find({}, {"_id": 0}).limit(500)
    out = []
    async for m in cursor:
        try:
            owner = await db.users.find_one({"id": m.get("owner_id")}, {"_id": 0, "password_hash": 0})
            owner_email = owner["email"] if owner else ""
            owner_username = owner.get("username", "") if owner else ""
            out.append(merchant_public(m, owner_email=owner_email, owner_username=owner_username))
        except Exception:
            pass
    return out


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
    today_start = datetime.combine(now_utc().date(), datetime.min.time()).replace(tzinfo=timezone.utc)
    return {
        "users": await db.users.count_documents({}),
        "merchants": await db.merchants.count_documents({}),
        "pending_merchants": await db.merchants.count_documents({"status": "pending"}),
        "approved_merchants": await db.merchants.count_documents({"status": "approved"}),
        "total_queues_today": await db.queue_entries.count_documents({"created_at": {"$gte": today_start}}),
        "revenue_idr_today": sum([
            p["amount_idr"] async for p in db.payments.find(
                {"status": "paid", "paid_at": {"$gte": today_start}}, {"_id": 0, "amount_idr": 1})
        ]),
    }


@api.get("/admin/queue-stats")
async def admin_queue_stats(user: dict = Depends(require_role("admin"))):
    """Per-merchant queue counts (today)."""
    today_start = datetime.combine(now_utc().date(), datetime.min.time()).replace(tzinfo=timezone.utc)
    cursor = db.merchants.find({}, {"_id": 0}).limit(500)
    out = []
    async for m in cursor:
        mid = m["id"]
        waiting = await db.queue_entries.count_documents({"merchant_id": mid, "status": "waiting"})
        called = await db.queue_entries.count_documents({"merchant_id": mid, "status": "called"})
        served_today = await db.queue_entries.count_documents({
            "merchant_id": mid, "status": "served", "served_at": {"$gte": today_start},
        })
        out.append({
            "merchant_id": mid, "name": m["name"], "logo_url": m.get("logo_url", ""),
            "status": m.get("status"),
            "waiting": waiting, "called": called, "served_today": served_today,
            "total_today": waiting + called + served_today,
        })
    return out


@api.post("/admin/merchants/create")
async def admin_create_merchant(body: dict, admin: dict = Depends(require_role("admin"))):
    """Admin creates a merchant account + initial merchant profile in one step.
    Body fields:
      - name (str, required) - merchant name
      - email (str, required) - merchant login email
      - password (str, required) - initial password
      - phone (str, optional) - admin-only note
      - business_type (str, optional) - stored as description
    Returns created user + merchant.
    """
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").lower().strip()
    password = body.get("password") or ""
    phone = (body.get("phone") or "").strip()
    business_type = (body.get("business_type") or "").strip()
    username_input = (body.get("username") or "").strip().lower()
    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Nama, email, dan password wajib diisi")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    # Generate unique username from input or merchant name
    base_uname = re.sub(r'[^a-z0-9_]', '', username_input or name.lower().replace(' ', '_')) or "merchant"
    username = base_uname
    suffix = 1
    while await db.users.find_one({"username": username}):
        username = f"{base_uname}{suffix}"
        suffix += 1

    user_doc = {
        "id": str(uuid.uuid4()), "email": email,
        "password_hash": hash_password(password), "name": name,
        "username": username,
        "role": "merchant", "created_at": now_utc(),
        "phone": phone,
    }
    await db.users.insert_one(user_doc)

    base_slug = slugify(name)
    slug = base_slug
    suffix = 1
    while await db.merchants.find_one({"slug": slug}):
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    merchant_doc = {
        "id": str(uuid.uuid4()), "owner_id": user_doc["id"],
        "name": name, "slug": slug, "description": business_type,
        "address": "", "logo_url": "",
        "photo_url": "", "tv_photo_url": "", "tv_video_url": "",
        "hours_text": "", "hours_days": [], "hours_open": "", "hours_close": "",
        "hours_schedule": [],
        "service_enabled": False, "is_open": True,
        "status": "approved",  # admin-created are auto-approved
        "categories": [], "created_at": now_utc(),
    }
    await db.merchants.insert_one(merchant_doc)
    return {"user": user_public(user_doc), "merchant": merchant_public(merchant_doc, owner_email=email)}


@api.delete("/admin/merchants/{merchant_id}")
async def admin_delete_merchant(merchant_id: str, admin: dict = Depends(require_role("admin"))):
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Merchant tidak ditemukan")
    # Cascade: delete queue entries for this merchant, and the merchant doc itself
    await db.queue_entries.delete_many({"merchant_id": merchant_id})
    await db.merchants.delete_one({"id": merchant_id})
    # Optionally also remove the owner user account if role merchant and no other merchants owned
    owner_id = m.get("owner_id")
    if owner_id:
        others = await db.merchants.count_documents({"owner_id": owner_id})
        if others == 0:
            await db.users.delete_one({"id": owner_id, "role": "merchant"})
    return {"ok": True}


@api.post("/admin/merchants/{merchant_id}/billing")
async def set_merchant_billing(merchant_id: str, body: dict, admin: dict = Depends(require_role("admin"))):
    """Set billing for a merchant using an existing merchant-targeted package."""
    package_id = body.get("package_id")
    if not package_id:
        raise HTTPException(400, "package_id required")
    m = await db.merchants.find_one({"id": merchant_id})
    if not m:
        raise HTTPException(404, "Merchant not found")
    pkg = await db.packages.find_one({"id": package_id})
    if not pkg:
        raise HTTPException(404, "Package not found")
    expires = now_utc() + timedelta(days=pkg["duration_days"])
    await db.merchants.update_one({"id": merchant_id}, {"$set": {
        "billing_plan": pkg["name"],
        "billing_expires_at": expires,
    }})
    m = await db.merchants.find_one({"id": merchant_id}, {"_id": 0})
    return merchant_public(m)


@api.delete("/admin/merchants/{merchant_id}/billing")
async def remove_merchant_billing(merchant_id: str, admin: dict = Depends(require_role("admin"))):
    await db.merchants.update_one({"id": merchant_id}, {"$unset": {
        "billing_plan": "", "billing_expires_at": ""
    }})
    return {"ok": True}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_role("admin"))):
    """Delete a user and all their owned merchants, subscriptions, payments, queue entries."""
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin account")
    # collect owned merchants
    owned = [m["id"] async for m in db.merchants.find({"owner_id": user_id}, {"_id": 0, "id": 1})]
    if owned:
        await db.queue_entries.delete_many({"merchant_id": {"$in": owned}})
        await db.merchants.delete_many({"owner_id": user_id})
    await db.queue_entries.delete_many({"user_id": user_id})
    await db.subscriptions.delete_many({"user_id": user_id})
    await db.payments.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"ok": True, "removed_merchants": len(owned)}


@api.post("/admin/cleanup-orphans")
async def admin_cleanup_orphans(admin: dict = Depends(require_role("admin"))):
    """Remove data that reference deleted users/merchants/packages."""
    user_ids = {u["id"] async for u in db.users.find({}, {"_id": 0, "id": 1})}
    merchant_ids = {m["id"] async for m in db.merchants.find({}, {"_id": 0, "id": 1})}
    package_ids = {p["id"] async for p in db.packages.find({}, {"_id": 0, "id": 1})}

    r1 = await db.merchants.delete_many({"owner_id": {"$nin": list(user_ids)}})
    r2 = await db.queue_entries.delete_many({"merchant_id": {"$nin": list(merchant_ids)}})
    r3 = await db.subscriptions.delete_many({
        "$or": [
            {"user_id": {"$nin": list(user_ids)}},
            {"package_id": {"$nin": list(package_ids)}},
        ]
    })
    r4 = await db.payments.delete_many({
        "$or": [
            {"user_id": {"$nin": list(user_ids)}},
            {"package_id": {"$nin": list(package_ids)}},
        ]
    })
    return {
        "orphan_merchants": r1.deleted_count,
        "orphan_queue_entries": r2.deleted_count,
        "orphan_subscriptions": r3.deleted_count,
        "orphan_payments": r4.deleted_count,
    }


@api.post("/admin/factory-reset")
async def factory_reset(admin: dict = Depends(require_role("admin"))):
    """Delete all non-admin users and all related data, preserving admin accounts."""
    await db.users.delete_many({"role": {"$ne": "admin"}})
    await db.merchants.delete_many({})
    await db.queue_entries.delete_many({})
    await db.queue_counters.delete_many({})
    await db.subscriptions.delete_many({})
    await db.payments.delete_many({})
    return {"ok": True, "message": "Data berhasil direset. Akun admin dipertahankan."}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"message": "Queue Management System API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.merchants.create_index("id", unique=True)
    await db.merchants.create_index("owner_id")
    await db.queue_entries.create_index("id", unique=True)
    await db.queue_entries.create_index([("merchant_id", 1), ("status", 1), ("queue_number", 1)])
    await db.queue_counters.create_index("key", unique=True)
    await db.packages.create_index("id", unique=True)
    await db.subscriptions.create_index("id", unique=True)
    await db.subscriptions.create_index("user_id")
    await db.payments.create_index("id", unique=True)
    await db.payments.create_index("order_id", unique=True)
    await db.app_settings.create_index("key", unique=True)
    try:
        await db.users.create_index("username", unique=True, sparse=True)
    except Exception:
        pass

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@queue.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password), "name": "System Admin",
            "role": "admin", "created_at": now_utc(),
        })
        logger.info("Seeded admin: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )

    # Seed app settings
    await get_settings_doc()

    # Seed default packages if none exist
    if await db.packages.count_documents({}) == 0:
        defaults = [
            {"name": "Free", "description": "Coba gratis — 3 antrian dalam 7 hari",
             "price_idr": 0, "quota_count": 3, "duration_days": 7, "active": True},
            {"name": "Basic", "description": "10 antrian dalam 30 hari",
             "price_idr": 15000, "quota_count": 10, "duration_days": 30, "active": True},
            {"name": "Premium", "description": "50 antrian dalam 30 hari",
             "price_idr": 49000, "quota_count": 50, "duration_days": 30, "active": True},
        ]
        for d in defaults:
            d["id"] = str(uuid.uuid4())
            d["created_at"] = now_utc()
            await db.packages.insert_one(d)
        logger.info("Seeded default subscription packages")
        asyncio.create_task(expire_queues_task())
async def expire_queues_task():
    """Background task: expire antrian setiap 5 menit"""
    while True:
        try:
            now = datetime.utcnow()
            cutoff_24h = now - timedelta(hours=24)
            # Expire antrian yang sudah 24 jam
            await db.queue_entries.update_many(
                {
                    "status": {"$in": ["waiting", "called"]},
                    "created_at": {"$lt": cutoff_24h}
                },
                {"$set": {"status": "expired", "expired_at": now}}
            )
            # Expire antrian dari merchant yang tutup
            closed_merchants = await db.merchants.find(
                {"is_open": False}
            ).to_list(None)
            for merchant in closed_merchants:
                await db.queue_entries.update_many(
                    {
                        "merchant_id": merchant["id"],
                        "status": {"$in": ["waiting", "called"]}
                    },
                    {"$set": {"status": "expired", "expired_at": now}}
                )
        except Exception as e:
            logger.error(f"Error expire task: {e}")
        await asyncio.sleep(300)  # cek setiap 5 menit
@app.on_event("shutdown")
async def shutdown():
    client.close()
