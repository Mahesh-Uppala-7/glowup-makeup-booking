import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Loader } from '../../components/Loader';
import { artistApi } from '../../api';
import { ApiRequestError } from '../../api/client';
import { pickImage, imageToFormData } from '../../utils/imagePicker';
import { PortfolioImage } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { RootStackScreenProps } from '../../navigation/types';

export function ArtistPortfolioScreen(_props: RootStackScreenProps<'ArtistPortfolio'>) {
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const profile = await artistApi.myProfile();
      setImages(await artistApi.portfolio(profile.id));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onAdd = async () => {
    setError(undefined);
    try {
      const picked = await pickImage();
      if (!picked) return;
      setUploading(true);
      const form = await imageToFormData(picked);
      await artistApi.uploadPortfolio(form);
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = (image: PortfolioImage) => {
    const doDelete = async () => {
      try {
        await artistApi.deletePortfolio(image.id);
        setImages((prev) => prev.filter((i) => i.id !== image.id));
      } catch {
        // ignore
      }
    };
    if (Platform.OS === 'web') {
      void doDelete();
    } else {
      Alert.alert('Remove photo?', 'This will delete it from your portfolio.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void doDelete() },
      ]);
    }
  };

  if (loading) return <Loader />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Portfolio</Text>
      <Text style={styles.subtitle}>Showcase your best work. Tap a photo to remove it.</Text>

      <Button
        title={uploading ? 'Uploading…' : '＋ Add photo'}
        onPress={onAdd}
        loading={uploading}
        style={styles.addBtn}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {images.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🖼️</Text>
          <Text style={styles.emptyText}>No photos yet. Add your first one above.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {images.map((img) => (
            <Pressable key={img.id} style={styles.thumbWrap} onPress={() => onDelete(img)}>
              <Image source={{ uri: img.url }} style={styles.thumb} resizeMode="cover" />
              <View style={styles.removeBadge}>
                <Text style={styles.removeText}>✕</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  addBtn: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumb: { width: '100%', height: '100%' },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 15, color: colors.textMuted, marginTop: spacing.md },
});
