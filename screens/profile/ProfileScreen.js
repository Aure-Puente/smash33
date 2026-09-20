//Importaciones:
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Avatar, Button, IconButton, Text, TextInput, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeMode } from "../../contexts/ThemeContext";
import { getFinishedTournaments, getMyCharacterWinCounts, updateUserProfile, uploadProfilePhoto } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import { ACCENT_LIST, RADIUS, SPACING } from "../../theme";
import { Skeleton } from "../../components/Skeleton";

//JS:
export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const { accent, setAccent } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [playerName, setPlayerName] = useState(profile?.playerName || "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ played: 0, won: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [bestCharacter, setBestCharacter] = useState(null);
  const [bestCharLoading, setBestCharLoading] = useState(true);
  const [colorOpen, setColorOpen] = useState(false);
  const [swatchHeight, setSwatchHeight] = useState(0);
  const scrollRef = useRef(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const bestCharFade = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    async function loadBestCharacter() {
      setBestCharLoading(true);
      const [allCharacters, wins] = await Promise.all([
        getAllCharacters(),
        getMyCharacterWinCounts(user.uid),
      ]);
      const [topCharId, topCount] = Object.entries(wins).sort((a, b) => b[1] - a[1])[0] || [];
      const character = topCharId ? allCharacters.find((c) => c.fighterNumber === topCharId) : null;
      if (character) {
        setBestCharacter({ character, wins: topCount });
        Animated.timing(bestCharFade, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
      setBestCharLoading(false);
    }
    loadBestCharacter();
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
    const opening = !colorOpen;
    Animated.timing(rotateAnim, { toValue: opening ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(colorAnim, { toValue: opening ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      if (opening) scrollRef.current?.scrollToEnd({ animated: true });
    });
    setColorOpen(opening);
  }

  function selectAccent(key) {
    setAccent(key);
  }

  const rotateDeg = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const swatchAnimatedHeight = colorAnim.interpolate({ inputRange: [0, 1], outputRange: [0, swatchHeight || 1] });

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
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.xl }]}
      >
        <View style={styles.headerRow}>
          <IconButton icon="arrow-left" size={22} style={styles.backBtn} onPress={() => navigation.goBack()} />
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

        {bestCharLoading ? (
          <Skeleton height={90} radius={RADIUS.lg} style={{ width: "100%", marginBottom: SPACING.s }} />
        ) : (
          bestCharacter && (
            <Animated.View style={{ opacity: bestCharFade, marginBottom: SPACING.s }}>
              <ImageBackground
                source={bestCharacter.character.images?.bannerImage ? { uri: bestCharacter.character.images.bannerImage } : undefined}
                imageStyle={styles.bestCharBannerImage}
                style={[styles.bestCharBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
              >
                <View style={styles.bestCharBannerText}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Tu mejor personaje</Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                    {bestCharacter.character.name}
                  </Text>
                  <View style={[styles.bestCharWinsPill, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons name="trophy" size={13} color={theme.custom.gold} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.onSurfaceVariant }}>
                      {bestCharacter.wins}
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            </Animated.View>
          )
        )}

        <View style={[styles.badgesTeaseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={[styles.rowIconBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="medal-outline" size={17} color={theme.colors.primary} />
          </View>
          <Text variant="bodyMedium" style={{ flex: 1, marginLeft: SPACING.m, color: theme.colors.onSurface }}>Mis insignias</Text>
          <View style={[styles.comingSoonPill, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.onSurfaceVariant }}>Próximamente</Text>
          </View>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
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

          <Animated.View style={{ height: swatchAnimatedHeight, opacity: colorAnim, overflow: "hidden" }}>
            <View
              style={styles.swatchGrid}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0 && Math.round(h) !== Math.round(swatchHeight)) setSwatchHeight(h);
              }}
            >
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
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xl },
  backBtn: { marginLeft: -SPACING.s, marginRight: -SPACING.xs },
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
  bestCharBanner: {
    height: 90,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.s,
    overflow: "hidden",
    justifyContent: "center",
  },
  bestCharBannerImage: {
    resizeMode: "cover",
  },
  bestCharBannerText: {
    paddingHorizontal: SPACING.m,
    maxWidth: "55%",
  },
  bestCharWinsPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.xs,
  },
  badgesTeaseCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.l,
  },
  comingSoonPill: {
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  settingsCard: { borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.l, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", padding: SPACING.m },
  rowIconBadge: {
    width: 34, height: 34, borderRadius: RADIUS.sm,
    alignItems: "center", justifyContent: "center",
  },
  selectedDot: { width: 14, height: 14, borderRadius: RADIUS.pill },
  swatchGrid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    paddingHorizontal: SPACING.m, paddingBottom: SPACING.m, paddingTop: SPACING.xs,
  },
  swatchWrap: { alignItems: "center", width: "31%", marginTop: SPACING.m },
  swatch: { width: 46, height: 46, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
});