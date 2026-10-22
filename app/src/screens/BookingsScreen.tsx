import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Loader } from '../components/Loader';
import { Icon, IconName } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { bookingApi } from '../api';
import { Booking } from '../types';
import { formatCurrency, formatDateTime, statusColor } from '../utils/format';
import { colors, radius, spacing } from '../theme';
import { MainTabScreenProps } from '../navigation/types';

const STATUS_ICON: Record<string, IconName> = {
  PENDING: 'time-outline',
  CONFIRMED: 'checkmark-circle',
  IN_PROGRESS: 'sparkles',
  COMPLETED: 'checkmark-done-circle',
  CANCELLED: 'close-circle',
};

export function BookingsScreen({ navigation }: MainTabScreenProps<'Bookings'>) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await bookingApi.listMine();
    setBookings(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const data = await bookingApi.listMine();
          if (active) setBookings(data);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const confirmCancel = (booking: Booking) => {
    const doCancel = async () => {
      try {
        await bookingApi.cancel(booking.id);
        await load();
      } catch {
        // ignore; UI stays as is
      }
    };
    if (Platform.OS === 'web') {
      void doCancel();
    } else {
      Alert.alert('Cancel booking?', 'This action cannot be undone.', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel booking', style: 'destructive', onPress: () => void doCancel() },
      ]);
    }
  };

  if (loading) return <Loader />;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={bookings}
      keyExtractor={(b) => b.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          message="Book an artist from the Home tab to get started."
        />
      }
      renderItem={({ item }) => {
        const unpaid = !item.payment || item.payment.status !== 'PAID';
        const isActive = item.status !== 'CANCELLED' && item.status !== 'COMPLETED';
        const sColor = statusColor(item.status);
        return (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.service}>{item.service.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${sColor}1A` }]}>
                <Icon name={STATUS_ICON[item.status] ?? 'ellipse'} size={13} color={sColor} />
                <Text style={[styles.statusText, { color: sColor }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.artist}>with {item.artist.displayName}</Text>
            <View style={styles.metaRow}>
              <Icon name="calendar-outline" size={15} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatDateTime(item.scheduledAt)}</Text>
            </View>
            {item.address ? (
              <View style={styles.metaRow}>
                <Icon name="location-outline" size={15} color={colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            ) : null}

            <View style={styles.cardFooter}>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
              <View style={styles.actions}>
                {unpaid && isActive ? (
                  <Button
                    title="Pay now"
                    icon="card-outline"
                    fullWidth={false}
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Payment', { bookingId: item.id })}
                  />
                ) : null}
                {isActive ? (
                  <Pressable onPress={() => confirmCancel(item)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, flexGrow: 1 },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  service: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  artist: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  metaText: { fontSize: 14, color: colors.text, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  amount: { fontSize: 18, fontWeight: '800', color: colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionBtn: { height: 42, paddingHorizontal: spacing.lg },
  cancelBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  cancelText: { color: colors.danger, fontWeight: '700' },
});
