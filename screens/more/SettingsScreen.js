//Importaciones:
import React from "react";
import { View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/ScreenHeader";
import { SPACING } from "../../theme";

//JS:
export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: SPACING.l, paddingTop: insets.top + SPACING.l }}>
      <ScreenHeader title="Ajustes" onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: SPACING.xxxl }}>
        <MaterialCommunityIcons name="cog-outline" size={40} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginTop: SPACING.m, textAlign: "center" }}>
          Próximamente
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs, textAlign: "center" }}>
          Esta sección todavía está en construcción.
        </Text>
      </View>
    </View>
  );
}