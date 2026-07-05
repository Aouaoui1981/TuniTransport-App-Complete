// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — navigation (STEP 6)
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { registerForPushNotifications } from '../services/notifications';
import { COLORS } from '../utils/theme';
import { ShipmentType, UserRole } from '../types';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
// Sender screens
import SenderHomeScreen from '../screens/sender/SenderHomeScreen';
import ShipmentsScreen from '../screens/sender/ShipmentsScreen';
import CreateShipmentScreen from '../screens/sender/CreateShipmentScreen';
// Transporter screens
import TransporterHomeScreen from '../screens/transporter/TransporterHomeScreen';
import AvailableShipmentsScreen from '../screens/transporter/AvailableShipmentsScreen';
import CreateRouteScreen from '../screens/transporter/CreateRouteScreen';
// Shared screens
import ShipmentDetailScreen from '../screens/shared/ShipmentDetailScreen';
import TrackingScreen from '../screens/shared/TrackingScreen';
import BidListScreen from '../screens/shared/BidListScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import PaymentScreen from '../screens/shared/PaymentScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import RateUserScreen from '../screens/shared/RateUserScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import MapScreen from '../screens/shared/MapScreen';

// ── Param lists ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: { role?: UserRole } | undefined;
  Main: undefined;
  ShipmentDetail: { shipmentId: string };
  Tracking: { shipmentId: string };
  BidList: { shipmentId: string };
  Chat: { conversationId: string };
  Payment: { shipmentId: string; amount: number };
  CreateShipment: { type?: ShipmentType } | undefined;
  CreateRoute: undefined;
  RateUser: { shipmentId: string };
  EditProfile: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;
export function useAppNavigation() {
  return useNavigation<AppNavigation>();
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ── Role-based bottom tabs ───────────────────────────────────────────────

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Accueil: 'home',
  Envois: 'cube',
  Demandes: 'search',
  Carte: 'map',
  Messages: 'chatbubbles',
  Profil: 'person',
};

function MainTabs() {
  const { user } = useAuth();
  const isSender = user?.role === 'sender';
  const tint = isSender ? COLORS.primary : COLORS.secondary;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const base = TAB_ICONS[route.name] ?? 'ellipse';
          const name = focused ? base : (`${base}-outline` as keyof typeof Ionicons.glyphMap);
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      {isSender ? (
        <>
          <Tab.Screen name="Accueil" component={SenderHomeScreen} />
          <Tab.Screen name="Envois" component={ShipmentsScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Accueil" component={TransporterHomeScreen} />
          <Tab.Screen name="Demandes" component={AvailableShipmentsScreen} />
        </>
      )}
      <Tab.Screen name="Carte" component={MapScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root navigator ───────────────────────────────────────────────────────

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications(user?.id).catch(() => undefined);
    }
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} />
          <Stack.Screen name="BidList" component={BidListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="CreateShipment" component={CreateShipmentScreen} />
          <Stack.Screen name="CreateRoute" component={CreateRouteScreen} />
          <Stack.Screen name="RateUser" component={RateUserScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
