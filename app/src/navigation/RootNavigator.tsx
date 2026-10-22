import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../store/AuthContext';
import { Loader } from '../components/Loader';
import { Icon, IconName } from '../components/Icon';
import { colors } from '../theme';
import { ArtistTabParamList, MainTabParamList, RootStackParamList } from './types';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ArtistDetailScreen } from '../screens/ArtistDetailScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ArtistDashboardScreen } from '../screens/artist/ArtistDashboardScreen';
import { ArtistBookingsScreen } from '../screens/artist/ArtistBookingsScreen';
import { ArtistProfileEditScreen } from '../screens/artist/ArtistProfileEditScreen';
import { ArtistServicesScreen } from '../screens/artist/ArtistServicesScreen';
import { ArtistAvailabilityScreen } from '../screens/artist/ArtistAvailabilityScreen';
import { ArtistPortfolioScreen } from '../screens/artist/ArtistPortfolioScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const CustomerTab = createBottomTabNavigator<MainTabParamList>();
const ArtistTab = createBottomTabNavigator<ArtistTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary },
};

const styles = StyleSheet.create({
  header: { backgroundColor: colors.background },
  headerTitle: { color: colors.text, fontWeight: '800', fontSize: 18 },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '700' },
});

const tabScreenOptions = {
  headerStyle: styles.header,
  headerTitleStyle: styles.headerTitle,
  headerShadowVisible: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textLight,
  tabBarStyle: styles.tabBar,
  tabBarLabelStyle: styles.tabLabel,
} as const;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <Icon name={focused ? active : inactive} size={24} color={color} />
  );
}

function CustomerTabs() {
  return (
    <CustomerTab.Navigator screenOptions={tabScreenOptions}>
      <CustomerTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'GlowUp', headerShown: false, tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <CustomerTab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ title: 'My Bookings', tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <CustomerTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: false, tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </CustomerTab.Navigator>
  );
}

function ArtistTabs() {
  return (
    <ArtistTab.Navigator screenOptions={tabScreenOptions}>
      <ArtistTab.Screen
        name="Dashboard"
        component={ArtistDashboardScreen}
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('grid', 'grid-outline') }}
      />
      <ArtistTab.Screen
        name="Requests"
        component={ArtistBookingsScreen}
        options={{ title: 'Requests', tabBarIcon: tabIcon('clipboard', 'clipboard-outline') }}
      />
      <ArtistTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: false, tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </ArtistTab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Loader message="Loading…" />;

  const isArtist = user?.role === 'ARTIST';

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify OTP' }} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={isArtist ? ArtistTabs : CustomerTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} options={{ title: 'Artist' }} />
            <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Confirm Booking' }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
            <Stack.Screen
              name="ArtistProfileEdit"
              component={ArtistProfileEditScreen}
              options={{ title: 'Edit Profile' }}
            />
            <Stack.Screen
              name="ArtistServices"
              component={ArtistServicesScreen}
              options={{ title: 'Services & Pricing' }}
            />
            <Stack.Screen
              name="ArtistAvailability"
              component={ArtistAvailabilityScreen}
              options={{ title: 'Availability' }}
            />
            <Stack.Screen
              name="ArtistPortfolio"
              component={ArtistPortfolioScreen}
              options={{ title: 'Portfolio' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}