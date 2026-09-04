import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ScrollView, Image, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { isValidOperatorPin } from '@/lib/canonical/authentication';
import { PinPad } from '@/components/PinPad';
import { spacing, radius } from '@/lib/theme';
import { Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login, getLoginError, mode, configurationError, operator, requiresOnlineFirstSignIn } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [usePasswordCompatibility, setUsePasswordCompatibility] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (operator) router.replace('/home');
  }, [operator, router]);

  if (operator === undefined) return <View style={[styles.initializing, { backgroundColor: c.background }]}><ActivityIndicator size="large" color={c.blue600} /></View>;

  const handleLogin = async () => {
    setError('');
    if (configurationError) { setError(configurationError); return; }
    if (mode === 'DEMO' && !pin.trim()) { setError('Please enter your PIN.'); return; }
    const operatorPinFlow = mode === 'UAT' && !usePasswordCompatibility;
    const credential = operatorPinFlow ? pin : password;
    if (mode === 'UAT' && (!identifier.trim() || !credential)) { setError(operatorPinFlow ? 'Enter your login name and PIN.' : 'Enter your login name and password.'); return; }
    if (operatorPinFlow && !isValidOperatorPin(pin)) { setError('Enter a six-digit PIN that is not repeated or sequential.'); setPin(''); return; }
    setLoading(true);
    const success = await login(mode === 'UAT' ? identifier.trim() : pin.trim(), mode === 'UAT' ? credential : undefined, operatorPinFlow ? 'OPERATOR_PIN' : 'PASSWORD');
    if (!success) { setError(mode === 'UAT' ? (getLoginError() ?? (operatorPinFlow ? 'Invalid login name or PIN.' : 'Invalid username or password.')) : 'Invalid PIN. Please try again.'); setPin(''); setPassword(''); setPinVisible(false); setLoading(false); return; }
    setPin(''); setPassword(''); setPinVisible(false);
    setLoading(false); router.replace('/home');
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
            <Text style={[styles.label, { color: c.textPrimary }]}>{mode === 'UAT' ? (usePasswordCompatibility ? 'Operator password access' : 'Canonical Operator Access') : 'Demo Operator Access'}</Text>
            {mode === 'UAT' ? <>
              <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Login Name</Text><TextInput accessibilityLabel="Login Name" autoCapitalize="none" autoCorrect={false} style={[styles.remoteInput, { color: c.textPrimary, borderColor: c.inputBorder, backgroundColor: c.inputBg }]} value={identifier} onChangeText={setIdentifier} placeholder="Login name" placeholderTextColor={c.textMuted} /></View>
              {usePasswordCompatibility ? <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Password</Text><TextInput accessibilityLabel="Password" autoCapitalize="none" autoCorrect={false} secureTextEntry style={[styles.remoteInput, { color: c.textPrimary, borderColor: c.inputBorder, backgroundColor: c.inputBg }]} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={c.textMuted} onSubmitEditing={() => void handleLogin()} /></View> : <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: c.textSecondary }]}>PIN</Text><View style={styles.pinInputWrap}><TextInput accessibilityLabel="Six digit Operator PIN" autoCapitalize="none" autoCorrect={false} keyboardType="number-pad" inputMode="numeric" maxLength={6} secureTextEntry={!pinVisible} style={[styles.remoteInput, styles.pinInput, { color: c.textPrimary, borderColor: c.inputBorder, backgroundColor: c.inputBg }]} value={pin} onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))} placeholder="Six-digit PIN" placeholderTextColor={c.textMuted} onSubmitEditing={() => void handleLogin()} /><TouchableOpacity accessibilityRole="button" accessibilityLabel={pinVisible ? 'Hide PIN' : 'Show PIN'} style={styles.visibilityButton} onPress={() => setPinVisible(value => !value)}>{pinVisible ? <EyeOff color={c.textSecondary} size={20} /> : <Eye color={c.textSecondary} size={20} />}</TouchableOpacity></View></View>}
              <TouchableOpacity accessibilityRole="button" style={[styles.remoteButton, { backgroundColor: c.blue600 }]} onPress={() => void handleLogin()} disabled={loading}><Text style={styles.remoteButtonText}>{loading ? 'Signing In…' : 'Sign In'}</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={usePasswordCompatibility ? 'Use PIN instead' : 'Use password instead'} style={styles.compatibilityButton} onPress={() => { setUsePasswordCompatibility(value => !value); setError(''); setPin(''); setPassword(''); setPinVisible(false); }} disabled={loading}><Text style={[styles.compatibilityButtonText, { color: c.blue600 }]}>{usePasswordCompatibility ? 'Use PIN instead' : 'Use password instead'}</Text></TouchableOpacity>
            </> : <PinPad
              value={pin}
              onChange={setPin}
              maxLength={4}
              onSubmit={() => void handleLogin()}
              submitLabel="Sign In"
              loading={loading}
            />}
            {error ? <Text style={[styles.errorText, { color: c.red500 }]}>{error}</Text> : null}
            {mode === 'UAT' && requiresOnlineFirstSignIn ? <Text style={[styles.errorText, { color: c.amber500 }]}>Internet connection is required for first sign-in on this device.</Text> : null}
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
  initializing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 360, alignSelf: 'center', alignItems: 'center', gap: 36 },
  logoSection: { alignItems: 'center', gap: spacing.lg },
  logoImage: { width: 180, height: 180, borderRadius: 90, overflow: 'hidden' },
  title: { fontFamily: 'Manrope-ExtraBold', fontSize: 22, textAlign: 'center' },
  subtitle: { fontFamily: 'Manrope-Medium', fontSize: 14 },
  form: { width: '100%', alignItems: 'center', gap: spacing.lg },
  label: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  fieldGroup: { width: '100%', gap: 6 },
  fieldLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 12 },
  errorText: { fontFamily: 'Manrope-Medium', fontSize: 13, textAlign: 'center' },
  hintContainer: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.sm },
  hintText: { fontFamily: 'Manrope-Medium', fontSize: 12 },
  remoteInput: { width: '100%', borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Manrope-Medium', fontSize: 14 },
  pinInputWrap: { width: '100%', position: 'relative' },
  pinInput: { paddingRight: 48 },
  visibilityButton: { position: 'absolute', right: 0, top: 0, width: 48, height: '100%', alignItems: 'center', justifyContent: 'center' },
  remoteButton: { width: '100%', paddingVertical: 13, borderRadius: radius.sm, alignItems: 'center' },
  remoteButtonText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 14 },
  compatibilityButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  compatibilityButtonText: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  footer: { alignItems: 'center', gap: 4 },
  footerText: { fontFamily: 'Manrope-Regular', fontSize: 11, textAlign: 'center' },
});
