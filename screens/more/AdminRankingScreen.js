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
import { scale } from "../../utils/responsive";

//JS:
export default function AdminRankingScreen({ navigation }) {
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

      // ---- Conteo de Elijah de la temporada ----
      const elijahCountByUid = {};
      allRounds.forEach((r) => {
        if (!r.elijahUid) return;
        elijahCountByUid[r.elijahUid] = (elijahCountByUid[r.elijahUid] || 0) + 1;
      });
      const elijahRounds = allRounds.filter((r) => r.elijahUid).length;

      const elijahRanking = Object.entries(elijahCountByUid)
        .map(([uid, count]) => {
          const u = allUsers.find((usr) => usr.uid === uid);
          return { uid, playerName: u?.playerName || "?", photoURL: u?.photoURL || null, count };
        })
        .sort((a, b) => b.count - a.count);

      await saveSeasonHistory({
        seasonKey: seasonInfo.key,
        seasonLabel: season.label,
        start: seasonInfo.start,
        end: now,
        totalTournaments: finished.length,
        players: qualified.map((p) => ({ ...p, elijahCount: elijahCountByUid[p.uid] || 0 })),
        topCharacters,
        elijahRounds,
        elijahRanking,
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
        <ScreenHeader title="Ranking 33" subtitle="Panel de Admin" logo onBack={() => navigation.goBack()} />

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
                <Skeleton width={scale(38)} height={scale(38)} radius={RADIUS.pill} />
                <Skeleton width="45%" height={scale(14)} style={{ marginLeft: SPACING.m }} />
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
                  <Avatar.Image size={scale(38)} source={{ uri: u.photoURL }} />
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
                    size={scale(24)}
                    color={included ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
            );
          })
        )}

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
            <MaterialCommunityIcons name="flag-checkered" size={scale(30)} color={theme.colors.primary} />
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
  resetCard: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    alignItems: "center",
  },
  resetIconWrap: {
    width: scale(60),
    height: scale(60),
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.m,
  },
  resetActions: { flexDirection: "row", width: "100%" },
});