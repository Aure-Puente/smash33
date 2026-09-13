//Importaciones:
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

//JS:
const FALLBACK_RED = "#F0303A";
const FALLBACK_BG = "#0A0A0E";

export default function SplashScreen({ tintColor = FALLBACK_RED, backgroundColor = FALLBACK_BG, fontsReady = false }) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fade]);

  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.View style={{ alignItems: "center", opacity: fade, transform: [{ translateY }] }}>
        <View style={[styles.logoGlowWrap, { shadowColor: tintColor }]}>
          <Image
            source={require("../assets/logo.webp")}
            style={[styles.logo, { tintColor }]}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.brandText, fontsReady && styles.brandTextRajdhani]}>
          Smash<Text style={{ color: tintColor }}>33</Text>
        </Text>

        <View style={styles.loadingChip}>
          <Animated.View style={[styles.loadingDot, { backgroundColor: tintColor, opacity: pulse }]} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoGlowWrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
    marginBottom: -22,
  },
  logo: { width: 216, height: 216 },
  brandText: {
    color: "#F4F3F8",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandTextRajdhani: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 26,
    fontWeight: undefined,
  },
  loadingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 28,
  },
  loadingDot: { width: 8, height: 8, borderRadius: 999, marginRight: 8 },
  loadingText: { color: "#9794A3", fontSize: 13, fontWeight: "600" },
});