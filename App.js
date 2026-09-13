// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold } from "@expo-google-fonts/rajdhani";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeModeProvider, useThemeMode } from "./contexts/ThemeContext";
import RootNavigator from "./navigation/RootNavigator";
import SplashScreen from "./components/SplashScreen";

function AppInner() {
  const { theme, effectiveScheme } = useThemeMode();

  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <NavigationContainer
          theme={{
            dark: effectiveScheme === "dark",
            colors: {
              background: theme.colors.background,
              card: theme.colors.surface,
              text: theme.colors.onSurface,
              border: theme.colors.outline,
              primary: theme.colors.primary,
              notification: theme.colors.error,
            },
          }}
        >
          <StatusBar style={effectiveScheme === "dark" ? "light" : "dark"} />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!fontsLoaded) {
    return <SplashScreen fontsReady={false} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeModeProvider>
        <AppInner />
      </ThemeModeProvider>
    </SafeAreaProvider>
  );
}