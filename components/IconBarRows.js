//Importaciones:
import { Image, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { RADIUS, SPACING } from "../theme";

//JS:
export default function IconBarRows({ data, emptyMessage }) {
  const theme = useTheme();
  if (!data.length) {
    return <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.m }}>{emptyMessage || "Sin datos todavía."}</Text>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ marginBottom: SPACING.l }}>
      {data.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.iconColumn}>
            <Image source={{ uri: item.iconUrl }} style={[styles.icon, { backgroundColor: theme.colors.surfaceVariant }]} />
            {item.subLabel && (
              <Text style={[styles.subLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{item.subLabel}</Text>
            )}
          </View>
          <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={[styles.barFill, { backgroundColor: theme.colors.primary, width: `${(item.value / max) * 100}%` }]} />
          </View>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
  iconColumn: { width: 40, alignItems: "center", marginRight: SPACING.s },
  icon: { width: 32, height: 32, borderRadius: RADIUS.sm },
  subLabel: { fontSize: 10, marginTop: 2, maxWidth: 40, textAlign: "center" },
  barTrack: { flex: 1, height: 14, borderRadius: RADIUS.sm, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: RADIUS.sm },
  value: { width: 28, textAlign: "right", marginLeft: SPACING.s, fontSize: 12, fontWeight: "700" },
});
