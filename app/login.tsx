import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { PinPad } from '@/components/PinPad';
import { spacing, radius } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, mode, configurationError } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (configurationError) { setError(configurationError); return; }
    if (mode === 'DEMO' && !pin.trim()) { setError('Please enter your PIN.'); return; }
    if (mode === 'UAT' && (!identifier.trim() || !password)) { setError('Enter your username/email and password.'); return; }
    setLoading(true);
    const success = await login(mode === 'UAT' ? identifier.trim() : pin.trim(), mode === 'UAT' ? password : undefined);
    if (!success) { setError(mode === 'UAT' ? 'Canonical sign-in failed. Verify credentials and UAT configuration.' : 'Invalid PIN. Please try again.'); setPin(''); setPassword(''); setLoading(false); return; }
    setLoading(false); router.replace('/(tabs)/home');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 60), paddingBottom: Math.max(insets.bottom, 40) }]} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/psc-equipment-logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
              accessible
              accessibilityLabel="PSC Equipment Department logo"
            />
            <Text style={[styles.subtitle, { color: c.textMuted }]}>Operator Field Application</Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: c.textPrimary }]}>{mode === 'UAT' ? 'Canonical Operator Access' : 'Demo Operator Access'}</Text>
            {mode === 'UAT' ? <>
              <TextInput accessibilityLabel="Username or email" autoCapitalize="none" style={[styles.remoteInput, { color: c.textPrimary, borderColor: c.inputBorder, backgroundColor: c.inputBg }]} value={identifier} onChangeText={setIdentifier} placeholder="Username or email" placeholderTextColor={c.textMuted} />
              <TextInput accessibilityLabel="Password" autoCapitalize="none" secureTextEntry style={[styles.remoteInput, { color: c.textPrimary, borderColor: c.inputBorder, backgroundColor: c.inputBg }]} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={c.textMuted} onSubmitEditing={() => void handleLogin()} />
              <TouchableOpacity accessibilityRole="button" style={[styles.remoteButton, { backgroundColor: c.blue600 }]} onPress={() => void handleLogin()} disabled={loading}><Text style={styles.remoteButtonText}>{loading ? 'Signing In…' : 'Sign In'}</Text></TouchableOpacity>
            </> : <PinPad
              value={pin}
              onChange={setPin}
              maxLength={4}
              onSubmit={() => void handleLogin()}
              submitLabel="Sign In"
              loading={loading}
            />}
            {error ? <Text style={[styles.errorText, { color: c.red500 }]}>{error}</Text> : null}
            {mode === 'DEMO' ? <View style={[styles.hintContainer, { backgroundColor: c.blue50 }]}>
              <Text style={[styles.hintText, { color: c.blue600 }]}>
                Demo PINs: 1234 (Juan), 5678 (Richard), 9999 (Pedro) • Reliever PIN: 1234
              </Text>
            </View> : null}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: c.textMuted }]}>Authorized personnel access only.</Text>
            <Text style={[styles.footerText, { color: c.textMuted }]}>v2.0.0 • Field operations</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 360, alignSelf: 'center', alignItems: 'center', gap: 36 },
  logoSection: { alignItems: 'center', gap: spacing.lg },
  logoImage: { width: 180, height: 180, borderRadius: 90, overflow: 'hidden' },
  title: { fontFamily: 'Manrope-ExtraBold', fontSize: 22, textAlign: 'center' },
  subtitle: { fontFamily: 'Manrope-Medium', fontSize: 14 },
  form: { width: '100%', alignItems: 'center', gap: spacing.lg },
  label: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  errorText: { fontFamily: 'Manrope-Medium', fontSize: 13, textAlign: 'center' },
  hintContainer: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.sm },
  hintText: { fontFamily: 'Manrope-Medium', fontSize: 12 },
  remoteInput: { width: '100%', borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Manrope-Medium', fontSize: 14 },
  remoteButton: { width: '100%', paddingVertical: 13, borderRadius: radius.sm, alignItems: 'center' },
  remoteButtonText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 14 },
  footer: { alignItems: 'center', gap: 4 },
  footerText: { fontFamily: 'Manrope-Regular', fontSize: 11, textAlign: 'center' },
});
