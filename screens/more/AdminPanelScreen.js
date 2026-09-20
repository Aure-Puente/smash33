//Importaciones:
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAllUsers,
  getFinishedTournaments,
  getRankingSettings,
  getRounds,
  resetAllTournaments,
  saveSeasonHistory,
  setRankingIncludedUids,
} from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import { computeRankingData } from "../../utils/rankingCalc";
import { getSeasonInfo, SEASONS } from "../../utils/season";
import ScreenHeader from "../../components/ScreenHeader";
import { Skeleton } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";

//JS:
export default function AdminPanelScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState([]);
  const [includedUids, setIncludedUids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [allUsers, settings] = await Promise.all([getAllUsers(), getRankingSettings()]);
      setUsers(allUsers);
      setIncludedUids(settings.includedUids || []);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleIncluded(uid) {
    const next = includedUids.includes(uid) ? includedUids.filter((id) => id !== uid) : [...includedUids, uid];
    setSavingUid(uid);
    setIncludedUids(next);
    try {
      await setRankingIncludedUids(next);
    } catch (e) {
      setIncludedUids(includedUids);
    } finally {
      setSavingUid(null);
    }
  }

  async function handleConfirmReset() {
    setResetting(true);
    try {
      const now = new Date();
      const seasonInfo = getSeasonInfo(now);
      const season = SEASONS[seasonInfo.key];

      const [allUsers, finished, characters] = await Promise.all([getAllUsers(), getFinishedTournaments(), getAllCharacters()]);
      const roundsByTournament = await Promise.all(
        finished.map(async (t) => (await getRounds(t.id)).map((r) => ({ ...r, tournamentId: t.id })))
      );
      const allRounds = roundsByTournament.flat().filter((r) => r.roundNumber > 0);

      const { qualified, topCharacters } = computeRankingData({
        users: allUsers,
        finished,
        allRounds,
        allCharacters: characters,
        includedUids,
      });

      await saveSeasonHistory({
        seasonKey: seasonInfo.key,
        seasonLabel: season.label,
        start: seasonInfo.start,
        end: now,
        totalTournaments: finished.length,
        players: qualified,
        topCharacters,
      });

      await resetAllTournaments();
      setResetModalOpen(false);
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l, paddingBottom: SPACING.xxxl }}
      >
        <ScreenHeader title="Panel de Admin" subtitle="Solo vos ves esto" logo onBack={() => navigation.goBack()} />

        <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: SPACING.xs }}>
          Jugadores en el ranking
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.m }}>
          Elegís vos quién entra al Ranking Smash 33 (jugadores y personajes). Arranca vacío hasta que agregues gente.
        </Text>

        {loading ? (
          <View>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.userRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <Skeleton width={38} height={38} radius={RADIUS.pill} />
                <Skeleton width="45%" height={14} style={{ marginLeft: SPACING.m }} />
              </View>
            ))}
          </View>
        ) : (
          users.map((u) => {
            const included = includedUids.includes(u.uid);
            return (
              <Pressable key={u.uid} onPress={() => toggleIncluded(u.uid)} disabled={savingUid === u.uid}>
                <View
                  style={[
                    styles.userRow,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                    included && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <Avatar.Image size={38} source={{ uri: u.photoURL }} />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: SPACING.m,
                      color: included ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                      fontWeight: included ? "700" : "400",
                    }}
                  >
                    {u.playerName}
                  </Text>
                  <MaterialCommunityIcons
                    name={included ? "check-circle" : "circle-outline"}
                    size={24}
                    color={included ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
            );
          })
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

        {/* --- En construcción: asignación de insignias --- */}
        <View style={[styles.constructionCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
          <View style={[styles.constructionIconWrap, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons name="hammer-wrench" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>En construcción: asignación de insignias</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs }}>
              Pronto vas a poder entregar medallas e insignias a mano desde acá mismo.
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

        <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: SPACING.xs }}>
          Cierre de temporada
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.m }}>
          Cuando termine la temporada, guardá el resumen en el historial y arrancá la siguiente desde cero.
        </Text>
        <Button
          mode="contained"
          icon="flag-checkered"
          style={{ borderRadius: RADIUS.pill }}
          contentStyle={{ paddingVertical: SPACING.xs }}
          onPress={() => setResetModalOpen(true)}
        >
          Finalizar temporada
        </Button>
      </ScrollView>

      <Portal>
        <Modal
          visible={resetModalOpen}
          onDismiss={() => (resetting ? null : setResetModalOpen(false))}
          contentContainerStyle={[styles.resetCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}
        >
          <View style={[styles.resetIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="flag-checkered" size={30} color={theme.colors.primary} />
          </View>
          <Text variant="titleMedium" style={{ textAlign: "center", marginBottom: SPACING.xs, color: theme.colors.onSurface, fontWeight: "800" }}>
            ¿Finalizar la temporada?
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurface, marginBottom: SPACING.s }}>
            Guardo un resumen de cómo quedó todo (jugadores y personajes) en el historial, y después borro los torneos, rondas y comentarios para arrancar la siguiente temporada desde cero.
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: SPACING.xl }}>
            Los usuarios y los personajes cargados se mantienen intactos. Esta acción no se puede deshacer, así que asegurate de estar list@.
          </Text>
          <View style={styles.resetActions}>
            <Button
              mode="outlined"
              disabled={resetting}
              style={{ flex: 1, borderRadius: RADIUS.pill, marginRight: SPACING.s }}
              onPress={() => setResetModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              loading={resetting}
              style={{ flex: 1, borderRadius: RADIUS.pill }}
              onPress={handleConfirmReset}
            >
              Sí, finalizar
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  divider: { height: 1, marginVertical: SPACING.xl },
  constructionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.m,
  },
  constructionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  resetCard: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    alignItems: "center",
  },
  resetIconWrap: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.m,
  },
  resetActions: { flexDirection: "row", width: "100%" },
});