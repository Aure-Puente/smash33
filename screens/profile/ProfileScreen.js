//Importaciones:
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Avatar, Button, Text, TextInput, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeMode } from "../../contexts/ThemeContext";
import { getFinishedTournaments, updateUserProfile, uploadProfilePhoto } from "../../services/firestoreService";
import { ACCENT_LIST, RADIUS, SPACING } from "../../theme";
import { Skeleton } from "../../components/Skeleton";

//JS:
export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const { user, profile, logout, refreshProfile } = useAuth();
  const { accent, setAccent } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [playerName, setPlayerName] = useState(profile?.playerName || "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ played: 0, won: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [colorOpen, setColorOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const selectedAccent = ACCENT_LIST.find((a) => a.key === accent) || ACCENT_LIST[0];
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterY = useRef(new Animated.Value(10)).current;
  const enterScale = useRef(new Animated.Value(0.985)).current;

  const runEnter = useCallback(() => {
    enterOpacity.setValue(0);
    enterY.setValue(10);
    enterScale.setValue(0.985);

    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterY, enterScale]);

  useFocusEffect(
    useCallback(() => {
      runEnter();
      return undefined;
    }, [runEnter])
  );

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      const finished = await getFinishedTournaments();
      const mine = finished.filter((t) => t.participantUids?.includes(user.uid));
      const won = mine.filter((t) => t.winnerUid === user.uid).length;
      setStats({ played: mine.length, won });
      setStatsLoading(false);
    }
    loadStats();
  }, [user.uid]);

  async function pickAndUploadPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) {
      const url = await uploadProfilePhoto(user.uid, result.assets[0].uri);
      await updateUserProfile(user.uid, { photoURL: url });
      refreshProfile();
    }
  }

  async function saveName() {
    setSaving(true);
    await updateUserProfile(user.uid, { playerName });
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  }

  function toggleColorOpen() {
    Animated.timing(rotateAnim, { toValue: colorOpen ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    setColorOpen(!colorOpen);
  }

  function selectAccent(key) {
    setAccent(key);
    Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    setColorOpen(false);
  }

  const rotateDeg = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        opacity: enterOpacity,
        transform: [{ translateY: enterY }, { scale: enterScale }],
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.xl }]}
      >
        <View style={styles.headerRow}>
          <Image
            source={require("../../assets/logo.webp")}
            style={[styles.headerLogo, { tintColor: theme.colors.primary }]}
            resizeMode="contain"
          />
          <View style={{ marginLeft: SPACING.m }}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Perfil</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Tu cuenta</Text>
          </View>
        </View>

        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: theme.colors.primary }]}>
            <Avatar.Image size={100} source={{ uri: profile?.photoURL }} />
            <Pressable
              onPress={pickAndUploadPhoto}
              style={[styles.editPhotoBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}
            >
              <MaterialCommunityIcons name="camera" size={16} color={theme.colors.onPrimary} />
            </Pressable>
          </View>

          {editing ? (
            <View style={styles.editNameBlock}>
              <TextInput mode="outlined" value={playerName} onChangeText={setPlayerName} style={{ backgroundColor: theme.colors.surface }} />
              <Button mode="contained" loading={saving} onPress={saveName} style={styles.saveNameBtn}>Guardar</Button>
            </View>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>{profile?.playerName}</Text>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 6 }} />
            </Pressable>
          )}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{profile?.email}</Text>
        </View>

        {statsLoading ? (
          <View style={styles.statsRow}>
            <Skeleton height={78} radius={RADIUS.lg} style={{ flex: 1 }} />
            <Skeleton height={78} radius={RADIUS.lg} style={{ flex: 1 }} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <View style={styles.statValueRow}>
                <MaterialCommunityIcons name="controller-classic-outline" size={18} color={theme.colors.primary} style={{ marginRight: SPACING.xs }} />
                <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>{stats.played}</Text>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos jugados</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <View style={styles.statValueRow}>
                <MaterialCommunityIcons name="trophy" size={18} color={theme.custom.gold} style={{ marginRight: SPACING.xs }} />
                <Text variant="headlineSmall" style={{ color: theme.custom.gold }}>{stats.won}</Text>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos ganados</Text>
            </View>
          </View>
        )}

        <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Pressable onPress={() => navigation.navigate("MyCharacters")} style={styles.settingsRow}>
            <View style={[styles.rowIconBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="sword-cross" size={17} color={theme.colors.primary} />
            </View>
            <Text variant="bodyMedium" style={{ flex: 1, marginLeft: SPACING.m, color: theme.colors.onSurface }}>Mis personajes</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </Pressable>

          <View style={[styles.rowDivider, { backgroundColor: theme.colors.outline }]} />

          <Pressable onPress={toggleColorOpen} style={styles.settingsRow}>
            <View style={[styles.rowIconBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="palette-outline" size={17} color={theme.colors.primary} />
            </View>
            <Text variant="bodyMedium" style={{ flex: 1, marginLeft: SPACING.m, color: theme.colors.onSurface }}>Color principal</Text>
            <View style={[styles.selectedDot, { backgroundColor: selectedAccent.primary }]} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: SPACING.xs, marginRight: SPACING.xs }}>
              {selectedAccent.label}
            </Text>
            <Animated.View style={{ transform: [{ rotate: rotateDeg }] }}>
              <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
            </Animated.View>
          </Pressable>

          {colorOpen && (
            <View style={styles.swatchGrid}>
              {ACCENT_LIST.map((a) => {
                const selected = accent === a.key;
                return (
                  <Pressable key={a.key} onPress={() => selectAccent(a.key)} style={styles.swatchWrap}>
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: a.primary },
                        selected && { borderColor: theme.colors.onBackground, borderWidth: 3 },
                      ]}
                    >
                      {selected && <MaterialCommunityIcons name="check-bold" size={18} color={a.onPrimary} />}
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: SPACING.xs, textAlign: "center" }}>
                      {a.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Button
          mode="outlined"
          icon="logout"
          textColor={theme.colors.error}
          style={styles.logoutBtn}
          onPress={logout}
        >
          Cerrar sesión
        </Button>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xl },
  headerLogo: { width: 42, height: 42 },
  avatarSection: { alignItems: "center", marginBottom: SPACING.xl },
  avatarRing: { position: "relative", marginBottom: SPACING.m, borderWidth: 2, borderRadius: RADIUS.pill, padding: 3 },
  editPhotoBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", borderWidth: 3,
  },
  nameRow: { flexDirection: "row", alignItems: "center" },
  editNameBlock: { width: "100%", marginTop: SPACING.s },
  saveNameBtn: { marginTop: SPACING.s, borderRadius: RADIUS.pill },
  statsRow: { flexDirection: "row", gap: SPACING.m, marginBottom: SPACING.l },
  statPill: {
    flex: 1, alignItems: "center", paddingVertical: SPACING.l,
    borderRadius: RADIUS.lg, borderWidth: 1,
  },
  statValueRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  settingsCard: { borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.l, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", padding: SPACING.m },
  rowIconBadge: {
    width: 34, height: 34, borderRadius: RADIUS.sm,
    alignItems: "center", justifyContent: "center",
  },
  rowDivider: { height: 1, marginLeft: SPACING.m + 34 + SPACING.m },
  selectedDot: { width: 14, height: 14, borderRadius: RADIUS.pill },
  swatchGrid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    paddingHorizontal: SPACING.m, paddingBottom: SPACING.m, paddingTop: SPACING.xs,
  },
  swatchWrap: { alignItems: "center", width: "31%", marginTop: SPACING.m },
  swatch: { width: 46, height: 46, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  logoutBtn: { marginTop: SPACING.m, borderRadius: RADIUS.pill },
});