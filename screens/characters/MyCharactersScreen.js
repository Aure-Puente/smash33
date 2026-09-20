//Importaciones:
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, IconButton, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getAllCharacters } from "../../services/charactersService";
import { addMyCharacter, getMyCharacterWinCounts, listenMyCharacters, removeMyCharacter } from "../../services/firestoreService";
import CharacterPickerModal from "../../components/CharacterPickerModal";
import ScreenHeader from "../../components/ScreenHeader";
import { SkeletonRow } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";

//JS:
const TOP_GOLD_BORDER = "rgba(242,184,75,0.6)";
const TOP_GOLD_BG = "rgba(242,184,75,0.16)";

export default function MyCharactersScreen({ navigation }) {
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [allCharacters, setAllCharacters] = useState([]);
  const [myCharacterIds, setMyCharacterIds] = useState([]);
  const [wins, setWins] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [mineLoaded, setMineLoaded] = useState(false);

  useEffect(() => {
    getAllCharacters()
      .then((list) => { setAllCharacters(list); setCatalogLoaded(true); })
      .catch((e) => { console.log("Error cargando personajes:", e.message); setCatalogLoaded(true); });
    const unsub = listenMyCharacters(user.uid, (docs) => {
      setMyCharacterIds(docs.map((d) => d.characterId));
      setMineLoaded(true);
    });
    return unsub;
  }, [user.uid]);

  const loadWins = useCallback(() => {
    getMyCharacterWinCounts(user.uid).then(setWins).catch((e) => console.log("Error cargando victorias:", e.message));
  }, [user.uid]);

  useFocusEffect(loadWins);

  const myCharacters = allCharacters
    .filter((c) => myCharacterIds.includes(c.fighterNumber))
    .map((c) => ({ ...c, wins: wins[c.fighterNumber] || 0 }))
    .sort((a, b) => b.wins - a.wins);

  const availableToAdd = allCharacters.filter((c) => !myCharacterIds.includes(c.fighterNumber));
  const loading = !catalogLoaded || !mineLoaded;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: SPACING.l, paddingTop: insets.top + SPACING.l }}>
      <ScreenHeader title="Mis personajes" logo onBack={() => navigation.navigate("MoreHome")} />

      <Button
        mode="contained"
        icon="plus-circle"
        style={styles.addBtn}
        contentStyle={styles.addBtnContent}
        labelStyle={styles.addBtnLabel}
        onPress={() => setPickerOpen(true)}
      >
        Agregar personaje
      </Button>

      {loading ? (
        <View>
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
        </View>
      ) : myCharacters.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
            Todavía no agregaste personajes.{"\n"}Tocá "Agregar personaje" para sumar los que sueles usar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={myCharacters}
          keyExtractor={(item) => item.fighterNumber}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.s }} />}
          renderItem={({ item, index }) => {
            const isTop = index === 0 && item.wins > 0;
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                  isTop && { borderColor: TOP_GOLD_BORDER },
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: theme.colors.surfaceVariant },
                    isTop && { backgroundColor: TOP_GOLD_BG },
                  ]}
                >
                  {isTop ? (
                    <MaterialCommunityIcons name="crown" size={13} color={theme.custom.gold} />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.onSurfaceVariant }}>{index + 1}</Text>
                  )}
                </View>
                <View style={[styles.iconFrame, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Image source={{ uri: item.images?.iconImage }} style={styles.icon} />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.m }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>{item.name}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {item.wins} {item.wins === 1 ? "combate ganado" : "combates ganados"}
                  </Text>
                </View>
                <IconButton icon="close" size={18} onPress={() => removeMyCharacter(user.uid, item.fighterNumber)} />
              </View>
            );
          }}
        />
      )}

      <CharacterPickerModal
        visible={pickerOpen}
        onDismiss={() => setPickerOpen(false)}
        characters={availableToAdd}
        title="Agregar a mis personajes"
        onSelect={(c) => {
          addMyCharacter(user.uid, c.fighterNumber);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { borderRadius: RADIUS.pill, marginBottom: SPACING.l, width: "100%", alignSelf: "center" },
  addBtnContent: { paddingVertical: SPACING.xs },
  addBtnLabel: { fontSize: 15, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.xxl },
  card: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.lg, borderWidth: 1,
    paddingVertical: SPACING.s, paddingHorizontal: SPACING.m,
  },
  rankBadge: {
    width: 24, height: 24, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", marginRight: SPACING.m,
  },
  iconFrame: {
    width: 46, height: 46, borderRadius: RADIUS.sm,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  icon: { width: "100%", height: "100%" },
});