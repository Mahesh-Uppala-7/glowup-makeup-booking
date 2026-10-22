import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loader } from '../components/Loader';
import { bookingApi, paymentApi } from '../api';
import { ApiRequestError } from '../api/client';
import { openWebCheckout } from '../utils/payment';
import { useAuth } from '../store/AuthContext';
import { Booking } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { colors, radius, spacing } from '../theme';
import { RootStackScreenProps } from '../navigation/types';

type Phase = 'review' | 'processing' | 'success' | 'error';

export function PaymentScreen({ route, navigation }: RootStackScreenProps<'Payment'>) {
  const { bookingId } = route.params;
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('review');
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        setBooking(await bookingApi.get(bookingId));
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const pay = async () => {
    setPhase('processing');
    setMessage(undefined);
    try {
      const order = await paymentApi.createOrder(bookingId);

      if (order.mock || Platform.OS !== 'web' || !order.keyId) {
        // Mock / offline flow: the backend accepts mock orders without a real signature.
        // On native with live keys, a production app would use react-native-razorpay here.
        await paymentApi.verify({
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_signature',
        });
      } else {
        const result = await openWebCheckout(order, {
          name: user?.name,
          mobile: user?.mobile,
        });
        await paymentApi.verify({
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });
      }

      setPhase('success');
    } catch (e) {
      setPhase('error');
      setMessage(e instanceof ApiRequestError ? e.message : (e as Error).message);
    }
  };

  if (loading) return <Loader />;
  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Booking not found</Text>
      </View>
    );
  }

  if (phase === 'success') {
    return (
      <View style={styles.center}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Payment successful!</Text>
        <Text style={styles.successText}>
          Your booking with {booking.artist.displayName} is confirmed for{' '}
          {formatDateTime(booking.scheduledAt)}.
        </Text>
        <View style={styles.successActions}>
          <Button
            title="View my bookings"
            onPress={() => navigation.navigate('Main', { screen: 'Bookings' })}
          />
          <Button
            title="Back to home"
            variant="outline"
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Order summary</Text>
        <Row label="Service" value={booking.service.name} />
        <Row label="Artist" value={booking.artist.displayName} />
        <Row label="When" value={formatDateTime(booking.scheduledAt)} />
        {booking.address ? <Row label="Address" value={booking.address} /> : null}
        <View style={styles.divider} />
        <Row label="Total" value={formatCurrency(booking.amount)} emphasize />
      </Card>

      {phase === 'error' && message ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.payInfo}>
        <Text style={styles.payInfoText}>
          Payments are processed securely via Razorpay. Supports UPI, cards, net banking and
          wallets.
        </Text>
      </View>

      <Button
        title={`Pay ${formatCurrency(booking.amount)}`}
        onPress={pay}
        loading={phase === 'processing'}
      />
    </ScrollView>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasize && styles.rowValueEmphasize]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  error: { color: colors.danger },
  card: { marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowLabel: { fontSize: 14, color: colors.textMuted, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'right' },
  rowValueEmphasize: { fontSize: 20, fontWeight: '800', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  payInfo: { marginBottom: spacing.lg },
  payInfoText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  errorBox: {
    backgroundColor: `${colors.danger}12`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBoxText: { color: colors.danger, textAlign: 'center' },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  successText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  successActions: { alignSelf: 'stretch', marginTop: spacing.xxl, gap: spacing.md },
});
