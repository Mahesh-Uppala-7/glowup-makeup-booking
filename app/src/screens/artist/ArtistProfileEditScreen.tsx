import React, { useEffect, useState } from 'react';
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
import { Loader } from '../../components/Loader';
import { artistApi } from '../../api';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../store/AuthContext';
import { getCurrentLocation, Coords } from '../../utils/location';
import { colors, radius, spacing } from '../../theme';
import { RootStackScreenProps } from '../../navigation/types';

export function ArtistProfileEditScreen({ navigation }: RootStackScreenProps<'ArtistProfileEdit'>) {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string>();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const p = await artistApi.myProfile();
        setDisplayName(p.displayName);
        setBio(p.bio ?? '');
        setExperienceYears(String(p.experienceYears ?? ''));
        setCity(p.city ?? '');
        setAddress(p.address ?? '');
        if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
          setCoords({ latitude: p.latitude, longitude: p.longitude });
        }
      } catch {
        // No profile yet — start blank.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const captureLocation = async () => {
    setError(undefined);
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setError('Location permission denied. Enable it to help customers find you nearby.');
        return;
      }
      setCoords(loc);
    } finally {
      setLocating(false);
    }
  };

  const onSave = async () => {
    setError(undefined);
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }
    setSaving(true);
    try {
      await artistApi.upsertProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      await refreshUser();
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Your artist profile</Text>
        <TextField
          label="Display name"
          placeholder="e.g. Glam by Priya"
          value={displayName}
          onChangeText={setDisplayName}
          error={error}
        />
        <TextField
          label="Bio"
          placeholder="Tell customers about your style and experience"
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <TextField
          label="Years of experience"
          placeholder="e.g. 5"
          keyboardType="number-pad"
          value={experienceYears}
          onChangeText={setExperienceYears}
        />
        <TextField label="City" placeholder="e.g. Hyderabad" value={city} onChangeText={setCity} />
        <TextField
          label="Address / service area"
          placeholder="Where you operate"
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Location for nearby search</Text>
          <Text style={styles.locationHint}>
            Set your location so customers near you can find you first — less travel, lower cost.
          </Text>
          <Text style={styles.locationValue}>
            {coords
              ? `Lat ${coords.latitude.toFixed(4)}, Lng ${coords.longitude.toFixed(4)}`
              : 'Not set yet'}
          </Text>
          <Button
            title={coords ? 'Update to my current location' : 'Use my current location'}
            variant="outline"
            onPress={captureLocation}
            loading={locating}
          />
        </View>

        <Button title="Save profile" onPress={onSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  locationTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  locationHint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 18 },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginVertical: spacing.md,
  },
});
