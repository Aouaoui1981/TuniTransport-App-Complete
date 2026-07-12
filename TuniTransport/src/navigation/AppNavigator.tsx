// ──────────────────────────────────────────────────────────────────────────
// TuniTransport -- navigation (STEP 6)
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, NavigatorScreenParams } from '@react-navigation/native';
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
import MyDeliveriesScreen from '../screens/transporter/MyDeliveriesScreen';
import CreateRouteScreen from '../screens/transporter/CreateRouteScreen';
// Shared screens
import ShipmentDetailScreen from '../screens/shared/ShipmentDetailScreen';
import TrackingScreen from '../screens/shared/TrackingScreen';
import LiveTrackingScreen from '../screens/shared/LiveTrackingScreen';
import BidListScreen from '../screens/shared/BidListScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import PaymentScreen from '../screens/shared/PaymentScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import RateUserScreen from '../screens/shared/RateUserScreen';
import UserReviewsScreen from '../screens/shared/UserReviewsScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import MapScreen from '../screens/shared/MapScreen';
import IdentityVerificationScreen from '../screens/shared/IdentityVerificationScreen';
import AdminVerificationsScreen from '../screens/shared/AdminVerificationsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import LegalPageScreen from '../screens/shared/LegalPageScreen';
import WhitePaperScreen from '../screens/shared/WhitePaperScreen';
import { LEGAL_PAGES, LegalPageKey } from '../content/legal';

// ── Param lists ──────────────────────────────────────────────────────────

export type MainTabParamList = {
  Accueil: undefined;
  Envois: undefined;
  Demandes: { bidShipmentId?: string } | undefined;
  Livraisons: { filter?: 'all' | 'in_progress' | 'delivered' } | undefined;
  Carte: undefined;
  Messages: undefined;
  Profil: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: { role?: UserRole } | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ShipmentDetail: { shipmentId: string };
  Tracking: { shipmentId: string };
  LiveTracking: { shipmentId: string };
  BidList: { shipmentId: string };
  Chat: { conversationId: string };
  Payment: { shipmentId: string; amount: number };
  CreateShipment: { type?: ShipmentType; editShipmentId?: string } | undefined;
  CreateRoute: undefined;
  RateUser: { shipmentId: string };
  UserReviews: { userId: string; userName: string; rating?: number; totalRatings?: number };
  EditProfile: undefined;
  IdentityVerification: undefined;
  AdminVerifications: undefined;
  Notifications: undefined;
  Legal: { page: LegalPageKey };
  WhitePaper: undefined;
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
  Livraisons: 'checkmark-done',
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
          borderTopWidth: 0,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
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
          <Tab.Screen name="Livraisons" component={MyDeliveriesScreen} />
        </>
      )}
      <Tab.Screen name="Carte" component={MapScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root navigator ───────────────────────────────────────────────────────

// Native header (with back button) for sub-screens that don't render their
// own header — their SafeAreaView uses edges={['bottom']} and relies on it.
const SUBSCREEN_HEADER = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTintColor: COLORS.text,
  headerStyle: { backgroundColor: COLORS.surface },
  headerTitleStyle: { fontWeight: '700' as const, color: COLORS.text },
  headerShadowVisible: false,
};

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
          <Stack.Screen
            name="WhitePaper"
            component={WhitePaperScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Livre blanc' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="ShipmentDetail"
            component={ShipmentDetailScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Détail de l’envoi' }}
          />
          <Stack.Screen
            name="Tracking"
            component={TrackingScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Suivi de l’envoi' }}
          />
          <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
          <Stack.Screen
            name="BidList"
            component={BidListScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Offres reçues' }}
          />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Paiement' }}
          />
          <Stack.Screen name="CreateShipment" component={CreateShipmentScreen} />
          <Stack.Screen
            name="CreateRoute"
            component={CreateRouteScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Nouveau trajet' }}
          />
          <Stack.Screen
            name="RateUser"
            component={RateUserScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Évaluation' }}
          />
          <Stack.Screen
            name="UserReviews"
            component={UserReviewsScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Avis' }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Modifier le profil' }}
          />
          <Stack.Screen
            name="IdentityVerification"
            component={IdentityVerificationScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Vérification d’identité' }}
          />
          <Stack.Screen
            name="AdminVerifications"
            component={AdminVerificationsScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Vérifications (admin)' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Notifications' }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalPageScreen}
            options={({ route }) => ({
              ...SUBSCREEN_HEADER,
              title: LEGAL_PAGES[route.params.page].title,
            })}
          />
          <Stack.Screen
            name="WhitePaper"
            component={WhitePaperScreen}
            options={{ ...SUBSCREEN_HEADER, title: 'Livre blanc' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
