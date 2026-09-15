import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { StatusChip } from './StatusChip';
import { useTheme } from '@/lib/useTheme';
import { mobileRuntime } from '@/lib/canonical/runtime';
import type { CanonicalDeurHistoryRecord, CanonicalSessionIdentity } from '@/lib/canonical/contracts.generated';
import { fonts, radius, spacing } from '@/lib/theme';

export function CanonicalHistory({ identity }: { identity: CanonicalSessionIdentity }) {
  const { colors: c } = useTheme(); const insets = useSafeAreaInsets();
  const [search, setSearch] = useState(''); const [refreshing, setRefreshing] = useState(false); const [items, setItems] = useState<CanonicalDeurHistoryRecord[]>([]); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!mobileRuntime.workRepository?.getDeurHistory) return; try { setError(null); setItems(await mobileRuntime.workRepository.getDeurHistory(identity)); } catch { setError('History is temporarily unavailable.'); } }, [identity]);
  useEffect(() => { void load(); }, [load]);
  const refresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  const needle = search.trim().toLowerCase(); const filtered = needle ? items.filter(item => `${item.deurNumber} ${item.workDate} ${item.equipmentName} ${item.assetNumber} ${item.rentalNumber}`.toLowerCase().includes(needle)) : items;
  return <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top, paddingBottom: spacing.xxxl + 80 + insets.bottom }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
    <Text style={[styles.title, { color: c.textPrimary }]}>DEUR History</Text><Text style={[styles.subtitle, { color: c.textMuted }]}>Submitted and completed reports</Text>
    <View style={[styles.search, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}><Search size={18} color={c.textMuted} /><TextInput style={[styles.input, { color: c.textPrimary }]} placeholder="Search by date, equipment, or rental" placeholderTextColor={c.textMuted} value={search} onChangeText={setSearch} /></View>
    {error ? <Text style={{ color: c.red500 }}>{error}</Text> : filtered.length === 0 ? <EmptyState title={search ? 'No matching records' : 'No DEUR records yet'} message="Submitted reports will appear here." /> : <View style={styles.list}>{filtered.map(item => <Card key={item.id} style={styles.card}><View style={styles.top}><View><Text style={[styles.date, { color: c.textPrimary }]}>{item.workDate}</Text><Text style={[styles.number, { color: c.blue600 }]}>{item.deurNumber}</Text></View><StatusChip label={item.status.toUpperCase()} variant="blue" /></View><Text style={[styles.equipment, { color: c.textSecondary }]}>{item.equipmentName} · {item.assetNumber}</Text><Text style={[styles.detail, { color: c.textMuted }]}>Rental {item.rentalNumber}{item.acknowledgementStatus ? ` · ${item.acknowledgementStatus}` : ''}</Text>{item.totalOperatingMinutes !== undefined ? <Text style={[styles.detail, { color: c.textMuted }]}>Operating {item.totalOperatingMinutes} min · Idle {item.totalIdleMinutes ?? 0} min</Text> : null}</Card>)}</View>}
  </ScrollView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: spacing.lg, gap: spacing.md }, title: { fontFamily: fonts.extrabold, fontSize: 24 }, subtitle: { fontFamily: fonts.medium, fontSize: 13, marginTop: -4 }, search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 }, input: { flex: 1, fontFamily: fonts.regular, fontSize: 14, minHeight: 24 }, list: { gap: spacing.md }, card: { gap: 6 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, date: { fontFamily: fonts.bold, fontSize: 14 }, number: { fontFamily: fonts.extrabold, fontSize: 12 }, equipment: { fontFamily: fonts.semibold, fontSize: 13 }, detail: { fontFamily: fonts.regular, fontSize: 12 } });
