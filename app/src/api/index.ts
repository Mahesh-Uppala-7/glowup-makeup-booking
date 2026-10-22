import { request, uploadRequest } from './client';
import {
  ArtistProfile,
  AuthResult,
  Booking,
  OrderResponse,
  PortfolioImage,
  Service,
  SlotsResponse,
  User,
} from '../types';

export const authApi = {
  requestOtp: (mobile: string, role?: 'CUSTOMER' | 'ARTIST') =>
    request<{ mobile: string; message: string; devCode?: string }>('/auth/otp/request', {
      method: 'POST',
      auth: false,
      body: { mobile, role },
    }),

  verifyOtp: (payload: { mobile: string; code: string; name?: string; role?: 'CUSTOMER' | 'ARTIST' }) =>
    request<AuthResult>('/auth/otp/verify', { method: 'POST', auth: false, body: payload }),
};

export const userApi = {
  me: () => request<User>('/users/me'),
  updateMe: (data: { name?: string; email?: string }) =>
    request<User>('/users/me', { method: 'PATCH', body: data }),
};

export const serviceApi = {
  list: (params?: { category?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Service[]>(`/services${suffix}`, { auth: false });
  },
  get: (id: string) => request<Service>(`/services/${id}`, { auth: false }),
};

export const artistApi = {
  list: (params?: {
    serviceId?: string;
    city?: string;
    search?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.serviceId) qs.set('serviceId', params.serviceId);
    if (params?.city) qs.set('city', params.city);
    if (params?.search) qs.set('search', params.search);
    if (params?.lat !== undefined) qs.set('lat', String(params.lat));
    if (params?.lng !== undefined) qs.set('lng', String(params.lng));
    if (params?.radius !== undefined) qs.set('radius', String(params.radius));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<ArtistProfile[]>(`/artists${suffix}`, { auth: false });
  },
  get: (id: string) => request<ArtistProfile>(`/artists/${id}`, { auth: false }),
  slots: (id: string, date: string, serviceId?: string) => {
    const qs = new URLSearchParams({ date });
    if (serviceId) qs.set('serviceId', serviceId);
    return request<SlotsResponse>(`/artists/${id}/slots?${qs.toString()}`, { auth: false });
  },

  // --- Artist self-service (authenticated) ---
  myProfile: () => request<ArtistProfile>('/artists/me/profile'),
  upsertProfile: (data: {
    displayName: string;
    bio?: string;
    experienceYears?: number;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => request<ArtistProfile>('/artists/me/profile', { method: 'PUT', body: data }),
  setServices: (services: Array<{ serviceId: string; price: number }>) =>
    request<ArtistProfile>('/artists/me/services', { method: 'PUT', body: { services } }),
  setAvailability: (
    slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
  ) => request<ArtistProfile>('/artists/me/availability', { method: 'PUT', body: { slots } }),

  // --- Portfolio ---
  portfolio: (id: string) => request<PortfolioImage[]>(`/artists/${id}/portfolio`, { auth: false }),
  uploadPortfolio: (formData: FormData) =>
    uploadRequest<PortfolioImage>('/artists/me/portfolio', formData),
  deletePortfolio: (imageId: string) =>
    request<{ id: string }>(`/artists/me/portfolio/${imageId}`, { method: 'DELETE' }),
};

export const bookingApi = {
  create: (payload: {
    artistId: string;
    serviceId: string;
    date: string;
    time: string;
    address?: string;
    notes?: string;
  }) => request<Booking>('/bookings', { method: 'POST', body: payload }),
  listMine: () => request<Booking[]>('/bookings'),
  listForArtist: () => request<Booking[]>('/bookings/artist'),
  get: (id: string) => request<Booking>(`/bookings/${id}`),
  cancel: (id: string) => request<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH' }),
  updateStatus: (id: string, status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED') =>
    request<Booking>(`/bookings/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const notificationApi = {
  registerToken: (token: string, platform?: string) =>
    request<{ id: string }>('/notifications/token', {
      method: 'POST',
      body: { token, platform },
    }),
  removeToken: (token: string) =>
    request<{ removed: boolean }>('/notifications/token', {
      method: 'DELETE',
      body: { token },
    }),
};

export const paymentApi = {
  createOrder: (bookingId: string) =>
    request<OrderResponse>('/payments/order', { method: 'POST', body: { bookingId } }),
  verify: (payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => request<{ bookingId: string; status: string }>('/payments/verify', {
    method: 'POST',
    body: payload,
  }),
};
