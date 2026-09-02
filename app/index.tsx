import { Redirect, usePathname, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function IndexScreen() {
  const { operator } = useAuth();
  const { colors: c } = useTheme();
  const pathname = usePathname();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  useEffect(() => {
    console.info('EDEUR_UAT_RUNTIME_MARKER', 'scenario6-router-probe-6f068769');
    console.info('ROUTER_BOOT_PATH', JSON.stringify({ pathname, segments, rootNavigationReady: Boolean(navigationState?.key), operator: operator === undefined ? 'undefined' : operator ? 'authenticated' : 'signed-out' }));
  }, [navigationState?.key, operator, pathname, segments]);
  useEffect(() => {
    if (operator === undefined) return;
    console.info('AUTH_REDIRECT_TARGET', JSON.stringify({ target: operator ? '/home' : '/login' }));
  }, [operator]);
  if (operator === undefined) return <View style={[styles.container, { backgroundColor: c.background }]}><ActivityIndicator size="large" color={c.blue600} /></View>;
  if (!operator) return <Redirect href="/login" />;
  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
