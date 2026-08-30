import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu as MenuIcon, Square, Users, Gauge, TriangleAlert as AlertTriangle, Navigation, Fuel } from 'lucide-react-native';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { mockRepository } from '@/lib/mockRepository';
import type { ActivityType, Deur } from '@/lib/types';
import { Button } from '@/components/Button';
import { StatusChip } from '@/components/StatusChip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SyncBanner } from '@/components/SyncBanner';
import { DeurDetailsDrawer } from '@/components/DeurDetailsDrawer';
import { useConnectivity } from '@/lib/useConnectivity';
import { spacing, radius } from '@/lib/theme';
import { formatDuration, getActivityColor, getNetOperatingTime, getTotalShiftTime, getStatusVariant } from '@/lib/utils';
import type { ThemeColors } from '@/lib/theme';
import { CanonicalDeurOperatorPanel } from '@/components/CanonicalDeurOperatorPanel';

const ACTS: { type: ActivityType; color: string; bgKey: 'emerald50' | 'amber100' | 'red50' | 'indigo50' }[] = [
  { type: 'Operating', color: '#10b981', bgKey: 'emerald50' },
  { type: 'Waiting', color: '#f59e0b', bgKey: 'amber100' },
  { type: 'Breakdown', color: '#ef4444', bgKey: 'red50' },
  { type: 'Meal Break', color: '#6366f1', bgKey: 'indigo50' },
];

export default function DeurScreen() {
  const router = useRouter();
  const { operator, pendingDeurId, resumeDeur, mode } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [deur, setDeur] = useState<Deur | null>(null);
  const [, setTick] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showTurnOverConfirm, setShowTurnOverConfirm] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [waitingModal, setWaitingModal] = useState(false);
  const [breakdownModal, setBreakdownModal] = useState(false);
  const [breakdownRemarks, setBreakdownRemarks] = useState('');
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const connectivity = useConnectivity();

  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(i); }, []);

  const refreshDeur = useCallback(() => {
    if (!operator) return;
    // Use resumable lookup: open segment → turnover-pending → by assignment/equipment/rental → any today
    const resumable = mockRepository.getResumableDeurForOperator(operator.id);
    if (resumable) {
      setDeur({ ...resumable, activities: [...resumable.activities], fuelEntries: [...resumable.fuelEntries], operatorSegments: [...resumable.operatorSegments], travelCheckpoints: [...resumable.travelCheckpoints] });
      return;
    }
    setDeur(null);
  }, [operator]);

  useEffect(() => { refreshDeur(); }, [refreshDeur]);
  if (operator === undefined) return <View style={[styles.center, { backgroundColor: c.background }]}><ActivityIndicator size="large" color={c.blue600} /></View>;
  if (!operator) return <Redirect href="/login" />;
  if (mode === 'UAT') return <CanonicalDeurOperatorPanel />;

  // Resolve assignment/rental/equipment from the DEUR first, then fallback to operator's own
  const lookupDeur = deur;
  const assignment = (lookupDeur ? mockRepository.getAssignmentForDeur(lookupDeur.id) : null) ?? mockRepository.getOperatorAssignment(operator.id);
  const rental = (lookupDeur ? mockRepository.getRentalForDeur(lookupDeur.id) : null) ?? mockRepository.getRentalForOperator(operator.id);
  let equipment = assignment ? mockRepository.getEquipment(assignment.equipmentId) : null;
  let project = assignment ? mockRepository.getProject(assignment.projectId) : null;
  let activeRental = rental;
  if (!equipment && lookupDeur) { equipment = mockRepository.getEquipment(lookupDeur.equipmentId); project = mockRepository.getProject(lookupDeur.projectId); activeRental = mockRepository.getRental(lookupDeur.rentalId); }
  if (!equipment || !project || !activeRental) return <View style={[styles.center, { backgroundColor: c.background }]}><Text style={[styles.emptyText, { color: c.textMuted }]}>No active assignment found.</Text></View>;

  const handleStart = () => {
    if (!operator || !assignment || !activeRental) return;
    // Guard: do not create if an Active DEUR already exists for this equipment/rental
    const existing = mockRepository.getActiveDeurForEquipmentRental(assignment.equipmentId, activeRental.id);
    if (existing) {
      setDeur({ ...existing, activities: [...existing.activities], fuelEntries: [...existing.fuelEntries], operatorSegments: [...existing.operatorSegments], travelCheckpoints: [...existing.travelCheckpoints] });
      setShowStartConfirm(false);
      return;
    }
    const d = mockRepository.createDeur({ operatorId: operator.id, operatorName: operator.name, equipmentId: assignment.equipmentId, assignmentId: assignment.id, rentalId: activeRental.id, projectId: assignment.projectId, openingMeter: equipment?.hourMeter ?? null, openingOdometer: equipment?.hasOdometer ? equipment.hourMeter : null, isReliever: operator.isReliever });
    setDeur({ ...d, activities: [...d.activities], fuelEntries: [...d.fuelEntries], operatorSegments: [...d.operatorSegments], travelCheckpoints: [...d.travelCheckpoints] }); setShowStartConfirm(false);
  };

  const handleActivity = (act: ActivityType) => {
    if (!deur) return;
    if (deur.status !== 'Active') return;
    if (act === 'Waiting') { setWaitingModal(true); return; }
    if (act === 'Breakdown') { setBreakdownRemarks(''); setBreakdownModal(true); return; }
    const u = mockRepository.startActivity(deur.id, act); if (u) setDeur(u);
  };

  const handleWaitingReason = (reason: string) => { if (!deur) return; const u = mockRepository.startActivity(deur.id, 'Waiting', reason); if (u) setDeur(u); setWaitingModal(false); };
  const handleBreakdownCat = (cat: string) => { if (!deur) return; const u = mockRepository.startActivity(deur.id, 'Breakdown', undefined, cat); if (u) setDeur(u); setBreakdownModal(false); setBreakdownRemarks(''); };
  const handleEndShift = () => { if (!deur) return; const u = mockRepository.endShift(deur.id); if (u) { setDeur({ ...u, activities: [...u.activities], fuelEntries: [...u.fuelEntries], operatorSegments: [...u.operatorSegments], travelCheckpoints: [...u.travelCheckpoints] }); setShowEndConfirm(false); router.push(`/deur-summary/${u.id}`); } };
  const handleTurnOver = () => { if (!deur) return; setShowTurnOverConfirm(false); router.push(`/turnover-login?deurId=${deur.id}`); };
  const handleResume = () => {
    if (!deur || !operator) return;
    const ok = resumeDeur(deur.id);
    if (ok) {
      setShowResumeConfirm(false);
      refreshDeur();
    }
  };

  // No DEUR yet — check if we can start new (guard against active DEUR for same equipment/rental)
  const canStart = mockRepository.canStartNewDeur(operator.id);
  if (!deur) return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.xxxl + 80 + insets.bottom }]}>
      <View style={styles.header}><Text style={[styles.screenTitle, { color: c.textPrimary }]}>Digital DEUR</Text><Text style={[styles.screenSubtitle, { color: c.textMuted }]}>Daily Equipment Utilization Report</Text></View>
      <SyncBanner status={connectivity} />
      <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
        <View style={styles.eqRow}><View style={[styles.eqIcon, { backgroundColor: c.blue50 }]}><Gauge size={20} color={c.blue600} strokeWidth={2} /></View><View style={{ flex: 1 }}><Text style={[styles.eqName, { color: c.textPrimary }]}>{equipment.name}</Text><Text style={[styles.eqAsset, { color: c.textMuted }]}>{equipment.assetNumber}</Text></View></View>
        <View style={styles.infoGrid}><InfoItem label="Rental" value={activeRental.rentalNumber} c={c} /><InfoItem label="Billing" value={activeRental.billingMethod} c={c} /><InfoItem label="Project" value={project.name} c={c} /><InfoItem label="Operator" value={operator.name} c={c} /></View>
      </View>
      <View style={[styles.meterCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}><View style={styles.meterRow}><Gauge size={18} color={c.textMuted} strokeWidth={2} /><Text style={[styles.meterLabel, { color: c.textSecondary }]}>Opening Hour Meter</Text><Text style={[styles.meterValue, { color: c.textPrimary }]}>{equipment.hourMeter.toLocaleString()} h</Text></View></View>
      {canStart ? (
        <View style={styles.startSection}><Text style={[styles.startHint, { color: c.textPrimary }]}>No DEUR has been started for today.</Text><Text style={[styles.startHintSub, { color: c.textMuted }]}>Starting a shift will create a new DEUR record and begin tracking your activity.</Text><Button label="START DEUR" onPress={() => setShowStartConfirm(true)} style={styles.cta} /></View>
      ) : (
        <View style={styles.startSection}><Text style={[styles.startHint, { color: c.textPrimary }]}>An active DEUR already exists for this equipment.</Text><Text style={[styles.startHintSub, { color: c.textMuted }]}>You cannot start a new DEUR until the current one is submitted.</Text></View>
      )}
      <ConfirmDialog visible={showStartConfirm} title="Start DEUR?" message="This will begin a new shift and start tracking your equipment activity for today." confirmLabel="Start Shift" onConfirm={handleStart} onCancel={() => setShowStartConfirm(false)} />
    </ScrollView>
  );

  const currentActivity = deur.activities.find((a) => a.endTime === null) ?? null;
  const isActive = deur.status === 'Active';
  const isTurnoverPending = deur.status === 'Active' && deur.turnoverPending === true;
  const isSubmitted = deur.status === 'Submitted' || deur.status === 'Waiting Acknowledgement' || deur.status === 'Acknowledged';
  const netOp = getNetOperatingTime(deur);
  const totalShift = getTotalShiftTime(deur);
  const waitingReasons = mockRepository.getWaitingReasons();
  const breakdownCats = mockRepository.getBreakdownCategories();
  const currentColor = currentActivity ? getActivityColor(currentActivity.activity) : c.slate300;
  const currentReason = currentActivity?.reason ?? currentActivity?.category;

  const previousSegment = deur.operatorSegments.length > 0 ? deur.operatorSegments[deur.operatorSegments.length - 1] : null;

  // TURNOVER-PENDING: show review/resume screen
  if (isTurnoverPending) return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.xxxl + 80 + insets.bottom }]}>
      <View style={styles.header}><Text style={[styles.screenTitle, { color: c.textPrimary }]}>Active DEUR Available</Text><Text style={[styles.screenSubtitle, { color: c.textMuted }]}>Review and resume the turned-over DEUR</Text></View>
      <SyncBanner status={connectivity} />
      <View style={[styles.deurNumberBanner, { backgroundColor: c.blue600 }]}>
        <Text style={[styles.deurNumberLabel, { color: c.blue50 }]}>DEUR Number</Text>
        <Text style={styles.deurNumberValue}>{deur.deurNumber}</Text>
      </View>
      <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
        <View style={styles.eqRow}><View style={[styles.eqIcon, { backgroundColor: c.blue50 }]}><Gauge size={20} color={c.blue600} strokeWidth={2} /></View><View style={{ flex: 1 }}><Text style={[styles.eqName, { color: c.textPrimary }]}>{equipment.name}</Text><Text style={[styles.eqAsset, { color: c.textMuted }]}>{equipment.assetNumber}</Text></View><StatusChip label="ACTIVE" variant="emerald" /></View>
        <View style={styles.infoGrid}><InfoItem label="Project" value={project.name} c={c} /><InfoItem label="Rental" value={activeRental.rentalNumber} c={c} /></View>
      </View>
      {previousSegment && (
        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
          <Text style={[styles.turnoverLabel, { color: c.textMuted }]}>Turned over by</Text>
          <Text style={[styles.turnoverName, { color: c.textPrimary }]}>{previousSegment.operatorName}{previousSegment.isReliever ? ' (Reliever)' : ''}</Text>
          <Text style={[styles.turnoverTime, { color: c.textMuted }]}>{deur.turnoverTimestamp ? new Date(deur.turnoverTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '---'}</Text>
        </View>
      )}
      <View style={[styles.statusBanner, { backgroundColor: c.amber50 }]}><Text style={[styles.statusBannerText, { color: c.amber500 }]}>AWAITING RESUME</Text></View>
      <View style={styles.resumeActions}>
        <Button label="REVIEW ACTIVE DEUR" onPress={() => router.push(`/deur-summary/${deur.id}`)} variant="secondary" style={styles.cta} />
        <Button label="RESUME OPERATION" onPress={() => setShowResumeConfirm(true)} style={styles.cta} />
      </View>
      <ConfirmDialog visible={showResumeConfirm} title="Resume Operation?" message="You will continue this active DEUR. A new operator segment will begin and you can select your activity." confirmLabel="Resume" onConfirm={handleResume} onCancel={() => setShowResumeConfirm(false)} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.hmiContainer}>
        {/* HEADER */}
        <View style={[styles.hmiHeader, { backgroundColor: c.surface, borderBottomColor: c.surfaceBorder }]}>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[styles.hmiDeurNumber, { color: c.blue600 }]}>{deur.deurNumber}</Text>
            <Text style={[styles.hmiEquipment, { color: c.textPrimary }]} numberOfLines={1}>{equipment.name}</Text>
            <Text style={[styles.hmiAsset, { color: c.textMuted }]}>{equipment.assetNumber} • {operator.name}{operator.isReliever ? ' (Reliever)' : ''}</Text>
          </View>
          <View style={styles.hmiHeaderRight}>
            <StatusChip label={deur.status.toUpperCase()} variant={getStatusVariant(deur.status)} />
            {isActive && <TouchableOpacity onPress={() => setDrawerVisible(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><View style={[styles.menuButton, { backgroundColor: c.blue50 }]}><MenuIcon size={20} color={c.blue600} strokeWidth={2} /></View></TouchableOpacity>}
          </View>
        </View>

        {isSubmitted ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, gap: spacing.md }}>
            <View style={[styles.submittedBanner, { backgroundColor: c.blue50 }]}><Text style={[styles.submittedText, { color: c.blue600 }]}>{deur.status === 'Acknowledged' ? 'DEUR Acknowledged' : 'DEUR Submitted — Awaiting Acknowledgement'}</Text></View>
            <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}><View style={styles.infoGrid}><InfoItem label="Net Operating" value={formatDuration(netOp)} c={c} /><InfoItem label="Total Shift" value={formatDuration(totalShift)} c={c} /></View></View>
            <Button label="VIEW SUMMARY" onPress={() => router.push(`/deur-summary/${deur.id}`)} variant="secondary" />
            {assignment?.status === 'Active' && <Button label="START NEW DEUR" onPress={() => setShowStartConfirm(true)} />}
            <ConfirmDialog visible={showStartConfirm} title="Start New DEUR?" message="This will create a new DEUR record for today." confirmLabel="Start" onConfirm={handleStart} onCancel={() => setShowStartConfirm(false)} />
          </ScrollView>
        ) : deur.status === 'Ended' ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, gap: spacing.md, justifyContent: 'center' }}>
            <View style={[styles.endedBanner, { backgroundColor: c.amber50 }]}><Text style={[styles.endedText, { color: c.amber500 }]}>Shift Ended</Text><Text style={[styles.endedSub, { color: c.textMuted }]}>Review and submit your DEUR</Text></View>
            <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}><View style={styles.infoGrid}><InfoItem label="Net Operating" value={formatDuration(netOp)} c={c} /><InfoItem label="Total Shift" value={formatDuration(totalShift)} c={c} /></View></View>
            <Button label="REVIEW & SUBMIT" onPress={() => router.push(`/deur-summary/${deur.id}`)} />
          </ScrollView>
        ) : deur.status === 'Rejected' ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, gap: spacing.md }}>
            <View style={[styles.rejectedBanner, { backgroundColor: c.dangerBg }]}><AlertTriangle size={20} color={c.red500} strokeWidth={2} /><Text style={[styles.rejectedText, { color: c.red500 }]}>DEUR Rejected</Text></View>
            {deur.rejectionReason && <Text style={[styles.rejectionReason, { color: c.textMuted }]}>{deur.rejectionReason}</Text>}
            <Button label="VIEW SUMMARY" onPress={() => router.push(`/deur-summary/${deur.id}`)} variant="secondary" />
            <Button label="START NEW DEUR" onPress={() => setShowStartConfirm(true)} />
            <ConfirmDialog visible={showStartConfirm} title="Start New DEUR?" message="This will create a new DEUR record for today." confirmLabel="Start" onConfirm={handleStart} onCancel={() => setShowStartConfirm(false)} />
          </ScrollView>
        ) : (
          /* ACTIVE HMI */
          <View style={styles.hmiBody}>
            <View style={[styles.currentBox, { backgroundColor: c.surface, borderColor: currentColor }]}>
              <Text style={[styles.currentLabel, { color: c.textMuted }]}>CURRENT ACTIVITY</Text>
              <Text style={[styles.currentName, { color: currentColor }]}>{currentActivity ? currentActivity.activity.toUpperCase() : 'IDLE'}</Text>
              {currentReason ? <Text style={[styles.currentReason, { color: c.textSecondary }]}>{currentReason}</Text> : null}
              <Text style={[styles.currentDuration, { color: c.textPrimary }]}>{currentActivity ? formatDuration(Date.now() - new Date(currentActivity.startTime).getTime()) : '00:00:00'}</Text>
            </View>

            <View style={styles.activityGrid}>
              {ACTS.map((act) => {
                const isCur = currentActivity?.activity === act.type;
                return <TouchableOpacity key={act.type} onPress={() => handleActivity(act.type)} style={[styles.actBtn, { backgroundColor: isCur ? act.color : c[act.bgKey], borderColor: isCur ? act.color : c.surfaceBorder }]} activeOpacity={0.7}><Text style={[styles.actBtnText, { color: isCur ? c.white : act.color }]}>{act.type}</Text></TouchableOpacity>;
              })}
            </View>

            <View style={[styles.metricsRow, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}>
              <View style={styles.metricBox}><Text style={[styles.metricLabel, { color: c.textMuted }]}>Net Operating</Text><Text style={[styles.metricValue, { color: c.emerald500 }]}>{formatDuration(netOp)}</Text></View>
              <View style={[styles.metricDivider, { backgroundColor: c.surfaceBorder }]} />
              <View style={styles.metricBox}><Text style={[styles.metricLabel, { color: c.textMuted }]}>Total Shift</Text><Text style={[styles.metricValue, { color: c.blue600 }]}>{formatDuration(totalShift)}</Text></View>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.emerald50, borderColor: c.emerald500 }]} onPress={() => router.push(`/deur-travel/${deur.id}`)} activeOpacity={0.7}><Navigation size={16} color={c.emerald500} strokeWidth={2} /><Text style={[styles.quickBtnText, { color: c.emerald500 }]}>TRAVEL</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.blue50, borderColor: c.blue600 }]} onPress={() => router.push(`/deur-fuel/${deur.id}`)} activeOpacity={0.7}><Fuel size={16} color={c.blue600} strokeWidth={2} /><Text style={[styles.quickBtnText, { color: c.blue600 }]}>FUEL</Text></TouchableOpacity>
            </View>

            <View style={styles.bottomActions}>
              <TouchableOpacity style={[styles.turnOverBtn, { backgroundColor: c.blue50, borderColor: c.blue600 }]} onPress={() => setShowTurnOverConfirm(true)} activeOpacity={0.7}><Users size={18} color={c.blue600} strokeWidth={2} /><Text style={[styles.turnOverText, { color: c.blue600 }]}>TURN OVER</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.endShiftBtn, { backgroundColor: c.red500 }]} onPress={() => setShowEndConfirm(true)} activeOpacity={0.7}><Square size={18} color={c.white} strokeWidth={2} fill={c.white} /><Text style={[styles.endShiftText, { color: c.white }]}>END SHIFT</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <DeurDetailsDrawer visible={drawerVisible} deur={deur} onClose={() => setDrawerVisible(false)} onNavigate={(r) => { setDrawerVisible(false); router.push(r as never); }} />
      <ConfirmDialog visible={showEndConfirm} title="End Shift?" message="This will stop the current activity and end your shift. You will be taken to the DEUR summary for review." confirmLabel="End Shift" onConfirm={handleEndShift} onCancel={() => setShowEndConfirm(false)} danger />
      <ConfirmDialog visible={showTurnOverConfirm} title="Turn Over Shift?" message="Your segment will end and the DEUR will remain active. Another operator will log in to continue this same DEUR." confirmLabel="Turn Over" onConfirm={handleTurnOver} onCancel={() => setShowTurnOverConfirm(false)} />

      <Modal visible={waitingModal} transparent animationType="fade" onRequestClose={() => setWaitingModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}><View style={[styles.modalContent, { backgroundColor: c.surface }]}>
          <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Select Waiting Reason</Text>
          <ScrollView style={styles.reasonList}>{waitingReasons.map((r) => <TouchableOpacity key={r.id} style={[styles.reasonItem, { borderBottomColor: c.slate100 }]} onPress={() => handleWaitingReason(r.label)} activeOpacity={0.7}><Text style={[styles.reasonItemText, { color: c.textPrimary }]}>{r.label}</Text></TouchableOpacity>)}</ScrollView>
          <Button label="Cancel" onPress={() => setWaitingModal(false)} variant="ghost" />
        </View></View>
      </Modal>

      <Modal visible={breakdownModal} transparent animationType="fade" onRequestClose={() => setBreakdownModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}><View style={[styles.modalContent, { backgroundColor: c.surface }]}>
          <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Select Breakdown Category</Text>
          <ScrollView style={styles.reasonList}>{breakdownCats.map((cat) => <TouchableOpacity key={cat.id} style={[styles.reasonItem, { borderBottomColor: c.slate100 }]} onPress={() => handleBreakdownCat(cat.label)} activeOpacity={0.7}><Text style={[styles.reasonItemText, { color: c.textPrimary }]}>{cat.label}</Text></TouchableOpacity>)}</ScrollView>
          <View style={styles.modalField}><Text style={[styles.modalFieldLabel, { color: c.textSecondary }]}>Optional Remarks</Text><TextInput style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]} value={breakdownRemarks} onChangeText={setBreakdownRemarks} placeholder="Describe the issue..." placeholderTextColor={c.textMuted} multiline numberOfLines={2} textAlignVertical="top" /></View>
          <Button label="Cancel" onPress={() => setBreakdownModal(false)} variant="ghost" />
        </View></View>
      </Modal>
    </View>
  );
}

function InfoItem({ label, value, c }: { label: string; value: string; c: ThemeColors }) {
  return <View style={styles.infoItem}><Text style={[styles.infoLabel, { color: c.textMuted }]}>{label}</Text><Text style={[styles.infoValue, { color: c.textPrimary }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl + 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontFamily: 'Manrope-Medium', fontSize: 15 },
  header: { gap: 4, marginBottom: spacing.sm },
  screenTitle: { fontFamily: 'Manrope-ExtraBold', fontSize: 24 },
  screenSubtitle: { fontFamily: 'Manrope-Medium', fontSize: 13 },
  infoCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  eqRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eqIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  eqName: { fontFamily: 'Manrope-Bold', fontSize: 15 },
  eqAsset: { fontFamily: 'Manrope-Regular', fontSize: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  infoItem: { flexBasis: '47%', gap: 2 },
  infoLabel: { fontFamily: 'Manrope-Regular', fontSize: 12 },
  infoValue: { fontFamily: 'Manrope-Bold', fontSize: 13 },
  meterCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 8 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterLabel: { flex: 1, fontFamily: 'Manrope-Medium', fontSize: 13 },
  meterValue: { fontFamily: 'Manrope-Bold', fontSize: 15 },
  startSection: { gap: 12, alignItems: 'center', paddingVertical: spacing.xl },
  startHint: { fontFamily: 'Manrope-Bold', fontSize: 16, textAlign: 'center' },
  startHintSub: { fontFamily: 'Manrope-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  cta: { width: '100%' },
  resumeActions: { gap: 12, alignItems: 'center', paddingVertical: spacing.md },
  deurNumberBanner: { borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deurNumberLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  deurNumberValue: { fontFamily: 'Manrope-ExtraBold', fontSize: 18, color: '#ffffff' },
  turnoverLabel: { fontFamily: 'Manrope-Regular', fontSize: 12 },
  turnoverName: { fontFamily: 'Manrope-Bold', fontSize: 15, marginTop: 2 },
  turnoverTime: { fontFamily: 'Manrope-Regular', fontSize: 13, marginTop: 2 },
  statusBanner: { borderRadius: radius.md, paddingVertical: spacing.md + 4, paddingHorizontal: spacing.lg, alignItems: 'center' },
  statusBannerText: { fontFamily: 'Manrope-ExtraBold', fontSize: 14, letterSpacing: 1 },
  hmiContainer: { flex: 1 },
  hmiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, gap: 8 },
  hmiDeurNumber: { fontFamily: 'Manrope-ExtraBold', fontSize: 16 },
  hmiEquipment: { fontFamily: 'Manrope-Bold', fontSize: 13 },
  hmiAsset: { fontFamily: 'Manrope-Regular', fontSize: 11 },
  hmiHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuButton: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  hmiBody: { flex: 1, padding: spacing.md, gap: spacing.md, justifyContent: 'space-between', paddingBottom: spacing.xl + 24 },
  currentBox: { borderRadius: radius.lg, borderWidth: 2, paddingVertical: spacing.lg, alignItems: 'center', gap: 4 },
  currentLabel: { fontFamily: 'Manrope-ExtraBold', fontSize: 11, letterSpacing: 1 },
  currentName: { fontFamily: 'Manrope-ExtraBold', fontSize: 24 },
  currentReason: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  currentDuration: { fontFamily: 'Manrope-ExtraBold', fontSize: 32, marginTop: 4 },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actBtn: { flexBasis: '48%', minHeight: 56, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  actBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15 },
  metricsRow: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.md },
  metricBox: { flex: 1, alignItems: 'center', gap: 2 },
  metricDivider: { width: 1, height: '80%' },
  metricLabel: { fontFamily: 'Manrope-Regular', fontSize: 12 },
  metricValue: { fontFamily: 'Manrope-Bold', fontSize: 16 },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: spacing.sm + 2, borderWidth: 1.5, minHeight: 44 },
  quickBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13 },
  bottomActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  turnOverBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, paddingVertical: spacing.md, minHeight: 52, borderWidth: 1.5 },
  turnOverText: { fontFamily: 'Manrope-Bold', fontSize: 14 },
  endShiftBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, paddingVertical: spacing.md, minHeight: 52 },
  endShiftText: { fontFamily: 'Manrope-Bold', fontSize: 14 },
  submittedBanner: { borderRadius: radius.md, paddingVertical: spacing.md + 4, paddingHorizontal: spacing.lg, alignItems: 'center' },
  submittedText: { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
  endedBanner: { borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', gap: 4 },
  endedText: { fontFamily: 'Manrope-ExtraBold', fontSize: 18 },
  endedSub: { fontFamily: 'Manrope-Regular', fontSize: 13 },
  rejectedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, paddingVertical: spacing.md + 4 },
  rejectedText: { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
  rejectionReason: { fontFamily: 'Manrope-Regular', fontSize: 13, textAlign: 'center' },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalContent: { borderRadius: radius.xxl, padding: spacing.xl, width: '100%', maxWidth: 360, gap: spacing.md },
  modalTitle: { fontFamily: 'Manrope-ExtraBold', fontSize: 18, textAlign: 'center' },
  reasonList: { maxHeight: 300 },
  reasonItem: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.md, borderRadius: radius.md, borderBottomWidth: 1, minHeight: 52, justifyContent: 'center' },
  reasonItemText: { fontFamily: 'Manrope-SemiBold', fontSize: 15 },
  modalField: { gap: 6 },
  modalFieldLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  modalInput: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Manrope-Regular', fontSize: 14, minHeight: 60 },
});
