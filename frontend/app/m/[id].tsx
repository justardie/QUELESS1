import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

export default function MerchantShortLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <View />;
  return <Redirect href={{ pathname: '/customer/merchant/[id]', params: { id } }} />;
}
