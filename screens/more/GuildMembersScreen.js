//Importaciones:
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Avatar, Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { deleteUserProfile, getAllUsers, getFinishedTournaments } from "../../services/firestoreService";
import ScreenHeader from "../../components/ScreenHeader";
import { Skeleton } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";

//JS:
const ADMIN_EMAIL = "aurepuente25@gmail.com";

function MemberRow({ item, theme, isMe, isAdmin, onPress, onDeletePress }) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.row,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          { transform: [{ scale }] },
        ]}
      >
        <View>
          <Avatar.Image size={44} source={{ uri: item.photoURL }} />
          {isMe && (
            <View style={[styles.meBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]}>
              <MaterialCommunityIcons name="star" size={11} color={theme.colors.onPrimary} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
            {item.playerName}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {item.played} {item.played === 1 ? "torneo jugado" : "torneos jugados"}
          </Text>
        </View>
        {item.wins > 0 && (
          <View style={[styles.winsPill, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="trophy" size={13} color={theme.custom.gold} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.primary }}>{item.wins}</Text>
          </View>
        )}
        {isAdmin && !isMe && (
          <Pressable onPress={onDeletePress} hitSlop={8} style={[styles.deleteBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="account-remove-outline" size={16} color={theme.colors.error} />
          </Pressable>
        )}
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.onSurfaceVariant}
          style={{ marginLeft: SPACING.xs }}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function GuildMembersScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [allUsers, finished] = await Promise.all([getAllUsers(), getFinishedTournaments()]);
    const winsByUid = {};
    const playedByUid = {};
    finished.forEach((t) => {
      (t.participantUids || []).forEach((uid) => {
        playedByUid[uid] = (playedByUid[uid] || 0) + 1;
      });
      if (t.winnerUid) winsByUid[t.winnerUid] = (winsByUid[t.winnerUid] || 0) + 1;
    });
    const sorted = allUsers
      .map((u) => ({ ...u, wins: winsByUid[u.uid] || 0, played: playedByUid[u.uid] || 0 }))
      .sort((a, b) => b.wins - a.wins);

    const meIndex = sorted.findIndex((u) => u.uid === user.uid);
    if (meIndex > 0) {
      const [me] = sorted.splice(meIndex, 1);
      sorted.unshift(me);
    }

    setMembers(sorted);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserProfile(deleteTarget.uid);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: SPACING.l, paddingTop: insets.top + SPACING.l }}>
        <ScreenHeader
          title="Miembros del Gremio"
          subtitle={loading ? "Cargando integrantes..." : `${members.length} ${members.length === 1 ? "integrante" : "integrantes"}`}
          logo
          onBack={() => navigation.goBack()}
        />

        {loading ? (
          <View>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, marginBottom: SPACING.s }]}>
                <Skeleton width={44} height={44} radius={RADIUS.pill} />
                <View style={{ flex: 1, marginLeft: SPACING.m }}>
                  <Skeleton width="55%" height={14} style={{ marginBottom: SPACING.xs }} />
                  <Skeleton width="35%" height={10} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.uid}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.s }} />}
            contentContainerStyle={{ paddingBottom: SPACING.l }}
            renderItem={({ item }) => (
              <MemberRow
                item={item}
                theme={theme}
                isMe={item.uid === user.uid}
                isAdmin={isAdmin}
                onPress={() =>
                  item.uid === user.uid
                    ? navigation.navigate("ProfileHome")
                    : navigation.navigate("GuildMemberDetail", { uid: item.uid, playerName: item.playerName, photoURL: item.photoURL })
                }
                onDeletePress={() => setDeleteTarget(item)}
              />
            )}
          />
        )}
      </View>

      <Portal>
        <Modal
          visible={!!deleteTarget}
          onDismiss={() => (deleting ? null : setDeleteTarget(null))}
          contentContainerStyle={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}
        >
          <View style={[styles.confirmIconWrap, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="account-remove-outline" size={28} color={theme.colors.error} />
          </View>
          <Text variant="titleMedium" style={{ textAlign: "center", marginBottom: SPACING.xs, color: theme.colors.error, fontWeight: "800" }}>
            ¿Eliminar a {deleteTarget?.playerName}?
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurface, marginBottom: SPACING.s }}>
            Se borra su perfil del Gremio (nombre, foto y personajes guardados) y sale del ranking si estaba incluido.
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: SPACING.xl }}>
            Ojo: esto no borra su acceso a la cuenta. Si vuelve a entrar a la app sin perfil, es probable que se le rompa. Esta acción no se puede deshacer.
          </Text>
          <View style={styles.confirmActions}>
            <Button
              mode="outlined"
              disabled={deleting}
              style={{ flex: 1, borderRadius: RADIUS.pill, marginRight: SPACING.s }}
              onPress={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              loading={deleting}
              style={{ flex: 1, borderRadius: RADIUS.pill }}
              onPress={handleConfirmDelete}
            >
              Eliminar
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.m,
  },
  winsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  meBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.xs,
  },
  confirmCard: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    alignItems: "center",
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.m,
  },
  confirmActions: { flexDirection: "row", width: "100%" },
});