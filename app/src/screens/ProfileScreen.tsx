import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Icon, IconName } from '../components/Icon';
import { GradientHeader } from '../components/GradientHeader';
import { useAuth } from '../store/AuthContext';
import { userApi } from '../api';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ArtistLinkRoute =
  | 'ArtistProfileEdit'
  | 'ArtistServices'
  | 'ArtistAvailability'
  | 'ArtistPortfolio';

const ARTIST_LINKS: Array<{ label: string; icon: IconName; tint: string; to: ArtistLinkRoute }> = [
  { label: 'Edit artist profile', icon: 'create-outline', tint: '#EC4899', to: 'ArtistProfileEdit' },
  { label: 'Services & pricing', icon: 'pricetags-outline', tint: '#A855F7', to: 'ArtistServices' },
  { label: 'Availability', icon: 'calendar-outline', tint: '#0EA5E9', to: 'ArtistAvailability' },
  { label: 'Portfolio', icon: 'images-outline', tint: '#F59E0B', to: 'ArtistPortfolio' },
];

export function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await userApi.updateMe({ name: name.trim() || undefined });
      await refreshUser();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GradientHeader style={styles.header} rounded={false}>
        <Avatar name={user?.name ?? user?.mobile} size={88} />
        <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
        <Text style={styles.mobile}>+91 {user?.mobile}</Text>
        <View style={styles.rolePill}>
          <Icon
            name={user?.role === 'ARTIST' ? 'brush' : 'person'}
            size={12}
            color={colors.white}
          />
          <Text style={styles.roleText}>{user?.role ?? 'CUSTOMER'}</Text>
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Edit profile</Text>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            leftIcon="person-outline"
          />
          <Button
            title={saved ? 'Saved' : 'Save changes'}
            icon={saved ? 'checkmark-circle' : 'save-outline'}
            onPress={onSave}
            loading={saving}
          />
        </Card>

        {user?.role === 'ARTIST' ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Artist tools</Text>
            {ARTIST_LINKS.map((link, i) => (
              <Pressable
                key={link.to}
                style={[styles.linkRow, i < ARTIST_LINKS.length - 1 && styles.linkDivider]}
                onPress={() => navigation.navigate(link.to)}
              >
                <View style={[styles.linkIcon, { backgroundColor: `${link.tint}1A` }]}>
                  <Icon name={link.icon} size={18} color={link.tint} />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Icon name="chevron-forward" size={18} color={colors.textLight} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Are you a makeup artist?</Text>
            <Text style={styles.infoText}>
              Create an artist profile to offer your services, set your prices and start receiving
              bookings.
            </Text>
            <Button
              title="Become an artist"
              icon="brush"
              variant="secondary"
              style={styles.becomeBtn}
              onPress={() => navigation.navigate('ArtistProfileEdit')}
            />
          </Card>
        )}

        <Button
          title="Log out"
          icon="log-out-outline"
          variant="outline"
          onPress={() => void logout()}
          style={styles.logout}
        />
        <Text style={styles.version}>GlowUp • v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  header: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  name: { fontSize: 22, fontWeight: '800', color: colors.white, marginTop: spacing.sm },
  mobile: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: spacing.sm },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  body: { padding: spacing.lg },
  card: { marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  infoText: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  becomeBtn: { marginTop: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  linkDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },
  logout: { marginTop: spacing.sm },
  version: { textAlign: 'center', color: colors.textLight, fontSize: 12, marginTop: spacing.xl },
});
