//Importaciones:
import React, { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { Avatar, Button, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { createTournament, getAllUsers, submitRound } from "../../services/firestoreService";
import ScreenHeader from "../../components/ScreenHeader";
import { SkeletonRow } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";
import { scale } from "../../utils/responsive";

//JS:
export default function CreateTournamentScreen({ navigation }) {
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUids, setSelectedUids] = useState([user.uid]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAllUsers().then((list) => { setAllUsers(list); setUsersLoading(false); });
  }, []);

  function toggleUser(uid) {
    if (uid === user.uid) return; 
    setSelectedUids((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }

  const roster = allUsers.filter((u) => selectedUids.includes(u.uid));

  async function handleStart() {
    setError(null);
    setSubmitting(true);
    try {
      const tournamentId = await createTournament({ createdBy: user.uid, roster });
      await submitRound({ tournamentId, roundNumber: 0, winnerUid: null, characters: {} });
      navigation.replace("TournamentDetail", { tournamentId, justCreated: true });
    } catch (e) {
      setError(e.message || "No pudimos crear el torneo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: SPACING.l, paddingTop: insets.top + SPACING.l }}>
      <ScreenHeader title="Nuevo torneo" onBack={() => navigation.goBack()} />

      <View style={styles.introRow}>
        <View style={styles.logoWrap}>
          <View style={[styles.logoHalo, { backgroundColor: theme.colors.primaryContainer }]} />
          <Image
            source={require("../../assets/logo.webp")}
            style={[styles.logo, { tintColor: theme.colors.primary }]}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            ¿Quiénes juegan?
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Mínimo 2 en total, de la lista de usuarios registrados.
          </Text>
        </View>
      </View>

      {usersLoading ? (
        <View>
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
          <SkeletonRow style={{ marginBottom: SPACING.s }} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={allUsers}
          keyExtractor={(item) => item.uid}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.s }} />}
          contentContainerStyle={{ paddingBottom: SPACING.s }}
          renderItem={({ item }) => {
            const isMe = item.uid === user.uid;
            const selected = selectedUids.includes(item.uid);
            return (
              <Pressable onPress={() => toggleUser(item.uid)} disabled={isMe}>
                <View
                  style={[
                    styles.userRow,
                    {
                      backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.outline,
                    },
                  ]}
                >
                  <Avatar.Image size={scale(40)} source={{ uri: item.photoURL }} />
                  <View style={{ flex: 1, marginLeft: SPACING.m }}>
                    <Text
                      variant="titleSmall"
                      style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}
                    >
                      {item.playerName}
                    </Text>
                    {isMe && (
                      <Text
                        variant="bodySmall"
                        style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, opacity: 0.75 }}
                      >
                        Vos
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons
                    name={selected ? "check-circle" : "circle-outline"}
                    size={scale(24)}
                    color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {error && <Text style={{ color: theme.colors.error, marginTop: SPACING.s }}>{error}</Text>}

      <View style={styles.footer}>
        <View style={[styles.countPill, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {roster.length} {roster.length === 1 ? "jugador elegido" : "jugadores elegidos"}
          </Text>
        </View>
        <Button
          mode="contained"
          disabled={roster.length < 2}
          loading={submitting}
          style={{ borderRadius: RADIUS.pill }}
          contentStyle={{ paddingVertical: SPACING.xs }}
          onPress={handleStart}
        >
          ¡Vamos!
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.m,
  },
  logoWrap: {
    width: scale(52),
    height: scale(52),
    alignItems: "center",
    justifyContent: "center",
  },
  logoHalo: {
    position: "absolute",
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    opacity: 0.6,
  },
  logo: { width: scale(46), height: scale(46) },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.m,
  },
  footer: { marginTop: SPACING.m, gap: SPACING.s },
  countPill: {
    alignSelf: "center",
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs / 1.5,
  },
});