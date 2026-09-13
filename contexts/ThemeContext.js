//Importaciones:
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ACCENTS, DEFAULT_ACCENT, buildTheme } from "../theme";

//JS:
const ACCENT_KEY = "smash33_accent_color";
const ThemeModeContext = createContext(null);
const FIXED_SCHEME = "dark";

export function ThemeModeProvider({ children }) {
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    AsyncStorage.getItem(ACCENT_KEY).then((saved) => {
      if (saved && ACCENTS[saved]) setAccentState(saved);
    });
  }, []);

  async function setAccent(newAccent) {
    if (!ACCENTS[newAccent]) return;
    setAccentState(newAccent);
    await AsyncStorage.setItem(ACCENT_KEY, newAccent);
  }

  const theme = useMemo(() => buildTheme(accent, FIXED_SCHEME), [accent]);

  return (
    <ThemeModeContext.Provider value={{ accent, setAccent, effectiveScheme: FIXED_SCHEME, theme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
