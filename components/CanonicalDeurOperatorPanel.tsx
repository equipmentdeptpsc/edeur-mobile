import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Card } from './Card';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { mapMobileActivity, type CanonicalMobileActivity } from '@/lib/canonical/activityMapping';
import { spacing } from '@/lib/theme';

const ACTIVITIES: CanonicalMobileActivity[] = ['Operating', 'Idle', 'Standby', 'Meal Break', 'Breakdown'];
const IDLE_REASONS = ['material', 'trucks', 'instructions', 'customer', 'access', 'traffic', 'weather', 'site preparation'];

export function CanonicalDeurOperatorPanel() {
  const { canonicalWork: work, canonicalBusy, startCanonicalDeur, transitionCanonicalActivity, endCanonicalShift, submitCanonicalDeur } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [idleReason, setIdleReason] = useState<string | null>(null);
  const act = async (label: string, action: () => Promise<{ success: boolean; code?: string }>) => {
    setMessage(null);
    const result = await action();
    setMessage(result.success ? `${label} accepted by the canonical service.` : `${label} was not accepted (${result.code ?? 'UNKNOWN'}).`);
  };
  if (!work) return <View style={[styles.center, { backgroundColor: c.background }]}><Text style={{ color: c.textMuted }}>No authorized active work found. Demo fixtures are disabled in UAT.</Text></View>;
  const deur = work.openDeur;
  return <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.xxxl + insets.bottom }]}>
    <Text style={[styles.title, { color: c.textPrimary }]}>Digital DEUR</Text>
    <Card style={styles.card}><Text style={[styles.name, { color: c.textPrimary }]}>{work.equipment.name}</Text><Text style={{ color: c.textMuted }}>{work.equipment.assetNumber}</Text><Text style={{ color: c.textSecondary }}>Rental {work.rental.rentalNumber}</Text><Text style={{ color: c.textSecondary }}>Assignment status: {work.assignment.status}</Text>{work.rental.billingMethod ? <Text style={{ color: c.textSecondary }}>Billing method: {work.rental.billingMethod}</Text> : null}</Card>
    {!deur ? <><Text style={{ color: c.textMuted }}>The server will assign the work date and DEUR number.</Text><Button label="START DIGITAL DEUR" disabled={canonicalBusy} loading={canonicalBusy} onPress={() => void act('Start DEUR', startCanonicalDeur)} /></> : <>
      <Card style={styles.card}><Text style={[styles.name, { color: c.textPrimary }]}>{deur.deurNumber}</Text><Text style={{ color: c.textSecondary }}>Work date: {deur.workDate}</Text><Text style={{ color: c.textSecondary }}>Canonical status: {deur.status}</Text><Text style={{ color: c.textSecondary }}>Current activity: {deur.activeActivity ?? 'None'}</Text></Card>
      <Text style={[styles.section, { color: c.textPrimary }]}>Operational state</Text>
      <View style={styles.controls}>{ACTIVITIES.map((label) => { const activity=mapMobileActivity(label); return <Button key={label} label={label.toUpperCase()} variant="secondary" disabled={canonicalBusy || deur.activeActivity === activity} onPress={() => void act(label, () => transitionCanonicalActivity(activity, label === 'Idle' && idleReason ? { id: idleReason, label: idleReason } : undefined))} style={styles.control} />; })}</View>
      <Text style={{ color: c.textMuted }}>Optional Idle reason (metadata only)</Text>
      <View style={styles.controls}>{IDLE_REASONS.map((reason) => <Button key={reason} label={reason} variant={idleReason === reason ? 'primary' : 'ghost'} disabled={canonicalBusy} onPress={() => setIdleReason(reason)} style={styles.reason} />)}</View>
      <Text style={{ color: c.textMuted }}>Standby remains an explicit state. The current canonical command has no Standby-reason field, so Mobile does not fabricate one.</Text>
      <Button label="END SHIFT" variant="danger" disabled={canonicalBusy} onPress={() => void act('End Shift', endCanonicalShift)} />
      <Button label="SUBMIT DEUR" disabled={canonicalBusy} loading={canonicalBusy} onPress={() => void act('Submit', submitCanonicalDeur)} />
    </>}
    {message ? <Text style={{ color: c.textSecondary }}>{message}</Text> : null}
    <Text style={{ color: c.textMuted }}>Customer review and billing continue in the trusted Web/backend workflow after submission.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, content: { padding: spacing.lg, gap: spacing.md }, title: { fontFamily: 'Manrope-ExtraBold', fontSize: 24 }, section: { fontFamily: 'Manrope-Bold', fontSize: 16 }, name: { fontFamily: 'Manrope-Bold', fontSize: 16 }, card: { gap: spacing.sm }, controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, control: { minWidth: '46%', flexGrow: 1 }, reason: { minHeight: 38, paddingVertical: spacing.sm } });
