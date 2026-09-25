//Importaciones:
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { listenRoundReactions, setRoundReaction } from "../services/firestoreService";
import { RADIUS, SPACING } from "../theme";
import { scale } from "../utils/responsive";

//JS:
export default function RoundHistoryRow({ tournamentId, round, winnerName, canEdit, onEdit, readOnlyReactions }) {
  const theme = useTheme();
  const { user, profile } = useAuth();
  const [reactions, setReactions] = useState({ likes: 0, dislikes: 0, docs: [] });

  useEffect(() => {
    const unsub = listenRoundReactions(tournamentId, round.id, setReactions);
    return unsub;
  }, [tournamentId, round.id]);

  const myReaction = reactions.docs.find((d) => d.uid === user.uid)?.reaction || null;

  function react(reaction) {
    setRoundReaction({
      tournamentId,
      roundId: round.id,
      uid: user.uid,
      playerName: profile.playerName,
      reaction: myReaction === reaction ? "none" : reaction,
    });
  }

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <View style={[styles.roundBadge, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text style={{ fontFamily: "Rajdhani_700Bold", fontSize: scale(15), color: theme.colors.primary }}>
          {round.roundNumber}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: SPACING.m }}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
          Ganó {winnerName || "—"}
        </Text>
      </View>

      <View style={styles.reactions}>
        {readOnlyReactions ? (
          <>
            <View style={[styles.reactionPill, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="thumb-up-outline" size={scale(14)} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.count, { color: theme.colors.onSurfaceVariant }]}>{reactions.likes}</Text>
            </View>
            <View style={[styles.reactionPill, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="thumb-down-outline" size={scale(14)} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.count, { color: theme.colors.onSurfaceVariant }]}>{reactions.dislikes}</Text>
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => react("like")}
              style={[
                styles.reactionPill,
                { backgroundColor: myReaction === "like" ? theme.colors.primaryContainer : theme.colors.surfaceVariant },
              ]}
            >
              <MaterialCommunityIcons
                name={myReaction === "like" ? "thumb-up" : "thumb-up-outline"}
                size={scale(14)}
                color={myReaction === "like" ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.count, { color: myReaction === "like" ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                {reactions.likes}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => react("dislike")}
              style={[
                styles.reactionPill,
                { backgroundColor: myReaction === "dislike" ? theme.colors.errorContainer : theme.colors.surfaceVariant },
              ]}
            >
              <MaterialCommunityIcons
                name={myReaction === "dislike" ? "thumb-down" : "thumb-down-outline"}
                size={scale(14)}
                color={myReaction === "dislike" ? theme.colors.error : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.count, { color: myReaction === "dislike" ? theme.colors.error : theme.colors.onSurfaceVariant }]}>
                {reactions.dislikes}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {canEdit && (
        <IconButton
          icon="pencil-outline"
          size={scale(16)}
          iconColor={theme.colors.onSurfaceVariant}
          onPress={onEdit}
          style={styles.editButton}
        />
      )}
    </View>
  );
}

export function EmptyRoundHistory() {
  const theme = useTheme();
  return (
    <View style={[emptyStyles.container, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
      <MaterialCommunityIcons name="sword-cross" size={scale(26)} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs, textAlign: "center" }}>
        Todavía no se jugó ninguna ronda
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.75, marginTop: 2, textAlign: "center" }}>
        Acá vas a ver el resultado de cada ronda a medida que se registren.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.lg, borderWidth: 1,
    paddingVertical: SPACING.s, paddingHorizontal: SPACING.m,
    marginBottom: SPACING.s,
  },
  roundBadge: {
    width: scale(32), height: scale(32), borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center",
  },
  reactions: { flexDirection: "row" },
  reactionPill: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    marginLeft: SPACING.xs,
  },
  count: { marginLeft: 4, fontSize: scale(12), fontFamily: "Rajdhani_700Bold" },
  editButton: { margin: 0, marginLeft: SPACING.xs },
});

const emptyStyles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.s,
  },
});