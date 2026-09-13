//Importaciones:
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RADIUS, SPACING } from "../theme";

//JS:
const ICONS = {
  Inicio: "home-variant",
  Estadisticas: "chart-bar",
  Torneo: "trophy",
  Historial: "history",
  Perfil: "account-circle",
};

const LABELS = {
  Inicio: "Inicio",
  Estadisticas: "Stats",
  Torneo: "Torneo",
  Historial: "Historial",
  Perfil: "Perfil",
};

export default function AnimatedTabBar({ state, descriptors, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [innerWidth, setInnerWidth] = useState(0);
  const tabCount = state.routes.length;
  const tabWidth = innerWidth / tabCount;

  const indicatorX = useRef(new Animated.Value(0)).current;
  const bounceScales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const pressScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (innerWidth === 0) return;

    Animated.spring(indicatorX, {
      toValue: state.index * tabWidth + SPACING.s / 2,
      useNativeDriver: true,
      speed: 16,
      bounciness: 8,
    }).start();

    Animated.sequence([
      Animated.timing(bounceScales[state.index], { toValue: 1.22, duration: 110, useNativeDriver: true }),
      Animated.spring(bounceScales[state.index], { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
    ]).start();
  }, [state.index, innerWidth]);

  function handlePressIn(index) {
    Animated.spring(pressScales[index], { toValue: 0.85, useNativeDriver: true, speed: 20 }).start();
  }
  function handlePressOut(index) {
    Animated.spring(pressScales[index], { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, SPACING.m) }]}>
      <View
        style={[styles.bar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width - SPACING.s)}
      >
        {innerWidth > 0 && (
          <Animated.View
            style={[
              styles.capsule,
              {
                width: tabWidth - SPACING.s,
                backgroundColor: theme.colors.primaryContainer,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        )}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const color = isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onPressIn={() => handlePressIn(index)}
              onPressOut={() => handlePressOut(index)}
              style={styles.tabButton}
            >
              <Animated.View
                style={{
                  alignItems: "center",
                  transform: [{ scale: Animated.multiply(bounceScales[index], pressScales[index]) }],
                }}
              >
                <MaterialCommunityIcons name={ICONS[route.name]} size={22} color={color} />
                <Text style={[styles.label, { color }]}>{LABELS[route.name]}</Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.s,
  },
  bar: {
    flexDirection: "row",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.s,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  capsule: {
    position: "absolute",
    top: SPACING.s,
    bottom: SPACING.s,
    left: 0,
    borderRadius: RADIUS.lg,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xs,
  },
  label: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    marginTop: 2,
  },
});