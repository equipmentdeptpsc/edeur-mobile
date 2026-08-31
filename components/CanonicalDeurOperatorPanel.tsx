import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { SyncBanner } from './SyncBanner';
import { Card } from './Card';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { mapMobileActivity, type CanonicalMobileActivity } from '@/lib/canonical/activityMapping';
import { spacing } from '@/lib/theme';

const ACTIVITIES: CanonicalMobileActivity[] = ['Operating', 'Idle', 'Standby', 'Meal Break', 'Breakdown'];
const IDLE_REASONS = ['material', 'trucks', 'instructions', 'customer', 'access', 'traffic', 'weather', 'site preparation'];

export function CanonicalDeurOperatorPanel() {
  const { canonicalWork: work, canonicalWorks, selectCanonicalWork, canonicalBusy, offlineSyncState, offlinePendingCount, startCanonicalDeur, transitionCanonicalActivity, endCanonicalShift, submitCanonicalDeur, initiateCanonicalTurnover, acceptCanonicalTurnover } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [idleReason, setIdleReason] = useState<string | null>(null);
  const [showTurnoverTargets, setShowTurnoverTargets] = useState(false);
  const act = async (label: string, action: () => Promise<{ success: boolean; code?: string }>) => {
    setMessage(null);
    const result = await action();
    setMessage(result.success ? `${label} accepted by the canonical service.` : result.code === 'LOCAL_PENDING' ? `${label} is queued locally and awaits canonical confirmation.` : `${label} was not accepted (${result.code ?? 'UNKNOWN'}).`);
  };
  if (!work && canonicalWorks.length > 1) return <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top }]}><Text style={[styles.title, { color: c.textPrimary }]}>Select equipment work</Text>{canonicalWorks.map(item => <Button key={item.rentalLine.id} label={`${item.equipment.assetNumber} · ${item.rental.rentalNumber}`} variant="secondary" onPress={() => selectCanonicalWork(item.rentalLine.id)} />)}</ScrollView>;
  if (!work) return <View style={[styles.center, { backgroundColor: c.background }]}><Text style={{ color: c.textMuted }}>No authorized active work found. Demo fixtures are disabled in UAT.</Text></View>;
  const deur = work.openDeur ?? work.dailyDeur;
  const isOpen = Boolean(work.openDeur);
  const canAcceptTurnover = work.custody?.turnoverStatus === 'PENDING' && work.custody.turnoverToOperatorId === work.identity.operatorId;
  const hasCustodyAuthority = !work.custody || work.custody.currentAuthorizedOperatorId === work.identity.operatorId;
  return <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.xxxl + insets.bottom }]}>
    <Text style={[styles.title, { color: c.textPrimary }]}>Digital DEUR</Text>
    {offlineSyncState !== 'ONLINE' ? <><SyncBanner status={offlineSyncState === 'OFFLINE' ? 'offline' : offlineSyncState === 'SYNC_CONFLICT' ? 'failed' : 'pending'} />{offlinePendingCount > 0 ? <Text style={{ color: c.textMuted }}>Pending canonical commands: {offlinePendingCount}</Text> : null}</> : null}
    <Card style={styles.card}><Text style={[styles.name, { color: c.textPrimary }]}>{work.equipment.name}</Text><Text style={{ color: c.textMuted }}>{work.equipment.assetNumber}</Text><Text style={{ color: c.textSecondary }}>Rental {work.rental.rentalNumber}</Text><Text style={{ color: c.textSecondary }}>Assignment status: {work.assignment.status}</Text>{work.rental.billingMethod ? <Text style={{ color: c.textSecondary }}>Billing method: {work.rental.billingMethod}</Text> : null}</Card>
    {!deur ? <><Text style={{ color: c.textMuted }}>The server will assign the work date and DEUR number.</Text><Button label="START DIGITAL DEUR" disabled={canonicalBusy} loading={canonicalBusy} onPress={() => void act('Start DEUR', startCanonicalDeur)} /></> : <>
      <Card style={styles.card}><Text style={[styles.name, { color: c.textPrimary }]}>{deur.deurNumber}</Text><Text style={{ color: c.textSecondary }}>Work date: {deur.workDate}</Text><Text style={{ color: c.textSecondary }}>Canonical status: {deur.status}</Text><Text style={{ color: c.textSecondary }}>Current activity: {deur.activeActivity ?? 'None'}</Text>{work.custody ? <><Text style={{ color: c.textSecondary }}>Primary operator: {work.custody.primaryOperatorId}</Text><Text style={{ color: c.textSecondary }}>Current operator: {work.custody.currentAuthorizedOperatorId}</Text>{work.custody.turnoverStatus === 'PENDING' ? <Text style={{ color: c.textMuted }}>Turnover is pending acceptance. Activity controls remain locked.</Text> : null}</> : null}</Card>
      {isOpen && work.custody?.turnoverStatus === 'PENDING' ? <><Text style={{ color: c.textMuted }}>{canAcceptTurnover ? 'Accepting a turnover is online-only and transfers authority without changing the DEUR primary operator.' : 'Turnover is pending reliever acceptance. Activity controls remain locked.'}</Text>{canAcceptTurnover ? <Button label="ACCEPT TURNOVER" disabled={canonicalBusy} loading={canonicalBusy} onPress={() => void act('Accept turnover', acceptCanonicalTurnover)} /> : null}</> : isOpen && hasCustodyAuthority ? <><Text style={[styles.section, { color: c.textPrimary }]}>Operational state</Text>
      {work.turnoverTargets?.length ? <><Button label="TURN OVER DEUR" variant="secondary" disabled={canonicalBusy || offlineSyncState === 'OFFLINE'} onPress={() => setShowTurnoverTargets(value => !value)} /><Text style={{ color: c.textMuted }}>{offlineSyncState === 'OFFLINE' ? 'Turnover requires an online connection.' : 'Nominate an eligible reliever. Your custody and current activity remain unchanged until acceptance.'}</Text>{showTurnoverTargets ? <View style={styles.controls}>{work.turnoverTargets.map(target => <Button key={target.operatorId} label={`TURN OVER TO ${target.displayName.toUpperCase()}`} disabled={canonicalBusy || offlineSyncState === 'OFFLINE'} loading={canonicalBusy} onPress={() => void act('Turnover', async () => { const result=await initiateCanonicalTurnover(target.operatorId); if(result.success)setShowTurnoverTargets(false); return result; })} style={styles.control} />)}</View> : null}</> : null}
      <View style={styles.controls}>{ACTIVITIES.map((label) => { const activity=mapMobileActivity(label); return <Button key={label} label={label.toUpperCase()} variant="secondary" disabled={canonicalBusy || deur.activeActivity === activity} onPress={() => void act(label, () => transitionCanonicalActivity(activity, label === 'Idle' && idleReason ? { id: idleReason, label: idleReason } : undefined))} style={styles.control} />; })}</View>
      <Text style={{ color: c.textMuted }}>Optional Idle reason (metadata only)</Text>
      <View style={styles.controls}>{IDLE_REASONS.map((reason) => <Button key={reason} label={reason} variant={idleReason === reason ? 'primary' : 'ghost'} disabled={canonicalBusy} onPress={() => setIdleReason(reason)} style={styles.reason} />)}</View>
      <Text style={{ color: c.textMuted }}>Standby remains an explicit state. The current canonical command has no Standby-reason field, so Mobile does not fabricate one.</Text>
      <Button label="END SHIFT" variant="danger" disabled={canonicalBusy} onPress={() => void act('End Shift', endCanonicalShift)} />
      <Button label="SUBMIT DEUR" disabled={canonicalBusy} loading={canonicalBusy} onPress={() => void act('Submit', submitCanonicalDeur)} /></> : <Text style={{ color: c.textMuted }}>{isOpen && !hasCustodyAuthority ? 'This DEUR is read-only after custody transfers. Customer review continues through the canonical service.' : 'This DEUR is read-only after submission. Customer review continues through the canonical service.'}</Text>}
    </>}
    {message ? <Text style={{ color: c.textSecondary }}>{message}</Text> : null}
    <Text style={{ color: c.textMuted }}>Customer review and billing continue in the trusted Web/backend workflow after submission.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, content: { padding: spacing.lg, gap: spacing.md }, title: { fontFamily: 'Manrope-ExtraBold', fontSize: 24 }, section: { fontFamily: 'Manrope-Bold', fontSize: 16 }, name: { fontFamily: 'Manrope-Bold', fontSize: 16 }, card: { gap: spacing.sm }, controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, control: { minWidth: '46%', flexGrow: 1 }, reason: { minHeight: 38, paddingVertical: spacing.sm } });
