import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Loader } from '../../components/Loader';
import { bookingApi } from '../../api';
import { Booking, BookingStatus } from '../../types';
import { formatCurrency, formatDateTime, statusColor } from '../../utils/format';
import { colors, spacing } from '../../theme';
import { ArtistTabScreenProps } from '../../navigation/types';

const NEXT_ACTION: Partial<Record<BookingStatus, { label: string; to: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' }>> = {
  PENDING: { label: 'Accept booking', to: 'CONFIRMED' },
  CONFIRMED: { label: 'Mark in progress', to: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'Mark completed', to: 'COMPLETED' },
};

export function ArtistBookingsScreen(_props: ArtistTabScreenProps<'Requests'>) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string>();

  const load = useCallback(async () => {
    const data = await bookingApi.listForArtist();
    setBookings(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const advance = async (booking: Booking) => {
    const action = NEXT_ACTION[booking.status];
    if (!action) return;
    setBusyId(booking.id);
    try {
      await bookingApi.updateStatus(booking.id, action.to);
      await load();
    } finally {
      setBusyId(undefined);
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
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No booking requests yet.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const action = NEXT_ACTION[item.status];
        const paid = item.payment?.status === 'PAID';
        return (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.service}>{item.service.name}</Text>
              <Badge label={item.status} color={statusColor(item.status)} />
            </View>
            <Text style={styles.customer}>
              👤 {item.customer?.name ?? 'Customer'} · {item.customer?.mobile}
            </Text>
            <Text style={styles.when}>🗓️ {formatDateTime(item.scheduledAt)}</Text>
            {item.address ? <Text style={styles.address}>📍 {item.address}</Text> : null}
            {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}

            <View style={styles.footer}>
              <View>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                <Text style={[styles.payState, { color: paid ? colors.success : colors.warning }]}>
                  {paid ? 'Paid' : 'Payment pending'}
                </Text>
              </View>
              {action ? (
                <Button
                  title={action.label}
                  fullWidth={false}
                  loading={busyId === item.id}
                  style={styles.actionBtn}
                  onPress={() => advance(item)}
                />
              ) : null}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  service: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  customer: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  when: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  address: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  notes: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  amount: { fontSize: 18, fontWeight: '800', color: colors.primary },
  payState: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  actionBtn: { height: 42, paddingHorizontal: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl * 2 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 15, color: colors.textMuted, marginTop: spacing.md },
});
