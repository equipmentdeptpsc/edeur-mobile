import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Truck, MapPin, FileText, ChevronRight, Wifi } from 'lucide-react-native';
import { fonts, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { mockRepository } from '@/lib/mockRepository';
import { Card } from '@/components/Card';
import { StatusChip } from '@/components/StatusChip';
import { Button } from '@/components/Button';
import { SyncBanner } from '@/components/SyncBanner';
import { useConnectivity } from '@/lib/useConnectivity';
import { getTotalShiftTime, getNetOperatingTime, getGrossTime, formatDurationShort, formatDate, getStatusVariant } from '@/lib/utils';

export default function HomeScreen() {
  const router = useRouter();
  const { operator, canonicalWork, mode } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const connectivity = useConnectivity();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (!operator) return null;
  if (mode === 'UAT') return <CanonicalHome operatorName={operator.name} work={canonicalWork} colors={c} insets={insets} />;

  // Use resumable lookup for active DEUR (finds turnover-pending too)
  const activeDeur = mockRepository.getResumableDeurForOperator(operator.id);
  const submittedDeur = mockRepository.getLatestSubmittedDeur(operator.id);
  const deurForLookup = activeDeur ?? submittedDeur;
  const assignment = (deurForLookup ? mockRepository.getAssignmentForDeur(deurForLookup.id) : null) ?? mockRepository.getOperatorAssignment(operator.id);
  const equipment = assignment ? mockRepository.getEquipment(assignment.equipmentId) : null;
  const project = assignment ? mockRepository.getProject(assignment.projectId) : null;
  const rental = (deurForLookup ? mockRepository.getRentalForDeur(deurForLookup.id) : null) ?? mockRepository.getRentalForOperator(operator.id);
  const displayDeur = deurForLookup;
  const isTurnoverPending = activeDeur?.turnoverPending === true;

  const history = mockRepository.getDeurHistory(operator.id).slice(0, 3);

  const totals = displayDeur ? { net: getNetOperatingTime(displayDeur), gross: getGrossTime(displayDeur), total: getTotalShiftTime(displayDeur) } : null;

  const getCtaLabel = () => {
    if (!displayDeur) return 'START DEUR';
    if (displayDeur.status === 'Active') return isTurnoverPending ? 'REVIEW ACTIVE DEUR' : 'CONTINUE DEUR';
    if (displayDeur.status === 'Ended') return 'REVIEW DEUR';
    if (displayDeur.status === 'Submitted' || displayDeur.status === 'Waiting Acknowledgement' || displayDeur.status === 'Acknowledged') return 'VIEW SUBMITTED';
    return 'VIEW DEUR';
  };

  const handleCta = () => {
    // Active DEUR → go to DEUR tab (HMI or review/resume)
    // Submitted/Ended DEUR → go to read-only details using the correct ID
    if (displayDeur && displayDeur.status === 'Active') {
      router.push('/deur');
    } else if (displayDeur && (displayDeur.status === 'Submitted' || displayDeur.status === 'Waiting Acknowledgement' || displayDeur.status === 'Acknowledged' || displayDeur.status === 'Rejected')) {
      router.push(`/deur-details/${displayDeur.id}`);
    } else if (displayDeur && displayDeur.status === 'Ended') {
      router.push(`/deur-summary/${displayDeur.id}`);
    } else {
      router.push('/deur');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.xxxl + 80 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: c.textMuted }]}>Good day,</Text>
          <Text style={[styles.operatorName, { color: c.textPrimary }]}>{operator.name}</Text>
          {operator.isReliever && <Text style={[styles.relieverBadge, { color: c.amber500 }]}>Reliever Operator</Text>}
        </View>
        <View style={[styles.syncBadge, { backgroundColor: c.emerald50 }]}>
          <Wifi size={14} color={c.emerald500} strokeWidth={2} />
          <Text style={[styles.syncText, { color: c.emerald500 }]}>Online</Text>
        </View>
      </View>

      <Text style={[styles.dateText, { color: c.textMuted }]}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
      </Text>

      <SyncBanner status={connectivity} />

      {displayDeur && (
        <View style={[styles.deurNumberBanner, { backgroundColor: isTurnoverPending ? c.amber500 : c.blue600 }]}>
          <Text style={[styles.deurNumberLabel, { color: isTurnoverPending ? c.white : c.blue50 }]}>DEUR Number</Text>
          <Text style={[styles.deurNumberValue, { color: c.white }]}>{displayDeur.deurNumber}</Text>
        </View>
      )}

      {isTurnoverPending && (
        <View style={[styles.turnoverBanner, { backgroundColor: c.amber50 }]}>
          <Text style={[styles.turnoverBannerText, { color: c.amber500 }]}>AWAITING RESUME — Turned-over DEUR is ready for you</Text>
        </View>
      )}

      {equipment && project && rental ? (
        <>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>CURRENT ASSIGNMENT</Text>
          <TouchableOpacity onPress={() => router.push('/assignment')} activeOpacity={0.7}>
          <Card style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View style={[styles.equipmentIcon, { backgroundColor: c.blue50 }]}>
                <Truck size={20} color={c.blue600} strokeWidth={2} />
              </View>
              <View style={styles.assignmentInfo}>
                <Text style={[styles.equipmentName, { color: c.textPrimary }]}>{equipment.name}</Text>
                <Text style={[styles.assetNumber, { color: c.textMuted }]}>{equipment.assetNumber}</Text>
              </View>
              <StatusChip label={rental.status.toUpperCase()} variant="blue" />
            </View>
            <View style={styles.assignmentDetails}>
              <View style={styles.detailRow}>
                <MapPin size={14} color={c.textMuted} strokeWidth={2} />
                <Text style={[styles.detailText, { color: c.textSecondary }]}>{project.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <FileText size={14} color={c.textMuted} strokeWidth={2} />
                <Text style={[styles.detailText, { color: c.textSecondary }]}>{rental.rentalNumber} • {rental.billingMethod}</Text>
              </View>
            </View>
          </Card>
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>TODAY&apos;S SUMMARY</Text>
          <View style={styles.totalsGrid}>
            <Card style={styles.totalCard}>
              <Text style={[styles.totalValue, { color: c.textPrimary }]}>{formatDurationShort(totals?.net ?? 0)}</Text>
              <Text style={[styles.totalLabel, { color: c.emerald500 }]}>Net Op</Text>
            </Card>
            <Card style={styles.totalCard}>
              <Text style={[styles.totalValue, { color: c.textPrimary }]}>{formatDurationShort(totals?.gross ?? 0)}</Text>
              <Text style={[styles.totalLabel, { color: c.amber500 }]}>Gross</Text>
            </Card>
            <Card style={styles.totalCard}>
              <Text style={[styles.totalValue, { color: c.textPrimary }]}>{formatDurationShort(totals?.total ?? 0)}</Text>
              <Text style={[styles.totalLabel, { color: c.blue600 }]}>Total Shift</Text>
            </Card>
          </View>

          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>SHIFT STATUS</Text>
          <Card style={styles.shiftCard}>
            <View style={styles.shiftRow}>
              <Text style={[styles.shiftLabel, { color: c.textPrimary }]}>Current DEUR</Text>
              <StatusChip
                label={displayDeur ? displayDeur.status.toUpperCase() : 'NOT STARTED'}
                variant={displayDeur ? getStatusVariant(displayDeur.status) : 'slate'}
              />
            </View>
          </Card>

          {displayDeur?.status !== 'Submitted' && displayDeur?.status !== 'Waiting Acknowledgement' && displayDeur?.status !== 'Acknowledged' && (
            <Button
              label={getCtaLabel()}
              onPress={handleCta}
              style={styles.ctaButton}
            />
          )}
          {displayDeur && (displayDeur.status === 'Submitted' || displayDeur.status === 'Waiting Acknowledgement' || displayDeur.status === 'Acknowledged') && (
            <Button
              label={getCtaLabel()}
              onPress={handleCta}
              variant="secondary"
              style={styles.ctaButton}
            />
          )}

          {history.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: c.textMuted }]}>RECENT DEUR RECORDS</Text>
              <View style={styles.historyList}>
                {history.map((d) => {
                  const eq = mockRepository.getEquipment(d.equipmentId);
                  const rnt = mockRepository.getRental(d.rentalId);
                  const isSubmittedRecord = d.status === 'Submitted' || d.status === 'Waiting Acknowledgement' || d.status === 'Acknowledged' || d.status === 'Rejected';
                  return (
                    <Card key={d.id} style={styles.historyCard}>
                      <TouchableOpacity
                        style={styles.historyItem}
                        onPress={() => router.push(isSubmittedRecord ? `/deur-details/${d.id}` : `/deur-summary/${d.id}`)}
                      >
                        <View style={styles.historyLeft}>
                          <Text style={[styles.historyDate, { color: c.textPrimary }]}>{formatDate(d.date)}</Text>
                          <Text style={[styles.historyDeurNumber, { color: c.blue600 }]}>{d.deurNumber}</Text>
                          <Text style={[styles.historyEquipment, { color: c.textSecondary }]}>{eq?.name ?? 'Unknown'}</Text>
                          <Text style={[styles.historyRental, { color: c.textMuted }]}>{rnt?.rentalNumber ?? '---'}</Text>
                        </View>
                        <View style={styles.historyRight}>
                          <StatusChip
                            label={d.status.toUpperCase()}
                            variant={getStatusVariant(d.status)}
                          />
                          <ChevronRight size={18} color={c.slate300} strokeWidth={2} />
                        </View>
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </View>
            </>
          )}
        </>
      ) : (
        <Card style={styles.noAssignment}>
          <Text style={[styles.noAssignmentText, { color: c.textPrimary }]}>No active assignment found.</Text>
          <Text style={[styles.noAssignmentSub, { color: c.textMuted }]}>Contact your supervisor to get assigned to equipment.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function CanonicalHome({operatorName,work,colors:c,insets}:{operatorName:string;work:import('@/lib/canonical/contracts.generated').CanonicalOperatorWork|null;colors:ReturnType<typeof useTheme>['colors'];insets:{top:number;bottom:number}}){
 return <ScrollView style={[styles.container,{backgroundColor:c.background}]} contentContainerStyle={[styles.content,{paddingTop:spacing.lg+insets.top,paddingBottom:spacing.xxxl+insets.bottom}]}>
  <View style={styles.header}><View><Text style={[styles.greeting,{color:c.textMuted}]}>Canonical UAT session</Text><Text style={[styles.operatorName,{color:c.textPrimary}]}>{operatorName}</Text></View><View style={[styles.syncBadge,{backgroundColor:c.emerald50}]}><Wifi size={14} color={c.emerald500}/><Text style={[styles.syncText,{color:c.emerald500}]}>Server</Text></View></View>
  {work?<><Text style={[styles.sectionLabel,{color:c.textMuted}]}>AUTHORIZED CURRENT WORK</Text><Card style={styles.assignmentCard}><Text style={[styles.equipmentName,{color:c.textPrimary}]}>{work.equipment.name}</Text><Text style={[styles.assetNumber,{color:c.textMuted}]}>{work.equipment.assetNumber}</Text><Text style={[styles.detailText,{color:c.textSecondary}]}>{work.rental.rentalNumber}</Text><Text style={[styles.detailText,{color:c.textSecondary}]}>Assignment: {work.assignment.status}</Text>{work.rental.billingMethod?<Text style={[styles.detailText,{color:c.textSecondary}]}>Billing method: {work.rental.billingMethod}</Text>:null}</Card>{work.openDeur?<View style={[styles.deurNumberBanner,{backgroundColor:c.blue600}]}><Text style={[styles.deurNumberLabel,{color:c.blue50}]}>OPEN DEUR · {work.openDeur.workDate}</Text><Text style={[styles.deurNumberValue,{color:c.white}]}>{work.openDeur.deurNumber}</Text></View>:<Card style={styles.noAssignment}><Text style={[styles.noAssignmentText,{color:c.textPrimary}]}>No open DEUR.</Text><Text style={[styles.noAssignmentSub,{color:c.textMuted}]}>Open the Digital DEUR tab to start through the canonical service.</Text></Card>}</>:<Card style={styles.noAssignment}><Text style={[styles.noAssignmentText,{color:c.textPrimary}]}>No authorized active work found.</Text><Text style={[styles.noAssignmentSub,{color:c.textMuted}]}>The application will not substitute demo fixtures in UAT.</Text></Card>}
 </ScrollView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl + 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  operatorName: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
  },
  relieverBadge: {
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 2,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  syncText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  dateText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: -4,
  },
  deurNumberBanner: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deurNumberLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  deurNumberValue: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  turnoverBanner: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  turnoverBannerText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  assignmentCard: {
    gap: spacing.md,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equipmentIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentInfo: {
    flex: 1,
  },
  equipmentName: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  assetNumber: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  assignmentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  totalCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: spacing.md,
  },
  totalValue: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
  },
  totalLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  shiftCard: {
    gap: 8,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  ctaButton: {
    marginTop: spacing.sm,
  },
  historyList: {
    gap: spacing.md,
  },
  historyCard: {
    padding: 0,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  historyLeft: {
    gap: 2,
  },
  historyDate: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  historyDeurNumber: {
    fontFamily: fonts.extrabold,
    fontSize: 12,
  },
  historyEquipment: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  historyRental: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noAssignment: {
    alignItems: 'center',
    gap: 8,
    padding: spacing.xxl,
  },
  noAssignmentText: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  noAssignmentSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
});
