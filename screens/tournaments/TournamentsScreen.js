//Importaciones:
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listenActiveTournament } from "../../services/firestoreService";
import { RADIUS, SPACING } from "../../theme";
import { scale } from "../../utils/responsive";
import { Skeleton } from "../../components/Skeleton";

//JS:
export default function TournamentsScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTournament, setActiveTournament] = useState(undefined); 
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterY = useRef(new Animated.Value(10)).current;
  const enterScale = useRef(new Animated.Value(0.985)).current;

  const runEnter = useCallback(() => {
    enterOpacity.setValue(0);
    enterY.setValue(10);
    enterScale.setValue(0.985);

    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterY, enterScale]);

  useFocusEffect(
    useCallback(() => {
      runEnter();
      return undefined;
    }, [runEnter])
  );

  useEffect(() => {
    const unsub = listenActiveTournament(setActiveTournament);
    return unsub;
  }, []);

  useEffect(() => {
    if (activeTournament) {
      navigation.replace("TournamentDetail", { tournamentId: activeTournament.id });
    }
  }, [activeTournament, navigation]);

  if (activeTournament === undefined || activeTournament) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background, paddingHorizontal: SPACING.xxl, paddingTop: insets.top },
        ]}
      >
        <Skeleton width={scale(84)} height={scale(84)} radius={RADIUS.xl} style={{ marginBottom: SPACING.l }} />
        <Skeleton width="70%" height={scale(20)} style={{ marginBottom: SPACING.s }} />
        <Skeleton width="90%" height={scale(14)} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.center,
        {
          backgroundColor: theme.colors.background,
          paddingHorizontal: SPACING.xxl,
          paddingTop: insets.top,
          opacity: enterOpacity,
          transform: [{ translateY: enterY }, { scale: enterScale }],
        },
      ]}
    >
      <View style={styles.logoArea}>
        <View style={[styles.logoHalo, { backgroundColor: theme.colors.primaryContainer }]} />
        <Image
          source={require("../../assets/logo.webp")}
          style={[styles.logo, { tintColor: theme.colors.primary }]}
          resizeMode="contain"
        />
      </View>
      <Text variant="headlineMedium" style={{ marginBottom: SPACING.xs, textAlign: "center", color: theme.colors.onBackground }}>
        Crear Torneo
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: SPACING.xxl }}>
        Cuando arranques uno, todo el grupo lo va a ver en vivo acá.
      </Text>
      <Button
        mode="contained"
        style={styles.bigButton}
        contentStyle={{ paddingVertical: SPACING.s }}
        onPress={() => navigation.navigate("CreateTournament")}
      >
        ¡Smash!
      </Button>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoArea: {
    width: scale(190),
    height: scale(190),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  logoHalo: {
    position: "absolute",
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    opacity: 0.6,
  },
  logo: { width: scale(168), height: scale(168) },
  bigButton: { borderRadius: RADIUS.pill, width: "100%" },
});