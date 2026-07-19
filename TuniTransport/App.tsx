// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — application root (STEP 6)
// AuthProvider → DataProvider → NavigationContainer
// StripeProvider is attached only when a publishable key is configured,
// via a dynamic require so demo mode still runs in Expo Go.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';
import AppAlertHost from './src/components/AppAlert';
import { COLORS } from './src/utils/theme';
import { injectWebStyles } from './src/utils/webStyles';
import { injectPWA } from './src/utils/pwa';
import { initMonitoring } from './src/utils/monitoring';
import { IS_STRIPE_LIVE, STRIPE_PUBLISHABLE_KEY } from './src/services/stripe';

// Suivi des erreurs (Sentry) — actif seulement si un DSN est configuré.
initMonitoring();
// Neutralise le contour bleu natif des champs sur le web (Safari/Chrome).
injectWebStyles();
// Active « Ajouter à l'écran d'accueil » (icône + plein écran) sur le web.
injectPWA();

// Thème de navigation sombre « Méditerranée nuit » — évite les flashs blancs
// pendant les transitions et sous les surfaces translucides.
const NavDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
    notification: COLORS.danger,
  },
};

let StripeProvider: React.ComponentType<any> | null = null;
if (IS_STRIPE_LIVE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
  } catch {
    StripeProvider = null;
  }
}

function Root() {
  return (
    <AuthProvider>
      <DataProvider>
        <NavigationContainer theme={NavDarkTheme}>
          <StatusBar style="light" />
          <AppNavigator />
          <AppAlertHost />
        </NavigationContainer>
      </DataProvider>
    </AuthProvider>
  );
}

export default function App() {
  // Charge « Plus Jakarta Sans » (police d'affichage). En cas d'échec, on rend
  // quand même l'app (repli sur la police système) — jamais de blocage.
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) {
    return null; // garde le splash sombre le temps du chargement
  }

  const content =
    StripeProvider && IS_STRIPE_LIVE ? (
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.tunitransport">
        <Root />
      </StripeProvider>
    ) : (
      <Root />
    );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{content}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
