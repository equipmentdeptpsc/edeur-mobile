import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Truck, MapPin, FileText, Info, Sun, Moon } from 'lucide-react-native';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { CanonicalProfile } from '@/components/CanonicalProfile';
import { Card } from '@/components/Card';
import { StatusChip } from '@/components/StatusChip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState } from 'react';
import { spacing, radius, fonts } from '@/lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { operator, logout, mode: runtimeMode, canonicalWork } = useAuth();
  const { mode, toggle, colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  if (!operator) return null;
  if (runtimeMode === 'UAT' && canonicalWork) return <CanonicalProfile work={canonicalWork} />;

  const activeDeur = null;
  const assignment: any = null;
  const equipment: any = null;
  const project: any = null;
  const rental: any = null;

  const handleLogout = async () => { if (loggingOut) return; setLoggingOut(true); setLogoutMessage(null); if (await logout()) router.replace('/login'); else { setLoggingOut(false); setShowLogout(false); setLogoutMessage('Logout could not be saved. Try again.'); } };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={[styles.content, { paddingTop: 12 + insets.top, paddingBottom: 92 + insets.bottom }]}>
<View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: c.blue600 }]}>
          <Text style={styles.avatarText}>{operator.initials}</Text>
        </View>
        <Text style={[styles.operatorName, { color: c.textPrimary }]}>{operator.name}</Text>
        <Text style={[styles.operatorId, { color: c.textMuted }]}>Operator ID: {operator.id.toUpperCase()}</Text>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>APPEARANCE</Text>
      <Card>
        <View style={styles.row}>
          {mode === 'dark' ? <Moon size={16} color={c.textSecondary} strokeWidth={2} /> : <Sun size={16} color={c.textSecondary} strokeWidth={2} />}
          <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Dark Mode</Text>
          <Switch value={mode === 'dark'} onValueChange={toggle} trackColor={{ false: c.slate200, true: c.blue600 }} thumbColor="#ffffff" />
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>ACCOUNT</Text>
      <Card>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Login Name</Text>
          <Text style={[styles.rowValue, { color: c.textPrimary }]}>{operator.loginName || 'N/A'}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: c.slate100 }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Role</Text>
          <Text style={[styles.rowValue, { color: c.textPrimary }]}>{operator.isReliever ? 'Reliever Operator' : 'Equipment Operator'}</Text>
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>CURRENT ASSIGNMENT</Text>
      <Card>
        {equipment ? (
          <>
            <View style={styles.assignmentRow}>
              <Truck size={18} color={c.blue600} strokeWidth={2} />
              <View style={styles.assignmentInfo}>
                <Text style={[styles.assignmentLabel, { color: c.textMuted }]}>Equipment</Text>
                <Text style={[styles.assignmentValue, { color: c.textPrimary }]}>{equipment.name}</Text>
                <Text style={[styles.assignmentSub, { color: c.textMuted }]}>{equipment.assetNumber}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: c.slate100 }]} />
            <View style={styles.assignmentRow}>
              <MapPin size={18} color={c.blue600} strokeWidth={2} />
              <View style={styles.assignmentInfo}>
                <Text style={[styles.assignmentLabel, { color: c.textMuted }]}>Project</Text>
                <Text style={[styles.assignmentValue, { color: c.textPrimary }]}>{project?.name ?? '---'}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: c.slate100 }]} />
            <View style={styles.assignmentRow}>
              <FileText size={18} color={c.blue600} strokeWidth={2} />
              <View style={styles.assignmentInfo}>
                <Text style={[styles.assignmentLabel, { color: c.textMuted }]}>Rental</Text>
                <Text style={[styles.assignmentValue, { color: c.textPrimary }]}>{rental?.rentalNumber ?? '---'}</Text>
                <StatusChip label={rental?.status.toUpperCase() ?? '---'} variant="blue" style={styles.rentalStatus} />
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.noAssignment, { color: c.textMuted }]}>No active assignment</Text>
        )}
      </Card>

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>APPLICATION</Text>
      <Card>
        <View style={styles.row}>
          <Info size={16} color={c.textMuted} strokeWidth={2} />
          <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Version</Text>
          <Text style={[styles.rowValue, { color: c.textPrimary }]}>2.0.0</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: c.slate100 }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.textSecondary }]}>Session</Text>
          <Text style={[styles.rowValue, { color: c.textPrimary }]}>Active</Text>
        </View>
      </Card>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: c.dangerBg }]} onPress={() => setShowLogout(true)} activeOpacity={0.7}>
        <LogOut size={20} color={c.red500} strokeWidth={2} />
        <Text style={[styles.logoutText, { color: c.red500 }]}>Logout</Text>
      </TouchableOpacity>

      {logoutMessage?<Text accessibilityRole="alert" style={{ color: c.red500 }}>{logoutMessage}</Text>:null}
      <ConfirmDialog visible={showLogout} title="Logout?" message="You will be returned to the login screen. Any unsaved DEUR data will remain in the app." confirmLabel={loggingOut?'Logging out…':'Logout'} onConfirm={() => void handleLogout()} onCancel={() => setShowLogout(false)} danger />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, gap: 12, paddingBottom: 92 },
  profileHeader: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 28, color: '#ffffff' },
  operatorName: { fontFamily: fonts.extrabold, fontSize: 22 },
  operatorId: { fontFamily: fonts.medium, fontSize: 13 },
  sectionLabel: { fontFamily: fonts.extrabold, fontSize: 13, marginTop: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 14 },
  rowValue: { fontFamily: fonts.bold, fontSize: 14 },
  divider: { height: 1, marginLeft: 16 },
  assignmentRow: { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start' },
  assignmentInfo: { flex: 1, gap: 2 },
  assignmentLabel: { fontFamily: fonts.regular, fontSize: 12 },
  assignmentValue: { fontFamily: fonts.bold, fontSize: 14 },
  assignmentSub: { fontFamily: fonts.regular, fontSize: 12 },
  rentalStatus: { alignSelf: 'flex-start', marginTop: 4 },
  noAssignment: { fontFamily: fonts.medium, fontSize: 14, padding: 16 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, minHeight: 52, marginTop: 8 },
  logoutText: { fontFamily: fonts.bold, fontSize: 16 },
  resetButton: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  resetText: { fontFamily: fonts.bold, fontSize: 14 },
});
