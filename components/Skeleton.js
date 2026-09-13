//Importaciones:
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { RADIUS, SPACING } from "../theme";

//JS:
export function Skeleton({ width = "100%", height = 16, radius = RADIUS.sm, style }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceVariant, opacity }, style]}
    />
  );
}

export function SkeletonRow({ style }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }, style]}>
      <Skeleton width={44} height={44} radius={RADIUS.pill} />
      <View style={{ flex: 1, marginLeft: SPACING.m }}>
        <Skeleton width="60%" height={14} style={{ marginBottom: SPACING.xs }} />
        <Skeleton width="35%" height={11} />
      </View>
    </View>
  );
}

export function SkeletonCard({ height = 100, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, height }, style]}>
      <Skeleton width="55%" height={14} style={{ marginBottom: SPACING.s }} />
      <Skeleton width="80%" height={11} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.m,
  },
  card: {
    borderRadius: RADIUS.lg, borderWidth: 1,
    padding: SPACING.l, justifyContent: "center",
  },
});
