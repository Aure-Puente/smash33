//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Text, useTheme } from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import {
  deleteInvitation,
  listenInvitation,
  listenInvitationVotes,
  setMyInvitationVote,
} from "../../services/firestoreService";
import ScreenHeader from "../../components/ScreenHeader";
import { SkeletonRow } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";

//JS:
export default function InvitationDetailScreen({ route, navigation }) {
  const { invitationId } = route.params;
  const theme = useTheme();
  const { user, profile } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [votes, setVotes] = useState([]);
  const [mySelection, setMySelection] = useState([]);

  useEffect(() => {
    const u1 = listenInvitation(invitationId, setInvitation);
    const u2 = listenInvitationVotes(invitationId, setVotes);
    return () => { u1(); u2(); };
  }, [invitationId]);

  useEffect(() => {
    const myVote = votes.find((v) => v.uid === user.uid);
    if (myVote) setMySelection(myVote.slotIds || []);
  }, [votes, user.uid]);

  const isCreator = invitation?.createdBy === user.uid;

  function toggleMySlot(id) {
    setMySelection((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function saveMyVote() {
    await setMyInvitationVote({
      invitationId,
      uid: user.uid,
      playerName: profile.playerName,
      photoURL: profile.photoURL,
      slotIds: mySelection,
    });
  }

  function confirmDelete() {
    Alert.alert("Cerrar invitación", "Se va a borrar esta invitación y todos los votos.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar",
        style: "destructive",
        onPress: async () => {
          await deleteInvitation(invitationId);
          navigation.goBack();
        },
      },
    ]);
  }

  const counts = useMemo(() => {
    const map = {};
    votes.forEach((v) => (v.slotIds || []).forEach((id) => { map[id] = (map[id] || 0) + 1; }));
    return map;
  }, [votes]);

  const maxCount = Math.max(0, ...Object.values(counts));
  const winningSlots = (invitation?.slots || []).filter((s) => maxCount > 0 && counts[s.id] === maxCount);

  if (!invitation) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: SPACING.l }}>
        <ScreenHeader title="Coordinar juntada" onBack={() => navigation.goBack()} />
        <SkeletonRow style={{ marginBottom: SPACING.s }} />
        <SkeletonRow style={{ marginBottom: SPACING.s }} />
        <SkeletonRow />
      </View>
    );
  }

  function slotLabel(s) {
    return `${s.dayLabel} ${s.shortDate} - ${s.slotType === "tarde" ? "Tarde" : "Noche"}`;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: SPACING.l }}>
      <ScreenHeader title="Coordinar juntada" onBack={() => navigation.goBack()} />
      <Text variant="titleMedium" style={{ marginBottom: SPACING.xs, color: theme.colors.onBackground }}>Marcá tu disponibilidad</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.m }}>Tocá los días que te sirven a vos.</Text>

      <View style={styles.chipsRow}>
        {invitation.slots.map((s) => {
          const active = mySelection.includes(s.id);
          return (
            <Pressable key={s.id} onPress={() => toggleMySlot(s.id)} style={styles.chipWrap}>
              <View
                style={[
                  styles.chip,
                  { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                  active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
                  {slotLabel(s)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button mode="contained" style={{ borderRadius: RADIUS.pill, marginTop: SPACING.m, marginBottom: SPACING.xl }} onPress={saveMyVote}>
        Guardar mi disponibilidad
      </Button>

      {winningSlots.length > 0 && (
        <View style={[styles.winnerCard, { backgroundColor: theme.custom.gold }]}>
          <Text variant="titleSmall" style={{ color: "#241A05" }}>🏆 {winningSlots.length > 1 ? "Van empatados" : "Va ganando"}</Text>
          {winningSlots.map((s) => (
            <Text key={s.id} variant="bodyMedium" style={{ color: "#241A05", marginTop: 2 }}>
              {slotLabel(s)} ({maxCount} {maxCount === 1 ? "voto" : "votos"})
            </Text>
          ))}
        </View>
      )}

      <Text variant="titleSmall" style={{ marginBottom: SPACING.s, color: theme.colors.onBackground }}>Resultados por día</Text>
      <View style={[styles.resultsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        {invitation.slots
          .slice()
          .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
          .map((s, idx, arr) => (
            <View key={s.id} style={[styles.resultRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.outline }]}>
              <Text style={{ flex: 1, color: theme.colors.onSurface }}>{slotLabel(s)}</Text>
              <Text style={{ fontWeight: "700", color: theme.colors.primary }}>{counts[s.id] || 0}</Text>
            </View>
          ))}
      </View>

      <Text variant="titleSmall" style={{ marginTop: SPACING.xl, marginBottom: SPACING.s, color: theme.colors.onBackground }}>Ya votaron</Text>
      {votes.length === 0 && <Text style={{ color: theme.colors.onSurfaceVariant }}>Todavía nadie votó.</Text>}
      {votes.map((v) => (
        <View key={v.uid} style={styles.voterRow}>
          <Avatar.Image size={28} source={{ uri: v.photoURL }} />
          <Text style={{ marginLeft: SPACING.s, color: theme.colors.onSurface }}>{v.playerName}</Text>
        </View>
      ))}

      {isCreator && (
        <Button mode="outlined" textColor={theme.colors.error} style={{ marginTop: SPACING.xl, borderRadius: RADIUS.pill }} onPress={confirmDelete}>
          Cerrar invitación
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: "row", flexWrap: "wrap" },
  chipWrap: { marginRight: SPACING.s, marginBottom: SPACING.s },
  chip: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, borderWidth: 1.5 },
  winnerCard: { borderRadius: RADIUS.lg, marginBottom: SPACING.xl, padding: SPACING.m },
  resultsCard: { borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: SPACING.m },
  resultRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: SPACING.s },
  voterRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
});
