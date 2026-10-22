import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Profile: undefined;
};

export type ArtistTabParamList = {
  Dashboard: undefined;
  Requests: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Otp: { mobile: string; role?: 'CUSTOMER' | 'ARTIST'; devCode?: string };
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ArtistDetail: { artistId: string; serviceId?: string };
  Booking: { artistId: string; serviceId: string; date: string; time: string };
  Payment: { bookingId: string };
  BookingConfirmed: { bookingId: string };
  // Artist self-service screens
  ArtistProfileEdit: undefined;
  ArtistServices: undefined;
  ArtistAvailability: undefined;
  ArtistPortfolio: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ArtistTabScreenProps<T extends keyof ArtistTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<ArtistTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
