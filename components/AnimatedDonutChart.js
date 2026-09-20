//Importaciones:
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text, useTheme } from "react-native-paper";
import { SPACING } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

//JS:
export default function AnimatedDonutChart({
    data,
    size = 180,
    strokeWidth = 26,
    animKey,
    centerValue,
    centerLabel,
    }) {
    const theme = useTheme();
    const progress = useRef(new Animated.Value(0)).current;

    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let cumulative = 0;
    const segments = data
        .filter((d) => d.value > 0)
        .map((d) => {
        const start = cumulative / total;
        cumulative += d.value;
        const end = cumulative / total;
        return { ...d, start, end, length: (d.value / total) * circumference };
        });

    useEffect(() => {
        progress.setValue(0);
        Animated.timing(progress, {
        toValue: 1,
        duration: 900,
        useNativeDriver: false,
        }).start();
    }, [animKey]);

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
            <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.colors.surfaceVariant}
            strokeWidth={strokeWidth}
            fill="none"
            />
            {segments.map((seg) => {
            const dashOffset = progress.interpolate({
                inputRange: [seg.start, seg.end],
                outputRange: [seg.length, 0],
                extrapolate: "clamp",
            });
            return (
                <AnimatedCircle
                key={seg.label}
                cx={center}
                cy={center}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="butt"
                strokeDasharray={`${seg.length} ${circumference}`}
                strokeDashoffset={dashOffset}
                rotation={-90 + seg.start * 360}
                origin={`${center}, ${center}`}
                />
            );
            })}
        </Svg>
        {centerValue !== undefined && (
            <View style={{ position: "absolute", alignItems: "center" }}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>{centerValue}</Text>
            {centerLabel && (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -2 }}>
                {centerLabel}
                </Text>
            )}
            </View>
        )}
        </View>
    );
}