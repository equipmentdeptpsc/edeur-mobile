import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users } from 'lucide-react-native';
import { fonts, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { mockRepository } from '@/lib/mockRepository';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { PinPad } from '@/components/PinPad';
import { ThemedTextInput } from '@/components/ThemedTextInput';

export default function RelieverLoginScreen() {
  const router = useRouter();
  const { deurId } = useLocalSearchParams<{ deurId?: string }>();
  const { loginReliever } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const defaultPin = mockRepository.getDefaultRelieverPin();

  const handleLogin = () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters.');
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      setError('Name must contain only letters and spaces.');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter your PIN.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = loginReliever(name.trim(), pin.trim(), deurId);
      if (!success) {
        setError('Invalid name or PIN. Please try again.');
        setPin('');
        setLoading(false);
        return;
      }
      setLoading(false);
      router.replace('/deur');
    }, 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <PageHeader title="Reliever Login" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.iconHeader}>
          <View style={[styles.iconCircle, { backgroundColor: c.blue50 }]}>
            <Users size={32} color={c.blue600} strokeWidth={2} />
          </View>
          <Text style={[styles.title, { color: c.textPrimary }]}>Reliever Operator</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Enter your name and PIN to continue the active DEUR</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: c.textPrimary }]}>Full Name</Text>
            <ThemedTextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Text style={[styles.helperText, { color: c.textMuted }]}>Letters and spaces only, minimum 3 characters</Text>
          </View>
        </Card>

        <View style={styles.pinSection}>
          <Text style={[styles.label, { color: c.textPrimary }]}>PIN</Text>
          <PinPad
            value={pin}
            onChange={setPin}
            maxLength={4}
            onSubmit={handleLogin}
            submitLabel="Continue"
            loading={loading}
          />
          {error ? <Text style={[styles.errorText, { color: c.red500 }]}>{error}</Text> : null}
        </View>

        <View style={[styles.hintContainer, { backgroundColor: c.blue50 }]}>
          <Text style={[styles.hintText, { color: c.blue600 }]}>Default reliever PIN: {defaultPin}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  iconHeader: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    minHeight: 24,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  pinSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  hintContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignSelf: 'center',
  },
  hintText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
});
