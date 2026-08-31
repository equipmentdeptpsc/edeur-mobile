import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, User } from 'lucide-react-native';
import { fonts, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { mockRepository } from '@/lib/mockRepository';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { PinPad } from '@/components/PinPad';
import { ThemedTextInput } from '@/components/ThemedTextInput';

type TurnoverTarget = 'reliever' | 'main';

export default function TurnoverLoginScreen() {
  const router = useRouter();
  const { deurId } = useLocalSearchParams<{ deurId?: string }>();
  const { loginReliever, loginMainOperator } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [target, setTarget] = useState<TurnoverTarget>('reliever');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const defaultPin = mockRepository.getDefaultRelieverPin();

  const handleLogin = () => {
    setError('');
    if (target === 'reliever') {
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
    } else {
      if (!pin.trim()) {
        setError('Please enter your PIN.');
        return;
      }
      setLoading(true);
      setTimeout(() => {
        const success = deurId ? loginMainOperator(pin.trim(), deurId) : false;
        if (!success) {
          setError('Invalid PIN. Please try again.');
          setPin('');
          setLoading(false);
          return;
        }
        setLoading(false);
        router.replace('/deur');
      }, 400);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <PageHeader title="Turn Over" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.iconHeader}>
          <View style={[styles.iconCircle, { backgroundColor: c.blue50 }]}>
            <Users size={32} color={c.blue600} strokeWidth={2} />
          </View>
          <Text style={[styles.title, { color: c.textPrimary }]}>Turn Over Shift</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Select the operator type to continue this DEUR</Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, { borderColor: c.blue600, backgroundColor: target === 'reliever' ? c.blue600 : c.surface }]}
            onPress={() => { setTarget('reliever'); setPin(''); setError(''); }}
            activeOpacity={0.7}
          >
            <Users size={18} color={target === 'reliever' ? c.white : c.blue600} strokeWidth={2} />
            <Text style={[styles.tabText, { color: target === 'reliever' ? c.white : c.blue600 }]}>
              Reliever
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, { borderColor: c.blue600, backgroundColor: target === 'main' ? c.blue600 : c.surface }]}
            onPress={() => { setTarget('main'); setName(''); setError(''); }}
            activeOpacity={0.7}
          >
            <User size={18} color={target === 'main' ? c.white : c.blue600} strokeWidth={2} />
            <Text style={[styles.tabText, { color: target === 'main' ? c.white : c.blue600 }]}>
              Main Operator
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameFieldContainer}>
          {target === 'reliever' ? (
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
          ) : (
            <Card style={styles.card}>
              <View style={styles.disabledField}>
                <Text style={[styles.label, { color: c.textMuted }]}>Full Name</Text>
                <View style={[styles.disabledInputContainer, { backgroundColor: c.slate50, borderColor: c.slate100 }]}>
                  <User size={18} color={c.textMuted} strokeWidth={2} />
                  <Text style={[styles.disabledInputText, { color: c.textMuted }]}>Not required for Main Operator</Text>
                </View>
                <Text style={[styles.helperText, { color: c.textMuted }]}>Main Operator is identified by PIN only</Text>
              </View>
            </Card>
          )}
        </View>

        <View style={styles.pinSection}>
          <Text style={[styles.label, { color: c.textPrimary }]}>PIN</Text>
          <PinPad
            value={pin}
            onChange={setPin}
            maxLength={4}
            onSubmit={handleLogin}
            submitLabel="Turn Over"
            loading={loading}
          />
          {error ? <Text style={[styles.errorText, { color: c.red500 }]}>{error}</Text> : null}
        </View>

        {target === 'reliever' && (
          <View style={[styles.hintContainer, { backgroundColor: c.blue50 }]}>
            <Text style={[styles.hintText, { color: c.blue600 }]}>Default reliever PIN: {defaultPin}</Text>
          </View>
        )}
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
  tabRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  tabText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  card: {
    gap: spacing.md,
  },
  nameFieldContainer: {
    minHeight: 130,
  },
  disabledField: {
    gap: 6,
  },
  disabledInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  disabledInputText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    minHeight: 24,
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
