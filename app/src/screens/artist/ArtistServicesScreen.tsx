import React, { useEffect, useMemo, useState } from 'react';
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
import { artistApi, serviceApi } from '../../api';
import { ApiRequestError } from '../../api/client';
import { Service } from '../../types';
import { formatCurrency } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';
import { RootStackScreenProps } from '../../navigation/types';

interface Row {
  enabled: boolean;
  price: string;
}

export function ArtistServicesScreen({ navigation }: RootStackScreenProps<'ArtistServices'>) {
  const [services, setServices] = useState<Service[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const [all, profile] = await Promise.all([serviceApi.list(), artistApi.myProfile()]);
        setServices(all);
        const offered = new Map(profile.services?.map((s) => [s.serviceId, s.price]) ?? []);
        const initial: Record<string, Row> = {};
        all.forEach((s) => {
          initial[s.id] = {
            enabled: offered.has(s.id),
            price: String(offered.get(s.id) ?? s.basePrice),
          };
        });
        setRows(initial);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCount = useMemo(
    () => Object.values(rows).filter((r) => r.enabled).length,
    [rows],
  );

  const toggle = (id: string) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));

  const setPrice = (id: string, price: string) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], price: price.replace(/[^0-9]/g, '') } }));

  const onSave = async () => {
    setError(undefined);
    const payload = Object.entries(rows)
      .filter(([, r]) => r.enabled)
      .map(([serviceId, r]) => ({ serviceId, price: parseInt(r.price || '0', 10) }));

    if (payload.length === 0) {
      setError('Select at least one service to offer');
      return;
    }
    if (payload.some((p) => p.price <= 0)) {
      setError('Enter a valid price for each selected service');
      return;
    }

    setSaving(true);
    try {
      await artistApi.setServices(payload);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not save services');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Services & pricing</Text>
      <Text style={styles.subtitle}>
        Choose which services you offer and set your price for each ({selectedCount} selected).
      </Text>

      {services.map((s) => {
        const row = rows[s.id];
        return (
          <View key={s.id} style={[styles.row, row?.enabled && styles.rowActive]}>
            <Pressable style={styles.rowMain} onPress={() => toggle(s.id)}>
              <View style={[styles.checkbox, row?.enabled && styles.checkboxOn]}>
                {row?.enabled ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <View style={styles.flex}>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceMeta}>
                  {s.durationMin} min · base {formatCurrency(s.basePrice)}
                </Text>
              </View>
            </Pressable>
            {row?.enabled ? (
              <View style={styles.priceBox}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="number-pad"
                  value={row.price}
                  onChangeText={(t) => setPrice(s.id, t)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Save services" onPress={onSave} loading={saving} style={styles.save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  flex: { flex: 1 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.primary },
  rowMain: { flexDirection: 'row', alignItems: 'center' },
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
  serviceName: { fontSize: 15, fontWeight: '700', color: colors.text },
  serviceMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  rupee: { fontSize: 18, fontWeight: '700', color: colors.text, marginRight: spacing.sm },
  priceInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, marginTop: spacing.md },
  save: { marginTop: spacing.lg },
});
