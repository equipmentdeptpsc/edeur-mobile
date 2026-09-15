import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, ChevronRight } from 'lucide-react-native';
import { fonts, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { CanonicalHistory } from '@/components/CanonicalHistory';
import { mockRepository } from '@/lib/mockRepository';
import { Card } from '@/components/Card';
import { StatusChip } from '@/components/StatusChip';
import { EmptyState } from '@/components/EmptyState';
import { formatDate, formatDurationShort, getTotalShiftTime, getNetOperatingTime, getStatusVariant } from '@/lib/utils';
import { TouchableOpacity } from 'react-native';

export default function HistoryScreen() {
  const router = useRouter();
  const { operator, mode, canonicalWork } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (!operator) return null;
  if (mode === 'UAT') return canonicalWork ? <CanonicalHistory identity={canonicalWork.identity} /> : <EmptyState title="DEUR History" message="Your submitted reports will appear here." />;

  const allHistory = mockRepository.getDeurHistory(operator.id);
  const filtered = search.trim()
    ? allHistory.filter((d) => {
        const eq = mockRepository.getEquipment(d.equipmentId);
        const rnt = mockRepository.getRental(d.rentalId);
        const s = search.toLowerCase();
        return (
          eq?.name.toLowerCase().includes(s) ||
          rnt?.rentalNumber.toLowerCase().includes(s) ||
          d.date.includes(s)
        );
      })
    : allHistory;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.xxxl + 80 + insets.bottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.screenTitle, { color: c.textPrimary }]}>DEUR History</Text>
      <Text style={[styles.screenSubtitle, { color: c.textMuted }]}>Your submitted and past reports</Text>

      <View style={[styles.searchContainer, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
        <Search size={18} color={c.textMuted} strokeWidth={2} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          placeholder="Search by date, equipment, or rental"
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "No matching records" : "No DEUR records yet"}
          message={search ? "Try a different search term." : "Your submitted DEUR reports will appear here."}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((d) => {
            const eq = mockRepository.getEquipment(d.equipmentId);
            const rnt = mockRepository.getRental(d.rentalId);
            const netOp = getNetOperatingTime(d);
            const totalMs = getTotalShiftTime(d);
            return (
              <Card key={d.id} style={styles.historyCard}>
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => router.push(`/deur-details/${d.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={[styles.dateText, { color: c.textPrimary }]}>{formatDate(d.date)}</Text>
                      <Text style={[styles.deurNumberText, { color: c.blue600 }]}>{d.deurNumber}</Text>
                    </View>
                    <StatusChip
                      label={d.status.toUpperCase()}
                      variant={getStatusVariant(d.status)}
                    />
                  </View>
                  <Text style={[styles.equipmentName, { color: c.textSecondary }]}>{eq?.name ?? 'Unknown'}</Text>
                  <View style={styles.cardDetails}>
                    <Text style={[styles.detailText, { color: c.textMuted }]}>{rnt?.rentalNumber ?? '---'}</Text>
                    <Text style={[styles.dot, { color: c.slate300 }]}>•</Text>
                    <Text style={[styles.detailText, { color: c.textMuted }]}>{formatDurationShort(netOp)} operating</Text>
                    <Text style={[styles.dot, { color: c.slate300 }]}>•</Text>
                    <Text style={[styles.detailText, { color: c.textMuted }]}>{formatDurationShort(totalMs)} total</Text>
                    {d.operatorSegments.length > 1 && (
                      <>
                        <Text style={[styles.dot, { color: c.slate300 }]}>•</Text>
                        <Text style={[styles.detailText, { color: c.textMuted }]}>{d.operatorSegments.length} operators</Text>
                      </>
                    )}
                  </View>
                  <ChevronRight size={18} color={c.slate300} strokeWidth={2} style={styles.chevron} />
                </TouchableOpacity>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
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
  screenTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
  },
  screenSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: -4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    minHeight: 24,
  },
  list: {
    gap: spacing.md,
  },
  historyCard: {
    padding: 0,
  },
  cardContent: {
    padding: 16,
    position: 'relative',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  equipmentName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginBottom: 4,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  detailText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  dot: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  deurNumberText: {
    fontFamily: fonts.extrabold,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    position: 'absolute',
    right: 12,
    top: '50%',
  },
});
