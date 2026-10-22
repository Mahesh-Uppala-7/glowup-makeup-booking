import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { Loader } from '../components/Loader';
import { artistApi, bookingApi } from '../api';
import { ApiRequestError } from '../api/client';
import { ArtistProfile, ArtistService } from '../types';
import { formatCurrency } from '../utils/format';
import { colors, radius, spacing } from '../theme';
import { RootStackScreenProps } from '../navigation/types';

export function BookingScreen({ route, navigation }: RootStackScreenProps<'Booking'>) {
  const { artistId, serviceId, date, time } = route.params;

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [service, setService] = useState<ArtistService | undefined>();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const data = await artistApi.get(artistId);
        setArtist(data);
        setService(data.services?.find((s) => s.serviceId === serviceId));
      } finally {
        setLoading(false);
      }
    })();
  }, [artistId, serviceId]);

  const onConfirm = async () => {
    setError(undefined);
    if (!address.trim()) {
      setError('Please enter the address where the service is needed');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await bookingApi.create({
        artistId,
        serviceId,
        date,
        time,
        address: address.trim(),
        notes: notes.trim() || undefined,
      });
      navigation.replace('Payment', { bookingId: booking.id });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.summary}>
          <Row label="Artist" value={artist?.displayName ?? '—'} />
          <Row label="Service" value={service?.service.name ?? '—'} />
          <Row label="Date" value={date} />
          <Row label="Time" value={time} />
          <Row label="Duration" value={`${service?.service.durationMin ?? 60} min`} />
          <View style={styles.divider} />
          <Row
            label="Amount payable"
            value={service ? formatCurrency(service.price) : '—'}
            emphasize
          />
        </Card>

        <Text style={styles.sectionTitle}>Where should the artist come?</Text>
        <TextField
          label="Address"
          placeholder="Flat / house, street, area, city"
          value={address}
          onChangeText={setAddress}
          multiline
          error={error}
        />
        <TextField
          label="Notes for the artist (optional)"
          placeholder="Preferred look, skin type, occasion…"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Button
          title={service ? `Confirm & Pay ${formatCurrency(service.price)}` : 'Confirm'}
          onPress={onConfirm}
          loading={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summary: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowValueEmphasize: { fontSize: 18, fontWeight: '800', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
});
