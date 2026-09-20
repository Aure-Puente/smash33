//Importaciones:
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getSeasonInfo, SEASONS } from "../../utils/season";
import ScreenHeader from "../../components/ScreenHeader";
import { RADIUS, SPACING } from "../../theme";

//JS:
const ADMIN_EMAIL = "aurepuente25@gmail.com";

const MENU_ITEMS = [
  { key: "Badges", label: "Insignias", icon: "medal-outline" },
  { key: "GuildMembers", label: "Miembros del Gremio", icon: "account-group" },
  { key: "MyCharacters", label: "Mis personajes", icon: "sword-cross" },
  { key: "ProfileHome", label: "Mi perfil", icon: "account-circle" },
];

function RankingHeroCard({ theme, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const seasonInfo = getSeasonInfo();
  const season = SEASONS[seasonInfo.key];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.heroCard,
          { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, transform: [{ scale }] },
        ]}
      >
        <View style={[styles.heroIconWrap, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name={season.icon} size={28} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.m }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: "800" }}>
            Ranking Smash 33
          </Text>
          <Text style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85, fontSize: 12, marginTop: 2 }}>
            Temporada de {season.label}
          </Text>
          <View style={styles.liveRow}>
            <Animated.View style={[styles.liveDot, { backgroundColor: theme.colors.primary, opacity: dotOpacity, transform: [{ scale: dotScale }] }]} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.primary, marginLeft: 5, letterSpacing: 0.5 }}>EN VIVO</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onPrimaryContainer} />
      </Animated.View>
    </Pressable>
  );
}

function MenuRow({ item, theme, onPress, variant }) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }

  const isAdminVariant = variant === "admin";
  const accentColor = theme.colors.primary;

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.row,
          isAdminVariant
            ? { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 1.5 }
            : { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          { transform: [{ scale }] },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: isAdminVariant ? theme.colors.surface : theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name={item.icon} size={20} color={accentColor} />
        </View>
        <Text variant="titleSmall" style={{ flex: 1, marginLeft: SPACING.m, color: isAdminVariant ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
          {item.label}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={22} color={isAdminVariant ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} />
      </Animated.View>
    </Pressable>
  );
}

export default function MoreScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  function handleConfirmLogout() {
    setConfirmingLogout(false);
    logout();
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l, flexGrow: 1 }}
      >
        <ScreenHeader title="Más" subtitle="Más opciones y configuración" logo />

        <RankingHeroCard theme={theme} onPress={() => navigation.navigate("WorldRanking")} />

        {MENU_ITEMS.map((item) => (
          <MenuRow key={item.key} item={item} theme={theme} onPress={() => navigation.navigate(item.key)} />
        ))}

        {isAdmin && (
          <MenuRow
            item={{ key: "AdminPanel", label: "Panel de Admin", icon: "cog-outline" }}
            theme={theme}
            variant="admin"
            onPress={() => navigation.navigate("AdminPanel")}
          />
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

        <Button
          mode="outlined"
          icon="logout"
          textColor={theme.colors.error}
          style={{ borderRadius: RADIUS.pill, borderColor: theme.colors.error }}
          contentStyle={{ paddingVertical: SPACING.xs }}
          onPress={() => setConfirmingLogout(true)}
        >
          Cerrar sesión
        </Button>

        <View style={styles.footer}>
          <Image
            source={require("../../assets/logo.webp")}
            style={[styles.footerLogo, { tintColor: theme.colors.onSurfaceVariant }]}
            resizeMode="contain"
          />
          <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>SMASH 33</Text>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={confirmingLogout}
          onDismiss={() => setConfirmingLogout(false)}
          contentContainerStyle={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        >
          <View style={[styles.confirmIconWrap, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialCommunityIcons name="logout" size={26} color={theme.colors.onErrorContainer} />
          </View>
          <Text variant="titleMedium" style={{ textAlign: "center", marginBottom: SPACING.xs, color: theme.colors.onSurface }}>
            ¿Estás seguro que querés salir?
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: SPACING.xl }}>
            Asegurate de recordar tu mail y contraseña antes de cerrar sesión.
          </Text>
          <View style={styles.confirmActions}>
            <Button
              mode="outlined"
              style={{ flex: 1, borderRadius: RADIUS.pill, marginRight: SPACING.s }}
              onPress={() => setConfirmingLogout(false)}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              style={{ flex: 1, borderRadius: RADIUS.pill }}
              onPress={handleConfirmLogout}
            >
              Salir
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: SPACING.l,
    marginBottom: SPACING.l,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  liveRow: { flexDirection: "row", alignItems: "center", marginTop: SPACING.xs },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, marginVertical: SPACING.l },
  footer: { alignItems: "center", marginTop: "auto", paddingTop: SPACING.xxl, paddingBottom: SPACING.s, opacity: 0.4 },
  footerLogo: { width: 28, height: 28, marginBottom: SPACING.xs },
  footerText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 13,
    letterSpacing: 3,
  },
  confirmCard: {
    margin: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
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