import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { ThemeColors } from '@/lib/theme';
import type { CanonicalDeurEvent, CanonicalOpenDeur, CanonicalOperatorWork } from '@/lib/canonical/contracts.generated';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { spacing, radius } from '@/lib/theme';

type Props = {
  work: CanonicalOperatorWork;
  deur: CanonicalOpenDeur;
  colors: ThemeColors;
  primaryOperatorDisplayName: string;
  currentOperatorDisplayName: string;
  onClose: () => void;
};

const activityLabel = (activity: CanonicalDeurEvent['activity']) => activity === 'shift' ? 'Shift' : ({
  operation: 'Operating', idle: 'Idle', standby: 'Standby', mealBreak: 'Meal Break', breakdown: 'Breakdown',
} as const)[activity];
const actionLabel = (action: CanonicalDeurEvent['action']) => action === 'start' ? 'started' : 'ended';
const timeLabel = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
const dateTimeLabel = (value?: string) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const minutesLabel = (minutes?: number) => minutes === undefined ? '—' : `${minutes} min`;

function durationMinutes(deur: CanonicalOpenDeur) {
  if (!deur.startedAt) return undefined;
  const end = deur.endedAt ? new Date(deur.endedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(deur.startedAt).getTime()) / 60000));
}

function meterRequirementLabel(requirement: CanonicalOperatorWork['meterRequirement']) {
  return requirement === 'hourMeter' ? 'Hour meter' : requirement === 'odometer' ? 'Odometer' : requirement === 'both' ? 'Hour meter + odometer' : 'Not required';
}

export function CanonicalDeurDetailsSheet({ work, deur, colors: c, primaryOperatorDisplayName, currentOperatorDisplayName, onClose }: Props) {
  const duration = durationMinutes(deur);
  const turnoverStatus = work.custody?.turnoverStatus === 'PENDING' ? 'Pending acceptance' : work.custody?.turnoverStatus === 'ACCEPTED' ? 'Accepted' : 'No active turnover';
  return <Modal visible animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalRoot}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close DEUR details" style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.background, borderColor: c.surfaceBorder }]}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}><Text style={[styles.sheetTitle, { color: c.textPrimary }]}>DEUR Details</Text><Text style={{ color: c.textMuted }}>Canonical read-only view</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close DEUR details" onPress={onClose} style={[styles.closeButton, { backgroundColor: c.surface }]}><Text style={{ color: c.textPrimary }}>Close</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator>
          <Section title="Overview" colors={c}>
            <DetailRow label="DEUR" value={deur.deurNumber} colors={c} />
            <DetailRow label="Work date" value={deur.workDate} colors={c} />
            <DetailRow label="Status" value={deur.status} colors={c} />
            <DetailRow label="Equipment" value={work.equipment.name} colors={c} />
            <DetailRow label="Asset" value={work.equipment.assetNumber} colors={c} />
            <DetailRow label="Rental" value={work.rental.rentalNumber} colors={c} />
            <DetailRow label="Assignment status" value={work.assignment.status} colors={c} />
          </Section>
          <Section title="Operator / custody" colors={c}>
            <DetailRow label="Primary operator" value={primaryOperatorDisplayName} colors={c} />
            <DetailRow label="Current operator" value={currentOperatorDisplayName} colors={c} />
            <DetailRow label="Turnover" value={turnoverStatus} colors={c} />
          </Section>
          <Section title="Shift summary" colors={c}>
            <DetailRow label="Started" value={dateTimeLabel(deur.startedAt)} colors={c} />
            <DetailRow label="Ended" value={dateTimeLabel(deur.endedAt)} colors={c} />
            <DetailRow label="Duration" value={minutesLabel(duration)} colors={c} />
            <DetailRow label="Operating" value={minutesLabel(deur.totalOperatingMinutes)} colors={c} />
            <DetailRow label="Idle" value={minutesLabel(deur.totalIdleMinutes)} colors={c} />
            <DetailRow label="Standby" value={minutesLabel(deur.totalStandbyMinutes)} colors={c} />
            <DetailRow label="Meal break" value={minutesLabel(deur.totalMealBreakMinutes)} colors={c} />
            <DetailRow label="Breakdown" value={minutesLabel(deur.totalMaintenanceMinutes)} colors={c} />
          </Section>
          <Section title="Meter" colors={c}>
            <DetailRow label="Meter type" value={meterRequirementLabel(work.meterRequirement)} colors={c} />
            {work.meterRequirement === 'hourMeter' || work.meterRequirement === 'both' ? <><DetailRow label="Opening hour meter" value={deur.openingHourMeter === undefined ? 'Not recorded' : String(deur.openingHourMeter)} colors={c} /><DetailRow label="Closing hour meter" value={deur.closingHourMeter === undefined ? 'Not recorded' : String(deur.closingHourMeter)} colors={c} /></> : null}
            {work.meterRequirement === 'odometer' || work.meterRequirement === 'both' ? <><DetailRow label="Opening odometer" value={deur.openingOdometer === undefined ? 'Not recorded' : String(deur.openingOdometer)} colors={c} /><DetailRow label="Closing odometer" value={deur.closingOdometer === undefined ? 'Not recorded' : String(deur.closingOdometer)} colors={c} /></> : null}
            {deur.legacyMeterEvidenceState === 'AMBIGUOUS_GENERIC_DUAL_METER' ? <Text style={[styles.warning, { color: c.amber500, backgroundColor: c.amber50 }]}>Historical record: generic meter evidence cannot be reliably assigned to hour meter versus odometer.</Text> : null}
          </Section>
          <Section title="Remarks" colors={c}><Text style={{ color: c.textSecondary }}>{deur.operationalRemarks?.trim() || 'No remarks recorded.'}</Text></Section>
          <Section title="Activity timeline" colors={c}>
            {deur.events?.length ? deur.events.map(event => <View key={event.id} style={styles.timelineRow}><View style={[styles.timelineDot, { backgroundColor: c.blue600 }]} /><View style={{ flex: 1 }}><Text style={[styles.timelineTitle, { color: c.textPrimary }]}>{activityLabel(event.activity)} {actionLabel(event.action)}</Text><Text style={{ color: c.textMuted }}>{timeLabel(event.occurredAt)} · Event {event.sequence}</Text></View></View>) : <Text style={{ color: c.textMuted }}>No activity events recorded.</Text>}
          </Section>
          <Section title="Turnover" colors={c}>
            <StatusChip label={turnoverStatus} variant={work.custody?.turnoverStatus === 'PENDING' ? 'amber' : work.custody?.turnoverStatus === 'ACCEPTED' ? 'emerald' : 'slate'} />
            <Text style={{ color: c.textMuted }}>Turnover actions remain on the canonical DEUR surface.</Text>
          </Section>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function Section({ title, colors: c, children }: { title: string; colors: ThemeColors; children: ReactNode }) {
  return <Card style={{ ...styles.sectionCard, backgroundColor: c.surface, borderColor: c.surfaceBorder }}><Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{title}</Text>{children}</Card>;
}

function DetailRow({ label, value, colors: c }: { label: string; value: string; colors: ThemeColors }) {
  return <View style={styles.detailRow}><Text style={{ color: c.textMuted }}>{label}</Text><Text style={[styles.detailValue, { color: c.textPrimary }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { maxHeight: '92%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: '#94a3b833' },
  sheetTitle: { fontFamily: 'Manrope-ExtraBold', fontSize: 20 },
  closeButton: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sheetContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  sectionCard: { gap: spacing.sm, borderWidth: 1 },
  sectionTitle: { fontFamily: 'Manrope-Bold', fontSize: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  detailValue: { flex: 1, textAlign: 'right', fontFamily: 'Manrope-SemiBold' },
  warning: { padding: spacing.md, borderRadius: radius.md, overflow: 'hidden' },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  timelineTitle: { fontFamily: 'Manrope-SemiBold' },
});
