import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../store/AuthContext';
import { ApiRequestError } from '../../api/client';
import { colors, radius, shadow, spacing } from '../../theme';
import { RootStackScreenProps } from '../../navigation/types';

export function OtpScreen({ route }: RootStackScreenProps<'Otp'>) {
  const { mobile, role, devCode } = route.params;
  const { verifyOtp } = useAuth();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    setError(undefined);
    if (code.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      // On success, the auth state flips and the navigator swaps to the main app.
      await verifyOtp({ mobile, code, name: name.trim() || undefined, role });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <Icon name="shield-checkmark" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the OTP sent to <Text style={styles.mobile}>+91 {mobile}</Text>
        </Text>

        {devCode ? (
          <View style={styles.devBox}>
            <Icon name="information-circle" size={18} color={colors.info} />
            <Text style={styles.devText}>Dev mode OTP: {devCode}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <TextField
            label="One-time password"
            placeholder="6-digit OTP"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            error={error}
            leftIcon="keypad-outline"
          />
          <TextField
            label="Your name (optional)"
            placeholder="How should we address you?"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            leftIcon="person-outline"
          />
          <Button title="Verify & Continue" icon="checkmark-circle" onPress={onVerify} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.sm },
  mobile: { color: colors.text, fontWeight: '700' },
  devBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.info}12`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.info}33`,
  },
  devText: { color: colors.info, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: spacing.xl,
    ...shadow.card,
  },
});
