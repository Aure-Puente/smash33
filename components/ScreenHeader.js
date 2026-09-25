//Importaciones:
import { Image, StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RADIUS, SPACING } from "../theme";
import { scale } from "../utils/responsive";

//JS:
export default function ScreenHeader({ title, subtitle, onBack, icon, logo, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, style]}>
      {onBack && (
        <IconButton icon="arrow-left" size={scale(22)} onPress={onBack} style={styles.backBtn} />
      )}
      {logo ? (
        <Image
          source={require("../assets/logo.webp")}
          style={[styles.logo, { tintColor: theme.colors.primary }]}
          resizeMode="contain"
        />
      ) : (
        icon && (
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name={icon} size={scale(18)} color={theme.colors.primary} />
          </View>
        )
      )}
      <View style={{ flex: 1 }}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>{title}</Text>
        {subtitle && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.l },
  backBtn: { marginLeft: -SPACING.s, marginRight: SPACING.xs },
  iconBadge: {
    width: scale(34), height: scale(34), borderRadius: RADIUS.sm,
    alignItems: "center", justifyContent: "center", marginRight: SPACING.s,
  },
  logo: { width: scale(42), height: scale(42), marginRight: SPACING.s },
});