import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading, licenseStatus } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const isLicenseUpload = segments[0] === 'licencia';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/auth');
      }
    } else if (session.accessKind === 'chofer') {
      if (!licenseStatus) return; // Wait for license fetch
      
      const isInvalid = !licenseStatus.isValid && licenseStatus.status !== 'EXPIRING_SOON';
      
      if (isInvalid) {
        if (!isLicenseUpload) {
          router.replace('/licencia/upload');
        }
      } else {
        if (inAuthGroup || isLicenseUpload) {
          router.replace('/(tabs)');
        }
      }
    } else {
      if (inAuthGroup) {
        router.replace('/cliente/(tabs)');
      }
    }
  }, [session, isLoading, segments, licenseStatus]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cliente" />
        <Stack.Screen name="licencia/upload" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
