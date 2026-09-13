//RootNavigator
import React, { useEffect, useState } from "react";
import { useTheme } from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import AuthNavigator from "./AuthNavigator";
import MainTabs from "./MainTabs";
import SplashScreen from "../components/SplashScreen";

const MIN_SPLASH_MS = 2000;

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const theme = useTheme();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (loading || !minTimeElapsed) {
    return <SplashScreen tintColor={theme.colors.primary} backgroundColor={theme.colors.background} fontsReady />;
  }

  return user ? <MainTabs /> : <AuthNavigator />;
}