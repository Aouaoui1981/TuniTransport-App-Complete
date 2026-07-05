// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — application root (STEP 6)
// AuthProvider → DataProvider → NavigationContainer
// StripeProvider is attached only when a publishable key is configured,
// via a dynamic require so demo mode still runs in Expo Go.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';
import { IS_STRIPE_LIVE, STRIPE_PUBLISHABLE_KEY } from './src/services/stripe';

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
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </DataProvider>
    </AuthProvider>
  );
}

export default function App() {
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
