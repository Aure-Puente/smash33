//Importaciones:
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/ScreenHeader";
import { RADIUS, SPACING } from "../../theme";
import { scale } from "../../utils/responsive";

//JS:
export default function BadgesScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: SPACING.l, paddingTop: insets.top + SPACING.l }}>
      <ScreenHeader title="Insignias" logo onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: SPACING.xxxl }}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="medal-outline" size={scale(40)} color={theme.colors.primary} />
        </View>
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

const styles = StyleSheet.create({
  iconWrap: {
    width: scale(76),
    height: scale(76),
    borderRadius: RADIUS.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
