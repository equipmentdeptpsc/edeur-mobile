import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Truck, Gauge, Fuel, MessageSquare, TriangleAlert as AlertTriangle, Users, Navigation, ChevronDown, ChevronUp, Clock, Activity } from 'lucide-react-native';
import { useTheme } from '@/lib/useTheme';
import { mockRepository } from '@/lib/mockRepository';
import { Card } from '@/components/Card';
import { StatusChip } from '@/components/StatusChip';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SyncBanner } from '@/components/SyncBanner';
import { useConnectivity } from '@/lib/useConnectivity';
import {
  formatDuration, formatDurationShort, formatTime, formatDate,
  getActivityColor, getNetOperatingTime, getGrossProductiveTime, getTotalShiftTime,
  getStatusVariant,
} from '@/lib/utils';
import { spacing, radius, fonts } from '@/lib/theme';

type SectionKey = 'operators' | 'time' | 'activity' | 'timeline' | 'travel' | 'meter' | 'fuel' | 'remarks';

export default function DeurSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c } = useTheme();
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const connectivity = useConnectivity();

  const deur = mockRepository.getDeurById(id);
  if (!deur) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <PageHeader title="DEUR Summary" onBack={() => router.back()} />
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>DEUR record not found.</Text>
        </View>
      </View>
    );
  }

  const equipment = mockRepository.getEquipment(deur.equipmentId);
  const project = mockRepository.getProject(deur.projectId);
  const rental = mockRepository.getRental(deur.rentalId);
  const hasOdometer = equipment?.hasOdometer ?? false;
  const netOp = getNetOperatingTime(deur);
  const grossProd = getGrossProductiveTime(deur);
  const totalShift = getTotalShiftTime(deur);
  const isSubmitted = deur.status === 'Submitted' || deur.status === 'Waiting Acknowledgement' || deur.status === 'Acknowledged';
  const isRejected = deur.status === 'Rejected';
  const canSubmit = deur.status === 'Ended' && !isSubmitted;
  const calculatedClosing = mockRepository.getCalculatedClosingMeter(id);
  const totalDistance = mockRepository.getTravelDistance(id);
  const totalFuel = mockRepository.getTotalFuelIssued(id);
  const legs = mockRepository.getTravelLegs(id);

  const handleSubmit = () => {
    const updated = mockRepository.submitDeur(deur.id);
    if (updated) {
      setShowSubmitConfirm(false);
      router.replace(`/post-submission?id=${updated.id}`);
    }
  };

  const handleBack = () => {
    if (isSubmitted) router.replace('/home');
    else router.back();
  };

  const toggle = (key: SectionKey) => setOpenSection(openSection === key ? null : key);

  const getActivityTotals = () => {
    const totals: Record<string, number> = { Operating: 0, Waiting: 0, Breakdown: 0, 'Meal Break': 0 };
    for (const a of deur.activities) {
      const dur = a.endTime !== null ? a.durationMs : Date.now() - new Date(a.startTime).getTime();
      if (a.activity in totals) totals[a.activity] += dur;
    }
    return totals;
  };

  const sections: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
    { key: 'operators', label: 'Operator Trail', icon: <Users size={16} color={c.textSecondary} strokeWidth={2} /> },
    { key: 'time', label: 'Time Summary', icon: <Clock size={16} color={c.textSecondary} strokeWidth={2} /> },
    { key: 'activity', label: 'Activity Breakdown', icon: <Activity size={16} color={c.textSecondary} strokeWidth={2} /> },
    { key: 'timeline', label: 'Activity Timeline', icon: <Clock size={16} color={c.textSecondary} strokeWidth={2} /> },
    { key: 'travel', label: 'Travel Trail', icon: <Navigation size={16} color={c.textSecondary} strokeWidth={2} /> },
    { key: 'meter', label: 'Meter & Odometer', icon: <Gauge size={16} color={c.textSecondary} strokeWidth={2} /> },
    { key: 'fuel', label: 'Fuel Log', icon: <Fuel size={16} color={c.textSecondary} strokeWidth={2} /> },
    { key: 'remarks', label: 'Remarks & Breakdown', icon: <MessageSquare size={16} color={c.textSecondary} strokeWidth={2} /> },
  ];

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case 'operators':
        return (
          <View style={styles.sectionContent}>
            {deur.operatorSegments.map((seg, idx) => (
              <View key={seg.id}>
                <View style={styles.segmentRow}>
                  <View style={[styles.segmentDot, { backgroundColor: seg.isReliever ? c.amber500 : c.blue600 }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.segmentName, { color: c.textPrimary }]}>{seg.operatorName}{seg.isReliever ? ' (Reliever)' : ''}</Text>
                    <Text style={[styles.segmentTime, { color: c.textMuted }]}>{formatTime(seg.startTime)} – {seg.endTime ? formatTime(seg.endTime) : 'Active'}</Text>
                  </View>
                </View>
                {idx < deur.operatorSegments.length - 1 && <View style={[styles.divider, { backgroundColor: c.slate100 }]} />}
              </View>
            ))}
          </View>
        );
      case 'time':
        return (
          <View style={styles.sectionContent}>
            <DetailRow label="Net Operating Time" value={formatDuration(netOp)} c={c} />
            <DetailRow label="Gross Productive Time" value={formatDuration(grossProd)} c={c} />
            <DetailRow label="Total Shift Time" value={formatDuration(totalShift)} c={c} />
          </View>
        );
      case 'activity': {
        const totals = getActivityTotals();
        return (
          <View style={styles.sectionContent}>
            {Object.entries(totals).map(([act, ms]) => (
              <View key={act} style={styles.barRow}>
                <View style={styles.barRowHeader}>
                  <Text style={[styles.barRowLabel, { color: c.textSecondary }]}>{act}</Text>
                  <Text style={[styles.barRowValue, { color: c.textPrimary }]}>{formatDuration(ms)}</Text>
                </View>
                <View style={[styles.barBg, { backgroundColor: c.slate200 }]}>
                  <View style={[styles.bar, { width: `${totalShift > 0 ? (ms / totalShift) * 100 : 0}%`, backgroundColor: getActivityColor(act) }]} />
                </View>
              </View>
            ))}
          </View>
        );
      }
      case 'timeline':
        return (
          <View style={styles.sectionContent}>
            {deur.activities.map((event, idx) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: getActivityColor(event.activity) }]} />
                {idx < deur.activities.length - 1 && <View style={[styles.timelineLine, { backgroundColor: c.slate200 }]} />}
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineActivity, { color: c.textPrimary }]}>{event.activity}</Text>
                  {event.reason ? <Text style={[styles.timelineReason, { color: c.textMuted }]}>{event.reason}</Text> : null}
                  {event.category ? <Text style={[styles.timelineReason, { color: c.textMuted }]}>{event.category}</Text> : null}
                  <Text style={[styles.timelineTime, { color: c.textMuted }]}>{formatTime(event.startTime)} – {event.endTime ? formatTime(event.endTime) : 'Current'}</Text>
                </View>
                {event.endTime && <Text style={[styles.timelineDuration, { color: c.textSecondary }]}>{formatDurationShort(event.durationMs)}</Text>}
              </View>
            ))}
          </View>
        );
      case 'travel':
        return (
          <View style={styles.sectionContent}>
            {deur.travelCheckpoints.length === 0 ? (
              <Text style={[styles.noData, { color: c.textMuted }]}>No travel checkpoints recorded</Text>
            ) : (
              <>
                {deur.travelCheckpoints.map((cp, idx) => (
                  <View key={cp.id} style={styles.checkpointItem}>
                    <View style={[styles.checkpointDot, { backgroundColor: cp.operatorIsReliever ? c.amber500 : c.blue600 }]} />
                    {idx < deur.travelCheckpoints.length - 1 && <View style={[styles.timelineLine, { backgroundColor: c.slate200 }]} />}
                    <View style={styles.timelineContent}>
                      <Text style={[styles.checkpointType, { color: c.textMuted }]}>{cp.type === 'Initial' ? 'INITIAL' : `CHECKPOINT ${cp.seq}`}</Text>
                      <Text style={[styles.checkpointName, { color: c.textPrimary }]}>{cp.locationName}</Text>
                      <Text style={[styles.checkpointMeta, { color: c.textMuted }]}>{formatTime(cp.timestamp)} • {cp.operatorDisplayName}{cp.operatorIsReliever ? ' (Reliever)' : ''}</Text>
                      {cp.odometer != null && <Text style={[styles.checkpointOdo, { color: c.blue600 }]}>Odometer: {cp.odometer.toLocaleString()} km</Text>}
                      {cp.odometer == null && cp.odometerExceptionReason && <Text style={[styles.checkpointOdo, { color: c.amber500 }]}>Odo Unavailable: {cp.odometerExceptionReason}</Text>}
                      {cp.gps && <Text style={[styles.checkpointGps, { color: c.emerald500 }]}>GPS: {cp.gps.lat.toFixed(5)}, {cp.gps.lng.toFixed(5)}</Text>}
                    </View>
                  </View>
                ))}
                {totalDistance != null && <DetailRow label="Total Distance" value={`${totalDistance.toLocaleString()} km`} c={c} highlight />}
              </>
            )}
          </View>
        );
      case 'meter':
        return (
          <View style={styles.sectionContent}>
            <DetailRow label="Opening Hour Meter" value={deur.openingMeter != null ? `${deur.openingMeter.toLocaleString()} h` : 'Not Available'} c={c} />
            <DetailRow label="Calculated Closing" value={calculatedClosing != null ? `${calculatedClosing.toLocaleString()} h` : 'Not Available'} c={c} highlight />
            <DetailRow label="Net Operating Hours" value={`${(netOp / 3600000).toFixed(2)} h`} c={c} />
            {hasOdometer && (
              <>
                <DetailRow label="Opening Odometer" value={deur.openingOdometer != null ? `${deur.openingOdometer.toLocaleString()} km` : '---'} c={c} />
                {totalDistance != null && <DetailRow label="Distance Travelled" value={`${totalDistance.toLocaleString()} km`} c={c} highlight />}
              </>
            )}
          </View>
        );
      case 'fuel': {
        const effEntries = mockRepository.getFuelEfficiencyEntries(id);
        return (
          <View style={styles.sectionContent}>
            {deur.fuelEntries.length === 0 ? (
              <Text style={[styles.noData, { color: c.textMuted }]}>No fuel transactions recorded</Text>
            ) : (
              <>
                <DetailRow label="Total Fuel Issued" value={`${totalFuel.toLocaleString()} L`} c={c} highlight />
                {deur.fuelEntries.map((f, i) => {
                  const eff = effEntries.find((e) => e.fuelEntry.id === f.id);
                  return (
                    <View key={f.id}>
                      <View style={[styles.fuelRow, { borderBottomColor: c.slate100 }]}>
                        <Fuel size={14} color={c.blue600} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fuelAdded, { color: c.textPrimary }]}>{f.fuelAdded} L added</Text>
                          <Text style={[styles.fuelOperator, { color: c.textMuted }]}>{f.operatorName} • {formatTime(f.timestamp)}</Text>
                          {f.gaugeBefore != null && <Text style={[styles.fuelGauge, { color: c.textMuted }]}>Before: {f.gaugeBefore}%</Text>}
                          {f.gaugeAfter != null && <Text style={[styles.fuelGauge, { color: c.textMuted }]}>After: {f.gaugeAfter}%</Text>}
                          {f.fuelSlipNumber && <Text style={[styles.fuelGauge, { color: c.textMuted }]}>Slip: {f.fuelSlipNumber}</Text>}
                          {f.odometer != null && <Text style={[styles.fuelGauge, { color: c.blue600 }]}>Odo: {f.odometer.toLocaleString()} km</Text>}
                          {f.odometer == null && f.odometerExceptionReason && <Text style={[styles.fuelGauge, { color: c.amber500 }]}>Odo Unavailable: {f.odometerExceptionReason}</Text>}
                          {eff && eff.distance != null && <Text style={[styles.fuelGauge, { color: c.textSecondary }]}>Distance: {eff.distance.toLocaleString()} km</Text>}
                          {eff && eff.efficiency != null && <Text style={[styles.fuelEfficiency, { color: c.emerald500 }]}>Efficiency: {eff.efficiency.toFixed(2)} km/L</Text>}
                          {eff && eff.warning && <Text style={[styles.fuelWarning, { color: c.amber500 }]}>{eff.warning}</Text>}
                          {f.remarks && <Text style={[styles.fuelRemarks, { color: c.textMuted }]}>{f.remarks}</Text>}
                        </View>
                      </View>
                      {i < deur.fuelEntries.length - 1 && <View style={[styles.divider, { backgroundColor: c.slate100 }]} />}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        );
      }
      case 'remarks':
        return (
          <View style={styles.sectionContent}>
            <Text style={[styles.remarkLabel, { color: c.textSecondary }]}>General Remarks</Text>
            <Text style={[styles.remarkText, { color: c.textPrimary }]}>{deur.remarks || 'No remarks recorded'}</Text>
            {deur.breakdownRemarks ? (
              <>
                <View style={[styles.breakdownHeader, { borderTopColor: c.slate100 }]}>
                  <AlertTriangle size={14} color={c.red500} strokeWidth={2} />
                  <Text style={[styles.breakdownLabel, { color: c.red500 }]}>Breakdown Details</Text>
                </View>
                <Text style={[styles.remarkText, { color: c.textPrimary }]}>{deur.breakdownRemarks}</Text>
              </>
            ) : null}
          </View>
        );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={{ paddingBottom: 20 }}>
      <PageHeader title="DEUR Summary" onBack={handleBack} />
      <View style={styles.content}>
        <SyncBanner status={connectivity} />

        {/* DEUR Number */}
        <View style={[styles.deurNumberBanner, { backgroundColor: c.blue600 }]}>
          <Text style={[styles.deurNumberLabel, { color: c.blue50 }]}>DEUR Number</Text>
          <Text style={styles.deurNumberValue}>{deur.deurNumber}</Text>
        </View>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: isSubmitted ? c.emerald50 : isRejected ? c.dangerBg : c.amber50 }]}>
          <Text style={[styles.statusBannerText, { color: isSubmitted ? c.emerald500 : isRejected ? c.red500 : c.amber500 }]}>
            {isSubmitted ? (deur.status === 'Acknowledged' ? 'DEUR Acknowledged' : 'Submitted — Awaiting Acknowledgement') : isRejected ? 'DEUR Rejected' : 'Review your report before submitting'}
          </Text>
          {isRejected && deur.rejectionReason && <Text style={[styles.rejectionReason, { color: c.red500 }]}>{deur.rejectionReason}</Text>}
        </View>

        {/* Top Summary */}
        <Card>
          <View style={styles.equipmentRow}>
            <View style={[styles.equipmentIcon, { backgroundColor: c.blue50 }]}>
              <Truck size={20} color={c.blue600} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.equipmentName, { color: c.textPrimary }]}>{equipment?.name ?? '---'}</Text>
              <Text style={[styles.assetNumber, { color: c.textMuted }]}>{equipment?.assetNumber ?? '---'} • {rental?.rentalNumber ?? '---'}</Text>
            </View>
            <StatusChip label={deur.status.toUpperCase()} variant={getStatusVariant(deur.status)} />
          </View>
          <View style={styles.infoGrid}>
            <InfoItem label="Shift Date" value={formatDate(deur.date)} c={c} />
            <InfoItem label="Project" value={project?.name ?? '---'} c={c} />
            <InfoItem label="Billing" value={rental?.billingMethod ?? '---'} c={c} />
            <InfoItem label="Shift Start" value={deur.shiftStart ? formatTime(deur.shiftStart) : '---'} c={c} />
            <InfoItem label="Shift End" value={deur.shiftEnd ? formatTime(deur.shiftEnd) : '---'} c={c} />
            <InfoItem label="Total Duration" value={formatDuration(totalShift)} c={c} />
            <InfoItem label="Net Operating" value={formatDuration(netOp)} c={c} />
            <InfoItem label="Total Shift" value={formatDuration(totalShift)} c={c} />
          </View>
          {deur.operatorSegments.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: c.slate100 }]} />
              <Text style={[styles.operatorsSummary, { color: c.textMuted }]}>
                Operators: {deur.operatorSegments.map((s) => `${s.operatorName}${s.isReliever ? ' (R)' : ''}`).join(' → ')}
              </Text>
            </>
          )}
        </Card>

        {/* Accordion sections */}
        {sections.map((s) => (
          <View key={s.key} style={[styles.accordionItem, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggle(s.key)} activeOpacity={0.7}>
              <View style={styles.accordionHeaderLeft}>
                {s.icon}
                <Text style={[styles.accordionLabel, { color: c.textPrimary }]}>{s.label}</Text>
              </View>
              {openSection === s.key ? <ChevronUp size={18} color={c.textMuted} strokeWidth={2} /> : <ChevronDown size={18} color={c.textMuted} strokeWidth={2} />}
            </TouchableOpacity>
            {openSection === s.key && renderSection(s.key)}
          </View>
        ))}

        {/* Actions */}
        {canSubmit && (
          <View style={styles.actions}>
            <Button label="VIEW METER" onPress={() => router.push(`/deur-meter/${deur.id}`)} variant="secondary" style={styles.actionButton} />
            <Button label="SUBMIT DEUR" onPress={() => setShowSubmitConfirm(true)} style={styles.actionButton} />
          </View>
        )}

        {isSubmitted && (
          <Card>
            <Text style={[styles.submittedCardText, { color: c.textMuted }]}>This DEUR has been submitted and is no longer editable.</Text>
          </Card>
        )}

        <ConfirmDialog visible={showSubmitConfirm} title="Submit DEUR?" message="Please verify all details are correct. Once submitted, this report cannot be edited." confirmLabel="Submit" onConfirm={handleSubmit} onCancel={() => setShowSubmitConfirm(false)} />
      </View>
    </ScrollView>
  );
}

function InfoItem({ label, value, c }: { label: string; value: string; c: import('@/lib/theme').ThemeColors }) {
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.infoLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: c.textPrimary }]}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value, c, highlight }: { label: string; value: string; c: import('@/lib/theme').ThemeColors; highlight?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: highlight ? c.blue600 : c.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.medium, fontSize: 15 },
  deurNumberBanner: { borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deurNumberLabel: { fontFamily: fonts.semibold, fontSize: 13 },
  deurNumberValue: { fontFamily: fonts.extrabold, fontSize: 18, color: '#ffffff' },
  statusBanner: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.md, alignItems: 'center', gap: 4 },
  statusBannerText: { fontFamily: fonts.semibold, fontSize: 14 },
  rejectionReason: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
  equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  equipmentIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  equipmentName: { fontFamily: fonts.bold, fontSize: 15 },
  assetNumber: { fontFamily: fonts.regular, fontSize: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  infoItem: { flexBasis: '50%', padding: 12, gap: 2 },
  infoLabel: { fontFamily: fonts.regular, fontSize: 12 },
  infoValue: { fontFamily: fonts.bold, fontSize: 13 },
  divider: { height: 1, marginVertical: 8 },
  operatorsSummary: { fontFamily: fonts.regular, fontSize: 12, paddingTop: 4 },
  accordionItem: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md + 2, paddingHorizontal: spacing.md, minHeight: 52 },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  accordionLabel: { fontFamily: fonts.semibold, fontSize: 15 },
  sectionContent: { padding: spacing.md, paddingTop: 0, gap: 6 },
  segmentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  segmentDot: { width: 10, height: 10, borderRadius: 5 },
  segmentName: { fontFamily: fonts.bold, fontSize: 13 },
  segmentTime: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  detailLabel: { fontFamily: fonts.regular, fontSize: 13 },
  detailValue: { fontFamily: fonts.bold, fontSize: 13 },
  barRow: { gap: 4, paddingVertical: 4 },
  barRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barRowLabel: { fontFamily: fonts.regular, fontSize: 13 },
  barRowValue: { fontFamily: fonts.bold, fontSize: 13 },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { position: 'absolute', left: 4, top: 14, width: 2, bottom: -8 },
  timelineContent: { flex: 1, paddingBottom: 8 },
  timelineActivity: { fontFamily: fonts.bold, fontSize: 13 },
  timelineReason: { fontFamily: fonts.medium, fontSize: 12, marginTop: 1 },
  timelineTime: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  timelineDuration: { fontFamily: fonts.bold, fontSize: 12 },
  checkpointItem: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  checkpointDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  checkpointType: { fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.5 },
  checkpointName: { fontFamily: fonts.bold, fontSize: 14, marginTop: 2 },
  checkpointMeta: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  checkpointOdo: { fontFamily: fonts.semibold, fontSize: 12, marginTop: 1 },
  checkpointGps: { fontFamily: fonts.medium, fontSize: 12, marginTop: 1 },
  fuelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  fuelAdded: { fontFamily: fonts.bold, fontSize: 14 },
  fuelOperator: { fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  fuelGauge: { fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  fuelEfficiency: { fontFamily: fonts.bold, fontSize: 13, marginTop: 2 },
  fuelWarning: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  fuelRemarks: { fontFamily: fonts.regular, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  noData: { fontFamily: fonts.regular, fontSize: 13, paddingVertical: 8 },
  remarkLabel: { fontFamily: fonts.semibold, fontSize: 13, paddingVertical: 4 },
  remarkText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderTopWidth: 1, marginTop: 8 },
  breakdownLabel: { fontFamily: fonts.semibold, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionButton: { flex: 1 },
  submittedCardText: { fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
});
