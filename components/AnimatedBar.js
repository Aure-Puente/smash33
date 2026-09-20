//Importaciones:
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { useTheme } from "react-native-paper";
import { RADIUS } from "../theme";

//JS:
export default function AnimatedBar({
  value = 0,
  max = 1,
  resetKey,
  color,
  trackColor,
  height = 12,
  radius = RADIUS.sm,
  style,
}) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: pct,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, resetKey]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  return (
    <View
      style={[
        { height, borderRadius: radius, overflow: "hidden", backgroundColor: trackColor ?? theme.colors.surfaceVariant },
        style,
      ]}
    >
      <Animated.View
        style={{ height: "100%", borderRadius: radius, width, backgroundColor: color ?? theme.colors.primary }}
      />
    </View>
  );
}