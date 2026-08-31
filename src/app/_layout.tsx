import { Stack } from 'expo-router';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { AuthProvider } from '../lib/AuthContext';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

LogBox.ignoreLogs([
  'Unknown event handler property `onPressIn`',
  'Unknown event handler property onPressIn',
  'TouchableMixin is deprecated',
]);

// Filter out benign React-DOM web warnings for third-party SVG / chart libraries
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('onPressIn') ||
        args[0].includes('Unknown event handler property') ||
        args[0].includes('TouchableMixin') ||
        // react-native-svg emits kebab-case DOM prop `transform-origin` on web;
        // React DOM (v19) warns about it. This is internal to WebShape.js and
        // cannot be fixed in application code — suppress the dev-only noise.
        args[0].includes('transform-origin'))
    ) {
      return;
    }
    originalError(...args);
  };

  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('onPressIn') ||
        args[0].includes('TouchableMixin') ||
        args[0].includes('Unknown event handler property'))
    ) {
      return;
    }
    originalWarn(...args);
  };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#12120F' }}>
        <ActivityIndicator size="large" color="#D4A237" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#12120F' } }} />
    </AuthProvider>
  );
}