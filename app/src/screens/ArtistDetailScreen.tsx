import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Loader } from '../components/Loader';
import { Icon } from '../components/Icon';
import { artistApi } from '../api';
import { ApiRequestError } from '../api/client';
import { ArtistProfile, ArtistService } from '../types';
import { formatCurrency, upcomingDates } from '../utils/format';
import { colors, radius, spacing } from '../theme';
import { RootStackScreenProps } from '../navigation/types';

export function ArtistDetailScreen({ route, navigation }: RootStackScreenProps<'ArtistDetail'>) {
  const { artistId, serviceId } = route.params;
  const dates = useMemo(() => upcomingDates(14), []);

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [selectedService, setSelectedService] = useState<ArtistService | undefined>();
  const [selectedDate, setSelectedDate] = useState<string>(dates[0].value);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const data = await artistApi.get(artistId);
        setArtist(data);
        const preset = data.services?.find((s) => s.serviceId === serviceId);
        setSelectedService(preset ?? data.services?.[0]);
      } catch (e) {
        setError(e instanceof ApiRequestError ? e.message : 'Failed to load artist');
      } finally {
        setLoading(false);
      }
    })();
  }, [artistId, serviceId]);

  const loadSlots = useCallback(async () => {
    if (!selectedService) return;
    setSlotsLoading(true);
    setSelectedTime(undefined);
    try {
      const res = await artistApi.slots(artistId, selectedDate, selectedService.serviceId);
      setSlots(res.slots);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [artistId, selectedDate, selectedService]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  if (loading) return <Loader message="Loading artist…" />;
  if (error || !artist) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Artist not found'}</Text>
      </View>
    );
  }

  const canContinue = Boolean(selectedService && selectedDate && selectedTime);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar name={artist.displayName} size={72} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{artist.displayName}</Text>
            {artist.isVerified ? (
              <Icon name="checkmark-circle" size={18} color={colors.info} />
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <Icon name="star" size={14} color={colors.star} />
            <Text style={styles.metaStrong}>{artist.rating.toFixed(1)}</Text>
            <Text style={styles.meta}>
              ({artist.ratingCount}) · {artist.experienceYears} yrs exp
            </Text>
          </View>
          {artist.city ? (
            <View style={styles.metaRow}>
              <Icon name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.meta}>{artist.city}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {artist.bio ? <Text style={styles.bio}>{artist.bio}</Text> : null}

      {artist.portfolio && artist.portfolio.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.portfolioRow}
          >
            {artist.portfolio.map((img) => (
              <Image
                key={img.id}
                source={{ uri: img.url }}
                style={styles.portfolioImg}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Select a service</Text>
      <View style={styles.serviceList}>
        {artist.services?.map((s) => {
          const active = selectedService?.id === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSelectedService(s)}
              style={[styles.serviceRow, active && styles.serviceRowActive]}
            >
              <View style={styles.flex}>
                <Text style={styles.serviceName}>{s.service.name}</Text>
                <Text style={styles.serviceDuration}>{s.service.durationMin} min</Text>
              </View>
              <Text style={[styles.servicePrice, active && styles.servicePriceActive]}>
                {formatCurrency(s.price)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Choose a date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
        {dates.map((d) => {
          const active = selectedDate === d.value;
          return (
            <Pressable
              key={d.value}
              onPress={() => setSelectedDate(d.value)}
              style={[styles.dateChip, active && styles.dateChipActive]}
            >
              <Text style={[styles.dateWeekday, active && styles.dateTextActive]}>{d.weekday}</Text>
              <Text style={[styles.dateLabel, active && styles.dateTextActive]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>Available time slots</Text>
      {slotsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : slots.length === 0 ? (
        <Text style={styles.noSlots}>No slots available on this date. Try another day.</Text>
      ) : (
        <View style={styles.slotGrid}>
          {slots.map((t) => {
            const active = selectedTime === t;
            return (
              <Pressable
                key={t}
                onPress={() => setSelectedTime(t)}
                style={[styles.slot, active && styles.slotActive]}
              >
                <Text style={[styles.slotText, active && styles.slotTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title={
            selectedService
              ? `Continue · ${formatCurrency(selectedService.price)}`
              : 'Select a service'
          }
          disabled={!canContinue}
          onPress={() =>
            navigation.navigate('Booking', {
              artistId,
              serviceId: selectedService!.serviceId,
              date: selectedDate,
              time: selectedTime!,
            })
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  error: { color: colors.danger },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerInfo: { marginLeft: spacing.lg, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaStrong: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  bio: { fontSize: 14, color: colors.text, marginTop: spacing.lg, lineHeight: 20 },
  portfolioRow: { gap: spacing.sm, paddingRight: spacing.lg },
  portfolioImg: {
    width: 120,
    height: 150,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  serviceList: { gap: spacing.sm },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  serviceRowActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
  flex: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '700', color: colors.text },
  serviceDuration: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  servicePrice: { fontSize: 16, fontWeight: '800', color: colors.text },
  servicePriceActive: { color: colors.primary },
  dateRow: { gap: spacing.sm, paddingRight: spacing.lg },
  dateChip: {
    width: 64,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  dateChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateWeekday: { fontSize: 12, color: colors.textMuted },
  dateLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  dateTextActive: { color: colors.white },
  noSlots: { color: colors.textMuted, marginVertical: spacing.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  slotText: { fontSize: 14, fontWeight: '600', color: colors.text },
  slotTextActive: { color: colors.white },
  footer: { marginTop: spacing.xxl },
});
