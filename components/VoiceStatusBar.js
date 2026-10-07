//Importaciones:
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RADIUS, SPACING } from "../theme";
import { scale } from "../utils/responsive";

//JS:
export default function VoiceStatusBar({ listening, muted, lastHeard, permissionDenied, onToggle }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!listening || muted) {
        pulse.setValue(0);
        return undefined;
        }
        const loop = Animated.loop(
        Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
        );
        loop.start();
        return () => loop.stop();
    }, [listening, muted, pulse]);

    const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

    let icon = "microphone";
    let label = "Preparando micrófono...";
    let accent = theme.colors.onSurfaceVariant;
    if (permissionDenied) {
        icon = "microphone-off";
        label = "Sin permiso de micrófono";
        accent = theme.colors.error;
    } else if (muted) {
        icon = "microphone-off";
        label = "Voz en pausa · tocá para activar";
    } else if (listening) {
        label = lastHeard ? `"${lastHeard}"` : "Escuchando...";
        accent = theme.colors.primary;
    }

    return (
        <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + SPACING.l }]}>
        <Pressable
            onPress={onToggle}
            disabled={permissionDenied}
            style={[styles.pill, { backgroundColor: theme.colors.surface, borderColor: accent }]}
        >
            <MaterialCommunityIcons name={icon} size={scale(18)} color={accent} />
            {listening && !muted && <Animated.View style={[styles.dot, { backgroundColor: accent, opacity: dotOpacity }]} />}
            <Text numberOfLines={1} style={{ marginLeft: SPACING.xs, color: theme.colors.onSurface, fontSize: scale(13), flexShrink: 1 }}>
            {label}
            </Text>
        </Pressable>
        </View>
    );
    }

    const styles = StyleSheet.create({
    wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: "88%",
        borderRadius: RADIUS.pill,
        borderWidth: 1.5,
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        elevation: 6,
    },
    dot: { width: scale(7), height: scale(7), borderRadius: scale(4), marginLeft: 6 },
});