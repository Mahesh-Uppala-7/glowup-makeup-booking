import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Icon, IconName } from '../../components/Icon';
import { GradientHeader } from '../../components/GradientHeader';
import { useAuth } from '../../store/AuthContext';
import { ApiRequestError } from '../../api/client';
import { colors, radius, shadow, spacing } from '../../theme';
import { RootStackScreenProps } from '../../navigation/types';

type Role = 'CUSTOMER' | 'ARTIST';

export function LoginScreen({ navigation }: RootStackScreenProps<'Login'>) {
  const { requestOtp } = useAuth();
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(undefined);
    const clean = mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const { devCode } = await requestOtp(clean, role);
      navigation.navigate('Otp', { mobile: clean, role, devCode });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GradientHeader style={styles.hero}>
          <View style={styles.logoCircle}>
            <Icon name="color-wand" size={36} color={colors.white} />
          </View>
          <Text style={styles.title}>GlowUp</Text>
          <Text style={styles.subtitle}>
            Book professional makeup artists for every occasion
          </Text>
        </GradientHeader>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>I want to</Text>
          <View style={styles.roleRow}>
            <RoleChip
              icon="sparkles"
              label="Book an artist"
              active={role === 'CUSTOMER'}
              onPress={() => setRole('CUSTOMER')}
            />
            <RoleChip
              icon="brush"
              label="Offer my services"
              active={role === 'ARTIST'}
              onPress={() => setRole('ARTIST')}
            />
          </View>

          <TextField
            label="Mobile number"
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            value={mobile}
            onChangeText={setMobile}
            error={error}
            hint="We'll send a one-time password to verify"
            leftIcon="call-outline"
          />

          <Button title="Send OTP" icon="arrow-forward" onPress={onSubmit} loading={loading} />
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Icon name={icon} size={22} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingBottom: spacing.xl },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl * 1.5,
    paddingHorizontal: spacing.xl,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 36, fontWeight: '900', color: colors.white, marginTop: spacing.md },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    ...shadow.elevated,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.primary },
  terms: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
