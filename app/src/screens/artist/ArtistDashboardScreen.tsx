import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Loader } from '../../components/Loader';
import { Badge } from '../../components/Badge';
import { artistApi, bookingApi } from '../../api';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../store/AuthContext';
import { ArtistProfile, Booking } from '../../types';
import { formatCurrency } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';
import { ArtistTabScreenProps } from '../../navigation/types';

export function ArtistDashboardScreen({ navigation }: ArtistTabScreenProps<'Dashboard'>) {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await artistApi.myProfile();
      setProfile(p);
      setHasProfile(true);
      await refreshUser();
      const b = await bookingApi.listForArtist();
      setBookings(b);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 404) {
        setHasProfile(false);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) return <Loader />;

  if (!hasProfile) {
    return (
      <ScrollView contentContainerStyle={styles.emptyWrap}>
        <Text style={styles.emptyEmoji}>🎨</Text>
        <Text style={styles.emptyTitle}>Welcome, {user?.name ?? 'artist'}!</Text>
        <Text style={styles.emptyText}>
          Create your artist profile to start receiving bookings. Add your services, prices,
          availability and showcase your work.
        </Text>
        <Button
          title="Create my artist profile"
          onPress={() => navigation.navigate('ArtistProfileEdit')}
          style={styles.cta}
        />
      </ScrollView>
    );
  }

  const pending = bookings.filter((b) => b.status === 'PENDING').length;
  const upcoming = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const earnings = bookings
    .filter((b) => b.payment?.status === 'PAID')
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.hello}>{profile?.displayName}</Text>
          <Text style={styles.sub}>
            ⭐ {profile?.rating.toFixed(1)} ({profile?.ratingCount}) · {profile?.experienceYears} yrs
          </Text>
        </View>
        {profile?.isVerified ? <Badge label="Verified" color={colors.success} /> : null}
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Pending" value={String(pending)} tint={colors.warning} />
        <StatCard label="Upcoming" value={String(upcoming)} tint={colors.info} />
        <StatCard label="Earned" value={formatCurrency(earnings)} tint={colors.success} />
      </View>

      <Text style={styles.sectionTitle}>Manage</Text>
      <ActionCard
        emoji="📋"
        title="Booking requests"
        subtitle={`${pending} pending · ${bookings.length} total`}
        onPress={() => navigation.navigate('Requests')}
      />
      <ActionCard
        emoji="💅"
        title="Services & pricing"
        subtitle={`${profile?.services?.length ?? 0} services offered`}
        onPress={() => navigation.navigate('ArtistServices')}
      />
      <ActionCard
        emoji="🗓️"
        title="Availability"
        subtitle={`${profile?.availability?.length ?? 0} working days set`}
        onPress={() => navigation.navigate('ArtistAvailability')}
      />
      <ActionCard
        emoji="🖼️"
        title="Portfolio"
        subtitle={`${profile?.portfolio?.length ?? 0} photos`}
        onPress={() => navigation.navigate('ArtistPortfolio')}
      />
      <ActionCard
        emoji="✏️"
        title="Edit profile"
        subtitle="Name, bio, city, experience"
        onPress={() => navigation.navigate('ArtistProfileEdit')}
      />
    </ScrollView>
  );
}

function StatCard({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  emoji,
  title,
  subtitle,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.actionCard}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <View style={styles.flex}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  hello: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  actionCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  actionEmoji: { fontSize: 24, marginRight: spacing.md },
  actionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  actionSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 28, color: colors.textMuted },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 21,
  },
  cta: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
