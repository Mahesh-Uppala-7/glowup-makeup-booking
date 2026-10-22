import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { Loader } from '../../components/Loader';
import { artistApi } from '../../api';
import { ApiRequestError } from '../../api/client';
import { colors, radius, spacing } from '../../theme';
import { RootStackScreenProps } from '../../navigation/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface DayState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export function ArtistAvailabilityScreen({ navigation }: RootStackScreenProps<'ArtistAvailability'>) {
  const [days, setDays] = useState<DayState[]>(
    DAYS.map((_, i) => ({ enabled: i >= 1 && i <= 6, startTime: '09:00', endTime: '18:00' })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const profile = await artistApi.myProfile();
        if (profile.availability?.length) {
          setDays((prev) => {
            const next = prev.map((d) => ({ ...d, enabled: false }));
            profile.availability!.forEach((slot) => {
              next[slot.dayOfWeek] = {
                enabled: true,
                startTime: slot.startTime,
                endTime: slot.endTime,
              };
            });
            return next;
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (index: number, patch: Partial<DayState>) =>
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const onSave = async () => {
    setError(undefined);
    const slots = days
      .map((d, i) => ({ dayOfWeek: i, ...d }))
      .filter((d) => d.enabled)
      .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

    if (slots.length === 0) {
      setError('Enable at least one working day');
      return;
    }
    for (const s of slots) {
      if (!TIME_RE.test(s.startTime) || !TIME_RE.test(s.endTime)) {
        setError('Times must be in HH:mm (24h) format');
        return;
      }
      if (s.startTime >= s.endTime) {
        setError(`${DAYS[s.dayOfWeek]}: start time must be before end time`);
        return;
      }
    }

    setSaving(true);
    try {
      await artistApi.setAvailability(slots);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly availability</Text>
      <Text style={styles.subtitle}>Set the hours you work on each day.</Text>

      {days.map((d, i) => (
        <View key={DAYS[i]} style={[styles.row, d.enabled && styles.rowActive]}>
          <Pressable style={styles.dayToggle} onPress={() => update(i, { enabled: !d.enabled })}>
            <View style={[styles.checkbox, d.enabled && styles.checkboxOn]}>
              {d.enabled ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={styles.dayName}>{DAYS[i]}</Text>
          </Pressable>
          {d.enabled ? (
            <View style={styles.times}>
              <TextInput
                style={styles.timeInput}
                value={d.startTime}
                onChangeText={(t) => update(i, { startTime: t })}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                maxLength={5}
              />
              <Text style={styles.dash}>to</Text>
              <TextInput
                style={styles.timeInput}
                value={d.endTime}
                onChangeText={(t) => update(i, { endTime: t })}
                placeholder="18:00"
                placeholderTextColor={colors.textMuted}
                maxLength={5}
              />
            </View>
          ) : null}
        </View>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Save availability" onPress={onSave} loading={saving} style={styles.save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.primary },
  dayToggle: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: colors.white, fontWeight: '900', fontSize: 14 },
  dayName: { fontSize: 15, fontWeight: '700', color: colors.text },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeInput: {
    width: 90,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  dash: { marginHorizontal: spacing.md, color: colors.textMuted },
  error: { color: colors.danger, marginTop: spacing.md },
  save: { marginTop: spacing.lg },
});
