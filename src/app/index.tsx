import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { user } = useAuth();
  if (user?.role === 'patient') return <Redirect href="/patient" />;
  if (user?.role === 'doctor') return <Redirect href="/doctor" />;
  return <Redirect href="/sign-in" />;
}
