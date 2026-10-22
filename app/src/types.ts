export type Role = 'CUSTOMER' | 'ARTIST' | 'ADMIN';

export type ServiceCategory =
  | 'BASIC'
  | 'PARTY'
  | 'BRIDAL'
  | 'ENGAGEMENT'
  | 'HAIR'
  | 'SPECIAL';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface User {
  id: string;
  mobile: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  avatarUrl?: string | null;
  artistProfile?: ArtistProfile | null;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  category: ServiceCategory;
  basePrice: number;
  durationMin: number;
  imageUrl?: string | null;
}

export interface ArtistService {
  id: string;
  serviceId: string;
  price: number;
  service: Service;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface PortfolioImage {
  id: string;
  url: string;
  caption?: string | null;
  createdAt: string;
}

export interface ArtistProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
  experienceYears: number;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
  rating: number;
  ratingCount: number;
  isVerified: boolean;
  isAvailable: boolean;
  user?: { id?: string; name?: string | null; mobile?: string; avatarUrl?: string | null };
  services?: ArtistService[];
  availability?: AvailabilitySlot[];
  portfolio?: PortfolioImage[];
}

export interface Payment {
  id: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
}

export interface Booking {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: BookingStatus;
  amount: number;
  address?: string | null;
  notes?: string | null;
  service: Service;
  artist: ArtistProfile;
  customer?: { id: string; name?: string | null; mobile: string };
  payment?: Payment | null;
}

export interface SlotsResponse {
  date: string;
  durationMin: number;
  slots: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export interface OrderResponse {
  mock: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
  bookingId: string;
}
