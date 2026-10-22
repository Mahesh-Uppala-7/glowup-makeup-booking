import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Icon, IconName } from '../components/Icon';
import { SearchBar } from '../components/SearchBar';
import { SectionHeader } from '../components/SectionHeader';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { GradientHeader } from '../components/GradientHeader';
import { useAuth } from '../store/AuthContext';
import { artistApi, serviceApi } from '../api';
import { getCurrentLocation, Coords } from '../utils/location';
import { ArtistProfile, Service } from '../types';
import { formatCurrency } from '../utils/format';
import { categoryColors, colors, radius, shadow, spacing } from '../theme';
import { MainTabScreenProps } from '../navigation/types';

const RADIUS_OPTIONS = [5, 10, 25, 50];

const CATEGORY_ICON: Record<string, IconName> = {
  BASIC: 'sparkles',
  PARTY: 'wine',
  BRIDAL: 'flower',
  ENGAGEMENT: 'heart',
  HAIR: 'cut',
  SPECIAL: 'star',
};

export function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [selectedService, setSelectedService] = useState<Service | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Nearby state
  const [nearby, setNearby] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();

  const fetchArtists = useCallback(
    async (opts: {
      serviceId?: string;
      nearby: boolean;
      coords: Coords | null;
      radiusKm: number;
    }) => {
      const params: {
        serviceId?: string;
        lat?: number;
        lng?: number;
        radius?: number;
      } = {};
      if (opts.serviceId) params.serviceId = opts.serviceId;
      if (opts.nearby && opts.coords) {
        params.lat = opts.coords.latitude;
        params.lng = opts.coords.longitude;
        params.radius = opts.radiusKm;
      }
      const list = await artistApi.list(Object.keys(params).length ? params : undefined);
      setArtists(list);
    },
    [],
  );

  useEffect(() => {
    void (async () => {
      try {
        const [svc] = await Promise.all([
          serviceApi.list(),
          fetchArtists({ serviceId: undefined, nearby: false, coords: null, radiusKm }),
        ]);
        setServices(svc);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = async (overrides?: {
    serviceId?: string;
    nearby?: boolean;
    coords?: Coords | null;
    radiusKm?: number;
  }) => {
    setLoading(true);
    try {
      await fetchArtists({
        serviceId: overrides?.serviceId ?? selectedService?.id,
        nearby: overrides?.nearby ?? nearby,
        coords: overrides?.coords ?? coords,
        radiusKm: overrides?.radiusKm ?? radiusKm,
      });
    } finally {
      setLoading(false);
    }
  };

  const onSelectService = async (service?: Service) => {
    setSelectedService(service);
    await reload({ serviceId: service?.id });
  };

  const toggleNearby = async () => {
    setLocationError(undefined);
    if (nearby) {
      setNearby(false);
      await reload({ nearby: false });
      return;
    }
    // Turning on — make sure we have coordinates.
    let current = coords;
    if (!current) {
      setLocating(true);
      current = await getCurrentLocation();
      setLocating(false);
      if (!current) {
        setLocationError('Location permission denied. Enable location to see nearby artists.');
        return;
      }
      setCoords(current);
    }
    setNearby(true);
    await reload({ nearby: true, coords: current });
  };

  const onSelectRadius = async (r: number) => {
    setRadiusKm(r);
    if (nearby && coords) await reload({ radiusKm: r });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [svc] = await Promise.all([
        serviceApi.list(),
        fetchArtists({ serviceId: selectedService?.id, nearby, coords, radiusKm }),
      ]);
      setServices(svc);
    } finally {
      setRefreshing(false);
    }
  };

  const visibleArtists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) || (a.city ?? '').toLowerCase().includes(q),
    );
  }, [artists, search]);

  const header = (
    <View>
      <GradientHeader style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greeting}>Hi {user?.name ?? 'there'} 👋</Text>
            <Text style={styles.heading}>Find your{'\n'}perfect makeup artist</Text>
          </View>
          <View style={styles.heroAvatar}>
            <Avatar name={user?.name ?? user?.mobile} size={44} />
          </View>
        </View>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search artists or city…"
          style={styles.search}
        />
      </GradientHeader>

      <View style={styles.body}>
        <Pressable
          onPress={toggleNearby}
          style={[styles.nearbyToggle, nearby && styles.nearbyToggleActive]}
        >
          {locating ? (
            <ActivityIndicator color={nearby ? colors.white : colors.primary} size="small" />
          ) : (
            <>
              <Icon
                name="location"
                size={18}
                color={nearby ? colors.white : colors.primary}
              />
              <Text style={[styles.nearbyText, nearby && styles.nearbyTextActive]}>
                {nearby ? 'Showing nearby artists' : 'Find artists near me'}
              </Text>
              {nearby ? <Icon name="checkmark-circle" size={18} color={colors.white} /> : null}
            </>
          )}
        </Pressable>
        {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}

        {nearby ? (
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Within</Text>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => onSelectRadius(r)}
                style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
              >
                <Text
                  style={[styles.radiusChipText, radiusKm === r && styles.radiusChipTextActive]}
                >
                  {r} km
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionSpacer}>
          <SectionHeader title="Services" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.serviceRow}
        >
          <ServiceCard name="All" active={!selectedService} onPress={() => onSelectService(undefined)} />
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              name={s.name}
              price={s.basePrice}
              category={s.category}
              active={selectedService?.id === s.id}
              onPress={() => onSelectService(s)}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionSpacer}>
          <SectionHeader
            title={
              nearby
                ? 'Nearest artists'
                : selectedService
                  ? `${selectedService.name} artists`
                  : 'Top rated artists'
            }
          />
        </View>
      </View>
    </View>
  );

  if (loading && artists.length === 0) {
    return (
      <FlatList
        style={styles.screen}
        data={[0, 1, 2, 3]}
        keyExtractor={(i) => String(i)}
        ListHeaderComponent={header}
        renderItem={() => <ArtistCardSkeleton />}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={visibleArtists}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={header}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <EmptyState
          icon="search-outline"
          title="No artists found"
          message={
            nearby
              ? `No artists within ${radiusKm} km. Try a larger radius.`
              : search
                ? 'Try a different search term.'
                : 'No artists available for this service yet.'
          }
        />
      }
      renderItem={({ item }) => (
        <ArtistCard
          artist={item}
          onPress={() =>
            navigation.navigate('ArtistDetail', {
              artistId: item.id,
              serviceId: selectedService?.id,
            })
          }
        />
      )}
    />
  );
}

function ServiceCard({
  name,
  price,
  category,
  active,
  onPress,
}: {
  name: string;
  price?: number;
  category?: string;
  active: boolean;
  onPress: () => void;
}) {
  const tint = category ? categoryColors[category] ?? colors.primary : colors.primary;
  const iconName: IconName = category ? CATEGORY_ICON[category] ?? 'sparkles' : 'apps';
  return (
    <Pressable onPress={onPress} style={[styles.serviceCard, active && styles.serviceCardActive]}>
      <View style={[styles.serviceIcon, { backgroundColor: `${tint}1A` }]}>
        <Icon name={iconName} size={22} color={tint} />
      </View>
      <Text style={[styles.serviceName, active && styles.serviceNameActive]} numberOfLines={1}>
        {name}
      </Text>
      {price !== undefined ? (
        <Text style={styles.servicePrice}>{formatCurrency(price)}</Text>
      ) : (
        <Text style={styles.servicePrice}>Browse</Text>
      )}
    </Pressable>
  );
}

function ArtistCard({ artist, onPress }: { artist: ArtistProfile; onPress: () => void }) {
  const lowestPrice = artist.services?.length
    ? Math.min(...artist.services.map((s) => s.price))
    : undefined;
  return (
    <Card onPress={onPress} style={styles.artistCard}>
      <Avatar name={artist.displayName} size={60} />
      <View style={styles.artistInfo}>
        <View style={styles.artistTitleRow}>
          <Text style={styles.artistName} numberOfLines={1}>
            {artist.displayName}
          </Text>
          {artist.isVerified ? (
            <Icon name="checkmark-circle" size={16} color={colors.info} />
          ) : null}
        </View>
        <View style={styles.ratingRow}>
          <Icon name="star" size={13} color={colors.star} />
          <Text style={styles.ratingText}>{artist.rating.toFixed(1)}</Text>
          <Text style={styles.artistMeta}>
            ({artist.ratingCount}) · {artist.experienceYears} yrs
          </Text>
        </View>
        <View style={styles.artistLocationRow}>
          {artist.city ? (
            <View style={styles.cityRow}>
              <Icon name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.artistCity}>{artist.city}</Text>
            </View>
          ) : null}
          {artist.distanceKm !== undefined ? (
            <View style={styles.distanceBadge}>
              <Icon name="navigate" size={11} color={colors.success} />
              <Text style={styles.distanceText}>{artist.distanceKm} km</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.priceTag}>
        {lowestPrice !== undefined ? (
          <>
            <Text style={styles.priceFrom}>from</Text>
            <Text style={styles.priceValue}>{formatCurrency(lowestPrice)}</Text>
          </>
        ) : null}
        <Icon name="chevron-forward" size={18} color={colors.textLight} />
      </View>
    </Card>
  );
}

function ArtistCardSkeleton() {
  return (
    <Card style={styles.artistCard}>
      <Skeleton width={60} height={60} rounded={30} />
      <View style={styles.artistInfo}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  hero: {
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '900', color: colors.white, marginTop: spacing.xs },
  heroAvatar: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: radius.pill,
  },
  search: { marginTop: spacing.lg, ...shadow.card },
  body: { paddingHorizontal: spacing.lg },
  nearbyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  nearbyToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  nearbyText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  nearbyTextActive: { color: colors.white },
  locationError: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  radiusLabel: { fontSize: 13, color: colors.textMuted, marginRight: spacing.xs },
  radiusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  radiusChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radiusChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  radiusChipTextActive: { color: colors.primary },
  sectionSpacer: { marginTop: spacing.xl },
  serviceRow: { gap: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.xs },
  serviceCard: {
    width: 104,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'flex-start',
    ...shadow.soft,
  },
  serviceCardActive: { borderColor: colors.primary },
  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  serviceName: { fontSize: 13, fontWeight: '700', color: colors.text },
  serviceNameActive: { color: colors.primary },
  servicePrice: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  artistInfo: { flex: 1, marginLeft: spacing.md },
  artistTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  artistName: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  ratingText: { fontSize: 13, fontWeight: '700', color: colors.text },
  artistMeta: { fontSize: 13, color: colors.textMuted },
  artistLocationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  artistCity: { fontSize: 13, color: colors.textMuted },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${colors.success}18`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  distanceText: { fontSize: 12, fontWeight: '700', color: colors.success },
  priceTag: { alignItems: 'flex-end', gap: 2 },
  priceFrom: { fontSize: 11, color: colors.textMuted },
  priceValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
