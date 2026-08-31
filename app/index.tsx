import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function IndexScreen() {
  const { operator } = useAuth();
  const { colors: c } = useTheme();
  if (operator === undefined) return <View style={[styles.container, { backgroundColor: c.background }]}><ActivityIndicator size="large" color={c.blue600} /></View>;
  if (!operator) return <Redirect href="/login" />;
  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
