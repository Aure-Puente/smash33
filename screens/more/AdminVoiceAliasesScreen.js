//Importaciones:
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, TextInput as RNTextInput, View } from "react-native";
import { Avatar, Button, IconButton, Modal, Portal, Searchbar, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/ScreenHeader";
import { Skeleton } from "../../components/Skeleton";
import { getAllUsers } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import {
  listenVoiceAliases,
  resetCharacterAliases,
  resetPlayerAliases,
  saveCharacterAliases,
  savePlayerAliases,
} from "../../services/voiceAliasesService";
import {
  characterKey,
  defaultCharacterAliases,
  defaultPlayerAliases,
  getCharacterAliases,
  getPlayerAliases,
} from "../../utils/voiceMatch";
import { RADIUS, SPACING } from "../../theme";
import { scale } from "../../utils/responsive";

//JS:
const TABS = [
  { key: "players", label: "Jugadores", icon: "account-group" },
  { key: "characters", label: "Personajes", icon: "sword-cross" },
];

const cleanAlias = (text) => (text || "").trim().replace(/\s+/g, " ").toLowerCase();
const plain = (text) => cleanAlias(text).normalize("NFD").replace(/[̀-ͯ]/g, "");

function TabSwitch({ theme, value, onChange }) {
  return (
    <View style={[styles.tabs, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.tab, active && { backgroundColor: theme.colors.primary }]}
          >
            <MaterialCommunityIcons
              name={t.icon}
              size={scale(18)}
              color={active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
            <Text
              style={{
                marginLeft: SPACING.xs,
                fontWeight: "700",
                color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EntityAvatar({ theme, item, size }) {
  if (item.kind === "player") {
    return item.photoURL ? (
      <Avatar.Image size={size} source={{ uri: item.photoURL }} />
    ) : (
      <Avatar.Text size={size} label={(item.name || "?").slice(0, 1).toUpperCase()} />
    );
  }
  return (
    <View style={[styles.charAvatar, { width: size, height: size, backgroundColor: theme.colors.surfaceVariant }]}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={{ width: size * 0.86, height: size * 0.86 }} resizeMode="contain" />
      ) : (
        <MaterialCommunityIcons name="sword-cross" size={size * 0.5} color={theme.colors.onSurfaceVariant} />
      )}
    </View>
  );
}

function AliasRow({ theme, item, onPress }) {
  const preview = item.aliases.slice(0, 4);
  const extra = item.aliases.length - preview.length;
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <EntityAvatar theme={theme} item={item} size={scale(42)} />
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface, flexShrink: 1 }}>
              {item.name}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: scale(11), marginLeft: SPACING.s }}>
              {item.aliases.length} alias
            </Text>
            {item.isCustom && (
              <View style={[styles.editedTag, { borderColor: theme.colors.primary }]}>
                <Text style={[styles.editedTagText, { color: theme.colors.primary }]}>EDITADO</Text>
              </View>
            )}
          </View>
          {preview.length ? (
            <View style={styles.previewWrap}>
              {preview.map((a) => (
                <View key={a} style={[styles.previewChip, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text numberOfLines={1} style={{ color: theme.colors.onPrimaryContainer, fontSize: scale(11) }}>
                    {a}
                  </Text>
                </View>
              ))}
              {extra > 0 && (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: scale(11), alignSelf: "center" }}>+{extra}</Text>
              )}
            </View>
          ) : (
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: scale(12), marginTop: 2, fontStyle: "italic" }}>
              Sin alias: solo se reconoce por su nombre
            </Text>
          )}
        </View>
        <View style={[styles.rowAction, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="pencil-outline" size={scale(18)} color={theme.colors.onSurfaceVariant} />
        </View>
      </View>
    </Pressable>
  );
}

function AliasEditorModal({ theme, item, otherItems, onClose, onSave, onReset }) {
  const [list, setList] = useState([]);
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setList(item ? [...item.aliases] : []);
    setInput("");
    setEditingIndex(null);
    setError("");
    setSaving(false);
  }, [item]);

  if (!item) return null;

  const conflicts = list
    .map((a) => {
      const owner = otherItems.find((o) => plain(o.name) === plain(a) || o.aliases.some((x) => plain(x) === plain(a)));
      return owner ? `"${a}" también es de ${owner.name}` : null;
    })
    .filter(Boolean);

  const dirty = JSON.stringify(list) !== JSON.stringify(item.aliases);

  function submitInput() {
    const value = cleanAlias(input);
    if (!value) return;
    if (plain(value) === plain(item.name)) {
      setError("Ese ya es su nombre, se reconoce siempre.");
      return;
    }
    const dupIndex = list.findIndex((a) => plain(a) === plain(value));
    if (dupIndex !== -1 && dupIndex !== editingIndex) {
      setError("Ese alias ya está en la lista.");
      return;
    }
    if (editingIndex != null) {
      setList((prev) => prev.map((a, i) => (i === editingIndex ? value : a)));
    } else {
      setList((prev) => [...prev, value]);
    }
    setInput("");
    setEditingIndex(null);
    setError("");
  }

  function startEdit(index) {
    setEditingIndex(index);
    setInput(list[index]);
    setError("");
    inputRef.current?.focus();
  }

  function removeAt(index) {
    setList((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setInput("");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(list);
      onClose();
    } catch (e) {
      setError("No se pudo guardar. Probá de nuevo.");
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await onReset();
      onClose();
    } catch (e) {
      setError("No se pudo restaurar. Probá de nuevo.");
      setSaving(false);
    }
  }

  return (
    <Modal
      visible
      onDismiss={() => (saving ? null : onClose())}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
    >
      <View style={[styles.modalHero, { backgroundColor: theme.colors.primaryContainer }]}>
        <View style={[styles.heroCircle, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.heroAvatarRing, { borderColor: theme.colors.surface, backgroundColor: theme.colors.surface }]}>
          <EntityAvatar theme={theme} item={item} size={scale(60)} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <Text
            variant="titleLarge"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: theme.colors.onPrimaryContainer, fontWeight: "800" }}
          >
            {item.name}
          </Text>
          <Text style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8, fontSize: scale(12) }}>
            Su nombre se reconoce siempre
          </Text>
        </View>
        <IconButton
          icon="close"
          size={scale(20)}
          disabled={saving}
          onPress={onClose}
          iconColor={theme.colors.onPrimaryContainer}
          style={styles.closeBtn}
        />
      </View>

      <View style={styles.modalBody}>
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          {editingIndex != null ? "EDITANDO ALIAS" : "AGREGAR ALIAS"}
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: theme.colors.background,
              borderColor: editingIndex != null || input ? theme.colors.primary : theme.colors.outline,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={editingIndex != null ? "pencil" : "microphone-plus"}
            size={scale(18)}
            color={editingIndex != null || input ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <RNTextInput
            ref={inputRef}
            value={input}
            onChangeText={(t) => {
              setInput(t);
              if (error) setError("");
            }}
            onSubmitEditing={submitInput}
            placeholder={editingIndex != null ? "Editar alias" : "Cómo le dicen (ej: juancho)"}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit={false}
            style={[styles.input, { color: theme.colors.onSurface }]}
          />
          {editingIndex != null && (
            <IconButton
              icon="close"
              size={scale(18)}
              onPress={() => {
                setEditingIndex(null);
                setInput("");
              }}
              style={{ margin: 0 }}
            />
          )}
          <Button
            mode="contained"
            compact
            disabled={!cleanAlias(input)}
            onPress={submitInput}
            style={{ borderRadius: RADIUS.pill }}
            labelStyle={{ marginHorizontal: SPACING.m }}
          >
            {editingIndex != null ? "Listo" : "Agregar"}
          </Button>
        </View>
        {error ? (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={scale(14)} color={theme.colors.error} />
            <Text style={{ color: theme.colors.error, fontSize: scale(12), marginLeft: SPACING.xs }}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant, marginBottom: 0 }]}>
            ALIAS GUARDADOS
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: scale(11), fontWeight: "800" }}>{list.length}</Text>
          </View>
        </View>

        <ScrollView
          style={[styles.chipsBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.outline }]}
          contentContainerStyle={{ padding: SPACING.m }}
          keyboardShouldPersistTaps="handled"
        >
          {list.length ? (
            <View style={styles.chipsWrap}>
              {list.map((a, i) => {
                const editing = i === editingIndex;
                return (
                  <View
                    key={`${a}-${i}`}
                    style={[
                      styles.chip,
                      editing
                        ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        : { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                    ]}
                  >
                    <Pressable onPress={() => startEdit(i)} style={{ flexShrink: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{ color: editing ? theme.colors.onPrimary : theme.colors.onSurface, fontWeight: "600" }}
                      >
                        {a}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => removeAt(i)} hitSlop={8} style={{ marginLeft: SPACING.s }}>
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={scale(17)}
                        color={editing ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="microphone-question" size={scale(28)} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: SPACING.xs }}>
                Todavía no tiene alias.
              </Text>
            </View>
          )}
        </ScrollView>
        {list.length > 0 && (
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: scale(11), marginTop: SPACING.xs }}>
            Tocá un alias para editarlo, o la cruz para borrarlo.
          </Text>
        )}

        {conflicts.length > 0 && (
          <View style={[styles.warning, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="alert-outline" size={scale(16)} color={theme.colors.onErrorContainer} />
            <Text style={{ flex: 1, marginLeft: SPACING.xs, color: theme.colors.onErrorContainer, fontSize: scale(12) }}>
              Ojo, la voz los puede confundir: {conflicts.join(" · ")}
            </Text>
          </View>
        )}

        {item.isCustom && item.hasDefaults && (
          <Button
            mode="text"
            icon="restore"
            disabled={saving}
            onPress={handleReset}
            style={{ marginTop: SPACING.s, alignSelf: "flex-start" }}
            compact
          >
            Volver a los alias originales
          </Button>
        )}
      </View>

      <View style={[styles.modalActions, { borderTopColor: theme.colors.outline }]}>
        <Button
          mode="outlined"
          disabled={saving}
          style={{ flex: 1, borderRadius: RADIUS.pill, marginRight: SPACING.s }}
          contentStyle={{ paddingVertical: 2 }}
          onPress={onClose}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          icon="content-save-outline"
          loading={saving}
          disabled={saving || !dirty}
          style={{ flex: 1, borderRadius: RADIUS.pill }}
          contentStyle={{ paddingVertical: 2 }}
          onPress={handleSave}
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
}

export default function AdminVoiceAliasesScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState("players");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [stored, setStored] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); 

  useEffect(() => {
    let alive = true;
    Promise.all([getAllUsers(), getAllCharacters()]).then(([u, c]) => {
      if (!alive) return;
      setUsers([...u].sort((a, b) => (a.playerName || "").localeCompare(b.playerName || "")));
      setCharacters(c);
      setLoading(false);
    });
    const unsub = listenVoiceAliases((data) => alive && setStored(data));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const playerItems = useMemo(
    () =>
      users.map((u) => ({
        kind: "player",
        id: u.uid,
        name: u.playerName,
        photoURL: u.photoURL,
        aliases: getPlayerAliases(u),
        isCustom: Array.isArray(stored?.players?.[u.uid]),
        hasDefaults: defaultPlayerAliases(u).length > 0,
      })),
    [users, stored]
  );

  const characterItems = useMemo(
    () =>
      characters.map((c) => ({
        kind: "character",
        id: characterKey(c),
        name: c.name,
        image: c.images?.iconImage,
        aliases: getCharacterAliases(c),
        isCustom: Array.isArray(stored?.characters?.[characterKey(c)]),
        hasDefaults: defaultCharacterAliases(c).length > 0,
      })),
    [characters, stored]
  );

  const items = tab === "players" ? playerItems : characterItems;
  const q = plain(search);
  const visible = q
    ? items.filter((it) => plain(it.name).includes(q) || it.aliases.some((a) => plain(a).includes(q)))
    : items;

  const editingItem = editing ? (editing.kind === "player" ? playerItems : characterItems).find((i) => i.id === editing.id) : null;
  const otherItems = editingItem
    ? (editingItem.kind === "player" ? playerItems : characterItems).filter((i) => i.id !== editingItem.id)
    : [];

  async function handleSave(list) {
    if (editingItem.kind === "player") await savePlayerAliases(editingItem.id, list);
    else await saveCharacterAliases(editingItem.id, list);
  }

  async function handleReset() {
    if (editingItem.kind === "player") await resetPlayerAliases(editingItem.id);
    else await resetCharacterAliases(editingItem.id);
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l, paddingBottom: SPACING.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Alias de voz" subtitle="Panel de Admin" logo onBack={() => navigation.goBack()} />

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.m }}>
          Cómo le dicen ustedes a cada jugador y personaje. Los cambios se usan al instante en el torneo en curso.
        </Text>

        <TabSwitch
          theme={theme}
          value={tab}
          onChange={(t) => {
            setTab(t);
            setSearch("");
          }}
        />

        <Searchbar
          placeholder={tab === "players" ? "Buscar jugador o alias" : "Buscar personaje o alias"}
          value={search}
          onChangeText={setSearch}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
          inputStyle={{ minHeight: 0 }}
        />

        {loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Skeleton width={scale(42)} height={scale(42)} radius={RADIUS.pill} />
              <View style={{ marginLeft: SPACING.m, flex: 1 }}>
                <Skeleton width="45%" height={scale(14)} />
                <Skeleton width="70%" height={scale(12)} style={{ marginTop: SPACING.xs }} />
              </View>
            </View>
          ))
        ) : visible.length ? (
          visible.map((it) => (
            <AliasRow key={it.id} theme={theme} item={it} onPress={() => setEditing({ kind: it.kind, id: it.id })} />
          ))
        ) : (
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: SPACING.xl }}>
            No encontré nada con "{search}".
          </Text>
        )}
      </ScrollView>

      <Portal>
        {editingItem && (
          <AliasEditorModal
            theme={theme}
            item={editingItem}
            otherItems={otherItems}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onReset={handleReset}
          />
        )}
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    padding: 4,
    marginBottom: SPACING.m,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.s,
  },
  search: { borderRadius: RADIUS.pill, marginBottom: SPACING.m, elevation: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  charAvatar: { borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  previewWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: SPACING.xs },
  previewChip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.s,
    paddingVertical: 2,
    marginRight: SPACING.xs,
    marginTop: 2,
    maxWidth: scale(140),
  },
  rowAction: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.s,
  },
  editedTag: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: SPACING.s,
  },
  editedTagText: { fontSize: scale(8), fontWeight: "800", letterSpacing: 0.6 },

  modal: {
    alignSelf: "center",
    width: "92%",
    maxWidth: 560,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalHero: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.l,
    paddingRight: SPACING.s,
    overflow: "hidden",
  },
  heroCircle: {
    position: "absolute",
    right: -scale(50),
    top: -scale(60),
    width: scale(170),
    height: scale(170),
    borderRadius: scale(85),
    opacity: 0.12,
  },
  heroAvatarRing: {
    borderWidth: 3,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
  },
  closeBtn: { alignSelf: "flex-start", margin: 0 },
  modalBody: { padding: SPACING.l, paddingBottom: SPACING.s },
  sectionLabel: { fontSize: scale(10), fontWeight: "800", letterSpacing: 1, marginBottom: SPACING.s },
  errorRow: { flexDirection: "row", alignItems: "center", marginTop: SPACING.xs },
  listHeader: { flexDirection: "row", alignItems: "center", marginTop: SPACING.l, marginBottom: SPACING.s },
  countBadge: {
    marginLeft: SPACING.s,
    minWidth: scale(22),
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.pill,
    alignItems: "center",
  },
  chipsBox: { maxHeight: scale(240), borderRadius: RADIUS.lg, borderWidth: 1 },
  emptyBox: { alignItems: "center", paddingVertical: SPACING.m },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    paddingLeft: SPACING.m,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: { flex: 1, marginLeft: SPACING.s, fontSize: scale(15), paddingVertical: SPACING.xs },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs + 2,
    marginRight: SPACING.s,
    marginBottom: SPACING.s,
    maxWidth: "100%",
  },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: RADIUS.md,
    padding: SPACING.s,
    marginTop: SPACING.s,
  },
  modalActions: {
    flexDirection: "row",
    padding: SPACING.l,
    paddingTop: SPACING.m,
    borderTopWidth: 1,
  },
});