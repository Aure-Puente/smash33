//Importaciones;
import { FlatList, Image, StyleSheet, View } from "react-native";
import { IconButton, Modal, Portal, Text, TouchableRipple, useTheme } from "react-native-paper";
import { RADIUS, SPACING } from "../theme";

//JS:
export default function CharacterPickerModal({ visible, onDismiss, characters, disabledIds = [], onSelect, title, emptyMessage }) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      >
        <View style={styles.handle}>
          <View style={[styles.handleBar, { backgroundColor: theme.colors.outline }]} />
        </View>

        <View style={styles.header}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
            {title || "Elegí un personaje"}
          </Text>
          {onDismiss && <IconButton icon="close" size={20} onPress={onDismiss} />}
        </View>

        <FlatList
          data={characters}
          keyExtractor={(item) => item.fighterNumber}
          numColumns={3}
          contentContainerStyle={{ paddingBottom: SPACING.l }}
          renderItem={({ item }) => {
            const disabled = disabledIds.includes(item.fighterNumber);
            return (
              <TouchableRipple
                onPress={() => !disabled && onSelect(item)}
                style={styles.item}
                disabled={disabled}
                borderless
              >
                <View
                  style={[
                    styles.itemContent,
                    { backgroundColor: theme.colors.surfaceVariant },
                    disabled && { opacity: 0.4 },
                  ]}
                >
                  <View>
                    <Image source={{ uri: item.images?.iconImage }} style={styles.icon} />
                    {disabled && (
                      <View style={styles.crossOverlay}>
                        <Text style={[styles.crossText, { color: theme.colors.error }]}>✕</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.name}</Text>
                </View>
              </TouchableRipple>
            );
          }}
          ListEmptyComponent={
            <Text style={{ padding: SPACING.l, color: theme.colors.onSurfaceVariant }}>
              {emptyMessage || "No hay personajes para mostrar."}
            </Text>
          }
        />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: SPACING.l,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    maxHeight: "78%",
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.xs,
  },
  handle: { alignItems: "center", marginBottom: SPACING.s },
  handleBar: { width: 40, height: 4, borderRadius: RADIUS.pill },
  header: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s, paddingHorizontal: SPACING.xs },
  item: { flex: 1 / 3, padding: SPACING.xs },
  itemContent: { alignItems: "center", borderRadius: RADIUS.md, paddingVertical: SPACING.s },
  icon: { width: 56, height: 56, borderRadius: RADIUS.sm, marginBottom: SPACING.xs },
  crossOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 4, alignItems: "center", justifyContent: "center" },
  crossText: { fontSize: 28, fontWeight: "bold" },
  name: { fontSize: 11, textAlign: "center" },
});
