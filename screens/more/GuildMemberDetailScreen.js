//Importaciones:
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Modal, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { getFinishedTournaments, getMyCharacterWinCounts, getPlayerDeepStats, getRounds } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import ScreenHeader from "../../components/ScreenHeader";
import { Skeleton } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";
import { IS_TABLET, scale } from "../../utils/responsive";

//JS:
const NEMESIS_COLOR = "#9B5DE5";
const NEMESIS_BG = "rgba(155,93,229,0.14)";

export default function GuildMemberDetailScreen({ route, navigation }) {
    const { uid, playerName, photoURL } = route.params;
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [characters, setCharacters] = useState([]);
    const [stats, setStats] = useState({ played: 0, won: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    const [bestCharacter, setBestCharacter] = useState(null);
    const [bestCharLoading, setBestCharLoading] = useState(true);

    const [playerStats, setPlayerStats] = useState(null); 
    const [myDeepStats, setMyDeepStats] = useState(null); 
    const [headToHead, setHeadToHead] = useState(null);
    const [matchup, setMatchup] = useState(null);
    const [deepLoading, setDeepLoading] = useState(true);

    const [avatarModalOpen, setAvatarModalOpen] = useState(false);

    const percentAnim = useRef(new Animated.Value(0)).current;
    const [displayPercent, setDisplayPercent] = useState(0);

    useEffect(() => {
        async function loadStats() {
        setStatsLoading(true);
        const finished = await getFinishedTournaments();
        const mine = finished.filter((t) => t.participantUids?.includes(uid));
        const won = mine.filter((t) => t.winnerUid === uid).length;
        setStats({ played: mine.length, won });
        setStatsLoading(false);
        }
        loadStats();
    }, [uid]);

    useEffect(() => {
        async function loadBestCharacter() {
        setBestCharLoading(true);
        const [allCharacters, wins] = await Promise.all([getAllCharacters(), getMyCharacterWinCounts(uid)]);
        setCharacters(allCharacters);
        const [topCharId, topCount] = Object.entries(wins).sort((a, b) => b[1] - a[1])[0] || [];
        const character = topCharId ? allCharacters.find((c) => c.fighterNumber === topCharId) : null;
        if (character) setBestCharacter({ character, wins: topCount });
        setBestCharLoading(false);
        }
        loadBestCharacter();
    }, [uid]);

    useEffect(() => {
        async function loadDeep() {
        setDeepLoading(true);
        const [allFinished, theirStats, myStats] = await Promise.all([
            getFinishedTournaments(),
            getPlayerDeepStats(uid),
            getPlayerDeepStats(user.uid),
        ]);
        setPlayerStats(theirStats);
        setMyDeepStats(myStats);

        const shared = allFinished.filter(
            (t) => t.participantUids?.includes(user.uid) && t.participantUids?.includes(uid)
        );
        const roundsByTournament = await Promise.all(
            shared.map(async (t) => (await getRounds(t.id)).map((r) => ({ ...r, tournamentId: t.id })))
        );
        const sharedRounds = roundsByTournament.flat().filter((r) => r.roundNumber > 0);

        const tournamentsIWon = shared.filter((t) => t.winnerUid === user.uid).length;
        const tournamentsTheyWon = shared.filter((t) => t.winnerUid === uid).length;
        const roundsIWon = sharedRounds.filter((r) => r.winnerUid === user.uid).length;
        const roundsTheyWon = sharedRounds.filter((r) => r.winnerUid === uid).length;

        setHeadToHead({ tournamentsTogether: shared.length, tournamentsIWon, tournamentsTheyWon, roundsIWon, roundsTheyWon });

        const myWinningCharCounts = {};
        sharedRounds.forEach((r) => {
            if (r.winnerUid !== user.uid) return;
            const charId = r.characters?.[user.uid];
            if (charId) myWinningCharCounts[charId] = (myWinningCharCounts[charId] || 0) + 1;
        });
        const [myTopCharId, myTopCount] = Object.entries(myWinningCharCounts).sort((a, b) => b[1] - a[1])[0] || [];

        const theirWinningCharCounts = {};
        sharedRounds.forEach((r) => {
            if (r.winnerUid !== uid) return;
            const charId = r.characters?.[uid];
            if (charId) theirWinningCharCounts[charId] = (theirWinningCharCounts[charId] || 0) + 1;
        });
        const [theirTopCharId, theirTopCount] = Object.entries(theirWinningCharCounts).sort((a, b) => b[1] - a[1])[0] || [];

        setMatchup({ myCharId: myTopCharId || null, myCharCount: myTopCount || 0, theirCharId: theirTopCharId || null, theirCharCount: theirTopCount || 0 });
        setDeepLoading(false);
        }
        loadDeep();
    }, [uid, user.uid]);

    const charById = (id) => characters.find((c) => c.fighterNumber === id);

    const totalDecisive = headToHead ? headToHead.roundsIWon + headToHead.roundsTheyWon : 0;
    const winPercent = totalDecisive > 0 ? Math.round((headToHead.roundsIWon / totalDecisive) * 100) : null;

    useEffect(() => {
        if (deepLoading || winPercent === null) return;
        const id = percentAnim.addListener(({ value }) => setDisplayPercent(Math.round(value)));
        percentAnim.setValue(0);
        Animated.timing(percentAnim, { toValue: winPercent, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => percentAnim.removeListener(id);
    }, [deepLoading, winPercent]);

    const iAmTheirNemesis = playerStats?.nemesis?.opponentUid === user.uid;
    const theyAreMyNemesis = myDeepStats?.nemesis?.opponentUid === uid;

    const percentBarWidth = percentAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"], extrapolate: "clamp" });
    const percentColor = displayPercent >= 50 ? theme.colors.primary : theme.colors.error;

    const theirCardCharId = theyAreMyNemesis ? myDeepStats?.nemesis?.characterId : matchup?.theirCharId;
    const theirCardCount = theyAreMyNemesis ? myDeepStats?.nemesis?.count : matchup?.theirCharCount;
    const theirCardChar = theirCardCharId ? charById(theirCardCharId) : null;

    const myCardCharId = iAmTheirNemesis ? playerStats?.nemesis?.characterId : matchup?.myCharId;
    const myCardCount = iAmTheirNemesis ? playerStats?.nemesis?.count : matchup?.myCharCount;
    const myCardChar = myCardCharId ? charById(myCardCharId) : null;

    return (
        <>
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l, paddingBottom: SPACING.xxxl }}
        >
            <ScreenHeader title={playerName} subtitle="Perfil del miembro" logo onBack={() => navigation.goBack()} />

            <View style={styles.avatarSection}>
            <Pressable onPress={() => setAvatarModalOpen(true)}>
                <View style={[styles.avatarRing, { borderColor: theme.colors.primary }]}>
                <Avatar.Image size={IS_TABLET ? scale(150) : scale(116)} source={{ uri: photoURL }} />
                </View>
            </Pressable>
            <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginTop: SPACING.m }}>{playerName}</Text>
            </View>

            {statsLoading ? (
            <View style={styles.statsRow}>
                <Skeleton height={scale(78)} radius={RADIUS.lg} style={{ flex: 1 }} />
                <Skeleton height={scale(78)} radius={RADIUS.lg} style={{ flex: 1 }} />
            </View>
            ) : (
            <View style={styles.statsRow}>
                <View style={[styles.statPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={styles.statValueRow}>
                    <MaterialCommunityIcons name="controller-classic-outline" size={scale(18)} color={theme.colors.primary} style={{ marginRight: SPACING.xs }} />
                    <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>{stats.played}</Text>
                </View>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos jugados</Text>
                </View>
                <View style={[styles.statPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={styles.statValueRow}>
                    <MaterialCommunityIcons name="trophy" size={scale(18)} color={theme.custom.gold} style={{ marginRight: SPACING.xs }} />
                    <Text variant="headlineSmall" style={{ color: theme.custom.gold }}>{stats.won}</Text>
                </View>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Torneos ganados</Text>
                </View>
            </View>
            )}

            {bestCharLoading ? (
            <Skeleton height={scale(90)} radius={RADIUS.lg} style={{ width: "100%", marginBottom: SPACING.l }} />
            ) : (
            bestCharacter && (
                <ImageBackground
                source={bestCharacter.character.images?.bannerImage ? { uri: bestCharacter.character.images.bannerImage } : undefined}
                imageStyle={{ resizeMode: "cover" }}
                style={[styles.bestCharBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
                >
                <View style={styles.bestCharText}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Mejor personaje</Text>
                    <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onSurface, fontSize: IS_TABLET ? scale(22) : undefined }}
                    numberOfLines={1}
                    >
                    {bestCharacter.character.name}
                    </Text>
                    <View style={[styles.bestCharWinsPill, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons name="trophy" size={IS_TABLET ? scale(20) : scale(13)} color={theme.custom.gold} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: IS_TABLET ? scale(16) : scale(12), fontWeight: "700", color: theme.colors.onSurfaceVariant }}>{bestCharacter.wins}</Text>
                    </View>
                </View>
                </ImageBackground>
            )
            )}

            {/* --- Cara a cara --- */}
            {deepLoading ? (
            <Skeleton height={scale(130)} radius={RADIUS.lg} style={{ width: "100%", marginBottom: SPACING.l }} />
            ) : (
            <View style={[styles.h2hCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: SPACING.s }}>Cara a cara</Text>

                {winPercent === null ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Todavía no jugaron combates decisivos juntos.</Text>
                ) : (
                <>
                    <View style={styles.percentRow}>
                    <Text style={[styles.percentNumber, { color: percentColor }]}>{displayPercent}%</Text>
                    <Text style={{ flex: 1, marginLeft: SPACING.m, color: theme.colors.onSurfaceVariant }}>
                        de victorias en los combates que jugaron juntos
                    </Text>
                    </View>
                    <View style={[styles.percentTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Animated.View style={[styles.percentFill, { width: percentBarWidth, backgroundColor: percentColor }]} />
                    </View>
                </>
                )}
            </View>
            )}

            {/* --- Matchups --- */}
            {deepLoading ? (
            <View style={styles.matchupRow}>
                {[0, 1].map((i) => (
                <View key={i} style={[styles.matchupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                    <Skeleton width={scale(60)} height={scale(60)} radius={RADIUS.lg} />
                    <Skeleton width={scale(70)} height={scale(11)} style={{ marginTop: SPACING.s }} />
                    <Skeleton width={scale(50)} height={scale(14)} style={{ marginTop: 4 }} />
                </View>
                ))}
            </View>
            ) : (
            (theirCardChar || myCardChar) && (
            <View style={styles.matchupRow}>
                {theirCardChar && (
                <View
                    style={[
                    styles.matchupCard,
                    theyAreMyNemesis
                        ? { backgroundColor: NEMESIS_BG, borderColor: NEMESIS_COLOR }
                        : { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                    ]}
                >
                    <View style={[styles.matchupIconWrap, { backgroundColor: theyAreMyNemesis ? "rgba(155,93,229,0.22)" : theme.colors.surfaceVariant }]}>
                    {theirCardChar.images?.iconImage && (
                        <Image source={{ uri: theirCardChar.images.iconImage }} style={styles.matchupIcon} />
                    )}
                    <View style={[styles.matchupBadge, { backgroundColor: theyAreMyNemesis ? NEMESIS_COLOR : theme.colors.surface, borderColor: theyAreMyNemesis ? NEMESIS_BG : theme.colors.surfaceVariant }]}>
                        <MaterialCommunityIcons
                        name={theyAreMyNemesis ? "emoticon-devil-outline" : "shield-alert-outline"}
                        size={scale(12)}
                        color={theyAreMyNemesis ? "#FFFFFF" : theme.colors.onSurfaceVariant}
                        />
                    </View>
                    </View>
                    <Text
                    variant="labelSmall"
                    style={{
                        color: theyAreMyNemesis ? NEMESIS_COLOR : theme.colors.onSurfaceVariant,
                        fontWeight: theyAreMyNemesis ? "800" : "600",
                        marginTop: SPACING.s,
                        textAlign: "center",
                    }}
                    >
                    {theyAreMyNemesis ? "Es tu némesis" : "Te complica"}
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, textAlign: "center", marginTop: 1 }} numberOfLines={1}>
                    {theirCardChar.name}
                    </Text>
                    {theyAreMyNemesis && (
                    <Text style={{ fontSize: scale(11), color: NEMESIS_COLOR, marginTop: 3, fontWeight: "700" }}>
                        {theirCardCount} {theirCardCount === 1 ? "vez" : "veces"}
                    </Text>
                    )}
                </View>
                )}

                {myCardChar && (
                <View
                    style={[
                    styles.matchupCard,
                    iAmTheirNemesis
                        ? { backgroundColor: NEMESIS_BG, borderColor: NEMESIS_COLOR }
                        : { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                    ]}
                >
                    <View style={[styles.matchupIconWrap, { backgroundColor: iAmTheirNemesis ? "rgba(155,93,229,0.22)" : theme.colors.surfaceVariant }]}>
                    {myCardChar.images?.iconImage && (
                        <Image source={{ uri: myCardChar.images.iconImage }} style={styles.matchupIcon} />
                    )}
                    <View style={[styles.matchupBadge, { backgroundColor: iAmTheirNemesis ? NEMESIS_COLOR : theme.colors.surface, borderColor: iAmTheirNemesis ? NEMESIS_BG : theme.colors.surfaceVariant }]}>
                        <MaterialCommunityIcons
                        name={iAmTheirNemesis ? "fire" : "shield-star-outline"}
                        size={scale(12)}
                        color={iAmTheirNemesis ? "#FFFFFF" : theme.colors.onSurfaceVariant}
                        />
                    </View>
                    </View>
                    <Text
                    variant="labelSmall"
                    style={{
                        color: iAmTheirNemesis ? NEMESIS_COLOR : theme.colors.onSurfaceVariant,
                        fontWeight: iAmTheirNemesis ? "800" : "600",
                        marginTop: SPACING.s,
                        textAlign: "center",
                    }}
                    >
                    {iAmTheirNemesis ? "Sos su némesis" : "Le complica"}
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, textAlign: "center", marginTop: 1 }} numberOfLines={1}>
                    {myCardChar.name}
                    </Text>
                    {iAmTheirNemesis && (
                    <Text style={{ fontSize: scale(11), color: NEMESIS_COLOR, marginTop: 3, fontWeight: "700" }}>
                        {myCardCount} {myCardCount === 1 ? "vez" : "veces"}
                    </Text>
                    )}
                </View>
                )}
            </View>
            ))}

            <View style={[styles.badgesTeaseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={[styles.rowIconBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="medal-outline" size={scale(17)} color={theme.colors.primary} />
            </View>
            <Text variant="bodyMedium" style={{ flex: 1, marginLeft: SPACING.m, color: theme.colors.onSurface }}>Insignias</Text>
            <View style={[styles.comingSoonPill, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={{ fontSize: scale(11), fontWeight: "700", color: theme.colors.onSurfaceVariant }}>Próximamente</Text>
            </View>
            </View>
        </ScrollView>

        <Portal>
            <Modal
            visible={avatarModalOpen}
            onDismiss={() => setAvatarModalOpen(false)}
            contentContainerStyle={styles.avatarModal}
            >
            <Pressable onPress={() => setAvatarModalOpen(false)}>
                <Image source={{ uri: photoURL }} style={styles.avatarModalImage} resizeMode="cover" />
            </Pressable>
            </Modal>
        </Portal>
        </>
    );
    }

    const styles = StyleSheet.create({
    avatarSection: { alignItems: "center", marginBottom: SPACING.xl },
    avatarRing: { borderWidth: 3, borderRadius: RADIUS.pill, padding: 3 },
    statsRow: { flexDirection: "row", gap: SPACING.m, marginBottom: SPACING.l },
    statPill: {
        flex: 1, alignItems: "center", paddingVertical: SPACING.l,
        borderRadius: RADIUS.lg, borderWidth: 1,
    },
    statValueRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
    bestCharBanner: {
        height: IS_TABLET ? scale(150) : scale(90),
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        marginBottom: SPACING.l,
        overflow: "hidden",
        justifyContent: "center",
    },
    bestCharText: { paddingHorizontal: SPACING.m, maxWidth: "55%" },
    bestCharWinsPill: {
        flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
        paddingHorizontal: SPACING.s, paddingVertical: 4,
        borderRadius: RADIUS.pill, marginTop: SPACING.xs,
    },
    h2hCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.l, marginBottom: SPACING.l },
    percentRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.s },
    percentNumber: { fontFamily: "Rajdhani_700Bold", fontSize: scale(36) },
    percentTrack: { height: scale(10), borderRadius: RADIUS.pill, overflow: "hidden" },
    percentFill: { height: "100%", borderRadius: RADIUS.pill },
    matchupRow: { flexDirection: "row", gap: SPACING.m, marginBottom: SPACING.l },
    matchupCard: {
        flex: 1, alignItems: "center", borderRadius: RADIUS.xl, borderWidth: 1.5,
        paddingVertical: SPACING.l, paddingHorizontal: SPACING.s,
    },
    matchupIconWrap: {
        width: scale(60), height: scale(60), borderRadius: RADIUS.lg,
        alignItems: "center", justifyContent: "center",
    },
    matchupIcon: { width: scale(46), height: scale(46), borderRadius: RADIUS.sm },
    matchupBadge: {
        position: "absolute", bottom: -6, right: -6,
        width: scale(22), height: scale(22), borderRadius: scale(11), borderWidth: 2,
        alignItems: "center", justifyContent: "center",
    },
    avatarModal: { margin: SPACING.xxl, alignItems: "center", justifyContent: "center" },
    avatarModalImage: { width: scale(280), height: scale(280), borderRadius: scale(140) },
    badgesTeaseCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.m,
    },
    rowIconBadge: {
        width: scale(34), height: scale(34), borderRadius: RADIUS.sm,
        alignItems: "center", justifyContent: "center",
    },
    comingSoonPill: {
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
    },
});