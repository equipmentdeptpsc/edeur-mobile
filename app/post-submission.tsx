import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, FileText, ClipboardList, LogOut, Plus } from 'lucide-react-native';
import { fonts, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { mockRepository } from '@/lib/mockRepository';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useState } from 'react';

export default function PostSubmissionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { operator, logout } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [showLogout, setShowLogout] = useState(false);

  const deur = mockRepository.getDeurById(id);
  if (!deur || !operator) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <PageHeader title="Submitted" onBack={() => router.back()} />
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>DEUR record not found.</Text>
        </View>
      </View>
    );
  }

  const equipment = mockRepository.getEquipment(deur.equipmentId);
  const rental = mockRepository.getRental(deur.rentalId);
  const assignment = mockRepository.getAssignmentForDeur(deur.id) ?? mockRepository.getOperatorAssignment(operator.id);
  const canStartNew = assignment ? mockRepository.canStartNewDeur(operator.id) : false;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleStartNew = () => {
    router.replace('/deur');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <PageHeader title="DEUR Submitted" onBack={() => router.replace('/home')} />
      <View style={styles.content}>
        <View style={styles.successHeader}>
          <View style={[styles.successIcon, { backgroundColor: c.emerald50 }]}>
            <CheckCircle2 size={48} color={c.emerald500} strokeWidth={2} />
          </View>
          <Text style={[styles.successTitle, { color: c.textPrimary }]}>DEUR Submitted Successfully</Text>
          <Text style={[styles.deurNumber, { color: c.blue600 }]}>{deur.deurNumber}</Text>
          <Text style={[styles.successSubtitle, { color: c.textMuted }]}>
            This report has been submitted and is awaiting acknowledgement.
          </Text>
        </View>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Equipment</Text>
            <Text style={[styles.summaryValue, { color: c.textPrimary }]}>{equipment?.name ?? '---'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.slate100 }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Rental</Text>
            <Text style={[styles.summaryValue, { color: c.textPrimary }]}>{rental?.rentalNumber ?? '---'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.slate100 }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Status</Text>
            <Text style={[styles.summaryValue, { color: c.blue600 }]}>
              {deur.status === 'Acknowledged' ? 'Acknowledged' : 'Waiting Acknowledgement'}
            </Text>
          </View>
        </Card>

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>ACTIONS</Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}
          onPress={() => router.push('/assignment')}
          activeOpacity={0.7}
        >
          <ClipboardList size={20} color={c.blue600} strokeWidth={2} />
          <Text style={[styles.actionText, { color: c.textPrimary }]}>View Assignment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: c.surface, borderColor: c.surfaceBorder }]}
          onPress={() => router.push(`/deur-details/${deur.id}`)}
          activeOpacity={0.7}
        >
          <FileText size={20} color={c.blue600} strokeWidth={2} />
          <Text style={[styles.actionText, { color: c.textPrimary }]}>View Submitted DEUR</Text>
        </TouchableOpacity>

        {canStartNew && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.blue600, borderColor: c.blue600 }]}
            onPress={handleStartNew}
            activeOpacity={0.7}
          >
            <Plus size={20} color={c.white} strokeWidth={2} />
            <Text style={[styles.actionText, { color: c.white }]}>Start New DEUR</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: c.red50, borderColor: c.red50 }]}
          onPress={() => setShowLogout(true)}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={c.red500} strokeWidth={2} />
          <Text style={[styles.actionText, { color: c.red500 }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ConfirmDialog
        visible={showLogout}
        title="Logout?"
        message="You will be returned to the login screen."
        confirmLabel="Logout"
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
        danger
      />
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
    paddingBottom: spacing.xxxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  successHeader: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.xxl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    textAlign: 'center',
  },
  deurNumber: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  successSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  summaryCard: {
    gap: 0,
    padding: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  summaryValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  sectionLabel: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
