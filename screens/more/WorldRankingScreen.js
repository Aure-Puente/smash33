//Importaciones:
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer } from "expo-audio";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Avatar, Portal, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Ellipse, Line, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllUsers, getFinishedTournaments, getRounds, getSeasonHistory, listenRankingSettings } from "../../services/firestoreService";
import { getAllCharacters } from "../../services/charactersService";
import { computeRankingData } from "../../utils/rankingCalc";
import { formatCountdown, getNextSeasonKey, getSeasonInfo, getVisibleSeasonEnd, SEASONS } from "../../utils/season";
import { Skeleton } from "../../components/Skeleton";
import { RADIUS, SPACING } from "../../theme";

//JS:
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MAX_PLAYER_SLOTS = 8;
const MAX_CHARACTER_SLOTS = 10;
const BAND_HEIGHT = 80;
const BAR_WIDTH = SCREEN_W - SPACING.l * 2;

const RANK_COLORS = ["#F2B84B", "#FF8A65", "#EF5DA8", "#9B5DE5", "#5C7CFA", "#4FC3D9", "#66BB6A", "#8D99AE", "#B0BEC5", "#78909C"];
const RADIANT_GOLD = "#FFD54F";

const SEASON_TRACKS = [
  { source: require("../../assets/spring/audio/FlowerGardenYoshi.mp3"), title: "Flower Field", game: "Yoshi Touch & Go" },
  { source: require("../../assets/spring/audio/ForestKirby.mp3"), title: "Forest / Nature Area", game: "Kirby and the Amazing Mirror" },
  { source: require("../../assets/spring/audio/SpringStadiumSonic.mp3"), title: "Spring Stadium", game: "Sonic 3D Blast" },
];

const SEASON_PETAL_ASSETS = [
  { asset: require("../../assets/spring/images/flower.png"), weight: 5 },
  { asset: require("../../assets/spring/images/flower01.png"), weight: 5 },
  { asset: require("../../assets/spring/images/flower02.png"), weight: 5 },
  { asset: require("../../assets/spring/images/flower03.png"), weight: 5 },
  { asset: require("../../assets/spring/images/flower04.png"), weight: 5 },
  { asset: require("../../assets/spring/images/flower05.png"), weight: 1 },
];

function pickPetalAsset() {
  const total = SEASON_PETAL_ASSETS.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * total;
  for (const p of SEASON_PETAL_ASSETS) {
    if (r < p.weight) return p.asset;
    r -= p.weight;
  }
  return SEASON_PETAL_ASSETS[0].asset;
}

const SEASON_PALETTES = {
  spring: {
    gradient: ["#FFF9E8", "#FFE3EE"],
    surface: "#FFFFFF",
    surfaceSoft: "#FFF1D6",
    outline: "#F4D9B4",
    textDark: "#3E2C1C",
    textMuted: "#8A6D57",
    pink: "#EC5F94",
    green: "#43A047",
    gold: "#D98E1E",
    purple: "#8E5FD6",
  },
};

function getPalette(seasonKey) {
  return (
    SEASON_PALETTES[seasonKey] || {
      gradient: ["#141018", "#0A0A0E"],
      surface: "#1C1A22",
      surfaceSoft: "#242230",
      outline: "#2E2C3A",
      textDark: "#F4F3F8",
      textMuted: "#9794A3",
      pink: "#EC5F94",
      green: "#43A047",
      gold: "#D98E1E",
      purple: "#8E5FD6",
    }
  );
}

function FloatingPetal({ asset, startX, size, duration, delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    function run() {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (finished && !cancelled) run();
      });
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-40, SCREEN_H + 40] });
  const translateX = anim.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [0, 16, -16, 18, -18, 16, -16, 10, 0],
  });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "160deg"] });
  const opacity = anim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 0.75, 0.75, 0] });

  return (
    <Animated.Image
      source={asset}
      resizeMode="contain"
      style={{ position: "absolute", left: startX, top: 0, width: size, height: size, opacity, transform: [{ translateY }, { translateX }, { rotate }] }}
    />
  );
}

function FloatingPetals({ count = 14 }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        asset: pickPetalAsset(),
        startX: Math.random() * (SCREEN_W - 30),
        size: 14 + Math.random() * 16,
        duration: 6500 + Math.random() * 4500,
        delay: (i / count) * 4500 + Math.random() * 1200,
      })),
    [count]
  );

  return (
    <Portal>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {petals.map((p) => (
          <FloatingPetal key={p.id} asset={p.asset} startX={p.startX} size={p.size} duration={p.duration} delay={p.delay} />
        ))}
      </View>
    </Portal>
  );
}

function ButterflySvg({ palette }) {
  return (
    <Svg width={34} height={28} viewBox="0 0 34 28">
      <Path d="M17 14 C10 2, 1 2, 3 11 C5 18, 13 17, 17 14 Z" fill={palette.pink} />
      <Path d="M17 14 C10 26, 1 26, 3 17 C5 12, 13 13, 17 14 Z" fill={palette.purple} />
      <Path d="M17 14 C24 2, 33 2, 31 11 C29 18, 21 17, 17 14 Z" fill={palette.pink} />
      <Path d="M17 14 C24 26, 33 26, 31 17 C29 12, 21 13, 17 14 Z" fill={palette.purple} />
      <Line x1="17" y1="6" x2="17" y2="22" stroke={palette.textDark} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function BeeSvg() {
  return (
    <Svg width={26} height={20} viewBox="0 0 26 20">
      <Ellipse cx={9} cy={7} rx={7} ry={5.5} fill="rgba(255,255,255,0.55)" />
      <Ellipse cx={16} cy={7} rx={7} ry={5.5} fill="rgba(255,255,255,0.4)" />
      <Ellipse cx={13} cy={12} rx={10} ry={7} fill="#F2B84B" />
      <Path d="M4 8 L22 8" stroke="#241A05" strokeWidth={3} />
      <Path d="M6 15 L20 15" stroke="#241A05" strokeWidth={3} />
    </Svg>
  );
}

function FlutteringCreature({ kind, palette }) {
  const flap = useRef(new Animated.Value(0)).current;
  const flight = useRef(new Animated.Value(0)).current;
  const startY = useRef(90 + Math.random() * Math.max(SCREEN_H - 320, 100)).current;
  const fromLeft = useRef(Math.random() > 0.5).current;
  const duration = useRef(kind === "bee" ? 5000 + Math.random() * 2000 : 7500 + Math.random() * 3000).current;

  useEffect(() => {
    const flapLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, { toValue: 1, duration: kind === "bee" ? 80 : 150, useNativeDriver: true }),
        Animated.timing(flap, { toValue: 0, duration: kind === "bee" ? 80 : 150, useNativeDriver: true }),
      ])
    );
    flapLoop.start();
    Animated.timing(flight, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
    return () => flapLoop.stop();
  }, []);

  const translateX = flight.interpolate({
    inputRange: [0, 1],
    outputRange: fromLeft ? [-40, SCREEN_W + 40] : [SCREEN_W + 40, -40],
  });
  const translateY = flight.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [startY, startY - 34, startY + 22, startY - 28, startY],
  });
  const opacity = flight.interpolate({ inputRange: [0, 0.06, 0.9, 1], outputRange: [0, 1, 1, 0] });
  const scaleX = flap.interpolate({ inputRange: [0, 1], outputRange: [1, kind === "bee" ? 0.85 : 0.4] });

  return (
    <Animated.View style={{ position: "absolute", top: 0, left: 0, opacity, transform: [{ translateX }, { translateY }] }}>
      <Animated.View style={{ transform: [{ scaleX }] }}>
        {kind === "butterfly" ? <ButterflySvg palette={palette} /> : <BeeSvg />}
      </Animated.View>
    </Animated.View>
  );
}

function OccasionalCreatures({ palette }) {
  const [items, setItems] = useState([]);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    function scheduleNext() {
      const delay = 12000 + Math.random() * 13000; 
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        const kind = Math.random() < 0.5 ? "butterfly" : "bee";
        const id = `${Date.now()}-${Math.random()}`;
        setItems((prev) => [...prev, { id, kind }]);
        setTimeout(() => {
          if (!cancelled) setItems((prev) => prev.filter((it) => it.id !== id));
        }, 11500);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <Portal>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {items.map((it) => (
          <FlutteringCreature key={it.id} kind={it.kind} palette={palette} />
        ))}
      </View>
    </Portal>
  );
}

const SEASON_MESSAGES = [
  // Genéricas
  "¡Den su mejor esfuerzo! 🌸",
  "¡Que gane el/la mejor!",
  "Cada combate suma 🌷",
  "¡A por la insignia!",
  "¡Mucha suerte a todos!",
  "¡No se guarden nada! 💪",

  // Desvan
  "Desvan ya está calentando los insultos para el próximo combate 😤",
  "Yoshi entra a la cancha... y Desvan también, a los gritos",
  "¿Alguien vio a Desvan? Se fue a respirar después de perder una vida",
  "Desvan, cuidado con los ligamentos de la mano negrito",
  "Cuidado con las provocaciones de Desvan, después no se hace cargo",
  "Desvan y su Yoshi, la combinación menos tranquila de Smash 33",
  "Practicá la paciencia, Desvan — pronto vas a ser papá 👶",
  "Desvan perdiendo el control... otra vez",
  "El huevito de Yoshi es lo único tranquilo que tiene Desvan",
  "Desvan: gana con estilo, pierde con gritos",
  "Alguien cronometrá cuánto tarda Desvan en faltarte el respeto esta vez",
  "Desvan ya practica para las noches sin dormir...",
  "Con Desvan nunca sabés si ganó o perdió: siempre grita igual",
  "Yoshi jamás se enoja. Desvan, en cambio...",
  "La bronca de Desvan dura más que la partida",
  "Desvan: te quedó el culo como la que te habla",
  "Desvan se prepara para ser padre practicando el autocontrol... en la vida real, no acá",

  // Tato
  "Tato ajustándose los lentes antes de humillarte",
  "El joystick rosa de Tato acumulando flor de victorias",
  "La Mari ya sabe que hoy Tato llega tarde por el torneo",
  "Con esos lentes, Tato ve tus combos venir de lejos",
  "Tato: el mejor jugador y el más elegante con su joystick rosa",
  "Si Tato gana, la Mari ya sabe que festeja toda la noche",
  "Nadie le discute el primer puesto a Tato... todavía",
  "El secreto de Tato: buena vista, mejor joystick",
  "Tato juega, la Mari aguanta",
  "Oye Tato, me quieres verdad?",
  "Tato no necesita gritar, solo ganar",
  "El Tato se acomoda los lentes y Desvan se pone una curita en la cola",
  "Tato: consistencia, estilo y un toque de rosa",
  "La Mari ya conoce de memoria la cara de campeón de Tato",
  "Con Tato al mando (rosa), la corona tiembla",
  "El Tato, como roba con su ROB",
  "Totoine, ya te arreglaron el quincho?",

  // Aure ("el Lance")
  "El Lance nunca vio un tutorial en su vida, y se nota",
  "Aure inventando la pólvora de nuevo con una táctica que ya existía",
  "Cuidado con el 'Abajo y Jamás' del Lance, ahí no hay vuelta atrás",
  "El Lance ya suma otra mandíbula a la colección",
  "Aure prefiere descubrirlo todo solo, tutoriales para qué",
  "El Aureliano, si que es fuerte",
  "El Lance no lee guías, rompe ortos",
  "Otra mandíbula para la vitrina del Lance",
  "Aure descubriendo el agua tibia, otra vez",
  "El Lance no necesita internet, tiene instinto (solo un poco)",
  "Cuando el Lance dice 'Saluda al Sol', ya podés ir despidiéndote",
  "Aure coleccionando mandíbulas como quien junta figuritas",
  "El Lance sigue tratando de inventar algo que ya existe hace 10 años",
  "Oye Lance, porque tan abajo en el ranking?",
  "El Lance, si que es la piedra del papel de Tato",
  "Aure: cero tutoriales, cien mandíbulas coleccionadas",
  "Con el Lance nunca sabés",

  // Shu
  "Sin la Switch de Shu, no hay torneo — no lo olviden",
  "Shu llega con la consola y con hambre de empanadas de María Alsina",
  "La sonrisa de Shu tiene un huequito, pero el combo no falla",
  "Shu: casado en la vida, soltero para los combos",
  "Empanadas de María Alsina antes, Smash después — el ritual de Shu",
  "Gracias a Shu tenemos consola. Gracias a María Alsina, empanadas",
  "Shu sonríe con esa paleta bebé cada vez que gana",
  "Flor de pija se come el Shu",
  "Sin Shu no hay consola. Sin empanadas, Shu no está contento",
  "Ganondorf es débil, te suena Shu?",
  "Shu llega, prende la Switch, y ya estamos listos",
  "María Alsina no sabe el poder que tiene sobre el rendimiento de Shu",
  "Shu: el proveedor oficial de consola del Gremio",
  "Cuando Shu sonríe con el huequito, algo bueno está por pasar",
  "Todos amamos la Switch de Shu casi tanto como él las empanadas",
  "Shu, guardián de la consola y de las mejores empanadas del Gremio",

  // Rivalidad Tato vs Kevin
  "Tato y Kevin, la rivalidad que nadie pidió pero todos disfrutan",
  "Cuando juegan Tato y Kevin, hasta la Mari deja de mirar el celular",
  "Kevin ya está pensando en cómo trollear a Tato en la próxima ronda",
  "Tato con el joystick rosa, Kevin con ganas de arruinarle la tarde",
  "Si perdés contra Kevin, prepará el pecho... viene la chocolatada",
  "Kevin: agita, prepara, ¡chocolatada al pecho! 🍫",
  "Tato gana, Kevin jura revancha (y trae más chocolatada)",
  "La final soñada de todos: Tato vs Kevin, con la Mari de público",
  "Cuidado con Kevin, siempre tiene una chocolatada guardada para el que pierde",
  "Kevin no perdona: gana o te tira la chocolatada igual",

  // Rivalidad Desvan vs Aure (el Lance)
  "Desvan y Aure, la rivalidad que termina siempre en gritos... de un solo lado",
  "Aure inventando la pólvora, Desvan gritándole que ya la inventó",
  "Cuando juegan Desvan y Aure, el Abajo y Jamás se cruza con la bronca",
  "Desvan pierde la paciencia, Aure ni se entera y sigue jugando",
  "El Lance con su técnica, Desvan con sus gritos: duelo clásico del Gremio",

  // Desvan y las esquinas
  "Desvan otra vez metido en la esquina, tirando flechas como si no hubiera mañana",
  "A Desvan lo encontrás siempre en la esquina, con el arco listo",
  "Desvan: si hay una esquina, ahí está, tirando flechas",

  // Tato y el Aserejé
  "Tato ganó y ya está bailando el Au seu ti Pego de festejo 💃",
  "Nossa , Mossa así vosse mi Mata, la conocen verdad?",
];

const SPRING_LOADING_ASSETS = [
  require("../../assets/spring/images/flower01.png"),
  require("../../assets/spring/images/flower02.png"),
  require("../../assets/spring/images/flower03.png"),
  require("../../assets/spring/images/flower04.png"),
];

function LoadingFlower({ palette }) {
  const spin = useRef(new Animated.Value(0)).current;
  const asset = useRef(SPRING_LOADING_ASSETS[Math.floor(Math.random() * SPRING_LOADING_ASSETS.length)]).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={[styles.loadingWrap, { height: BAND_HEIGHT * 4 + 110 }]}>
      <Animated.Image source={asset} style={{ width: 84, height: 84, transform: [{ rotate }] }} resizeMode="contain" />
      <Text style={[styles.loadingLabel, { color: palette.pink }]}>Floreciendo el ranking...</Text>
    </View>
  );
}

function EmptyRankingState({ mode, palette }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] });

  return (
    <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.pink }]}>
      <View style={styles.emptyFlowerRow}>
        <Image source={require("../../assets/spring/images/flower02.png")} style={styles.emptySideFlower} resizeMode="contain" />
        <Animated.Image
          source={require("../../assets/spring/images/flower.png")}
          style={[styles.emptyMainFlower, { transform: [{ translateY }, { rotate }] }]}
          resizeMode="contain"
        />
        <Image source={require("../../assets/spring/images/flower03.png")} style={styles.emptySideFlower} resizeMode="contain" />
      </View>

      <Text style={[styles.emptyTitle, { color: palette.textDark }]}>
        {mode === "players" ? "¡Bienvenidos a la Temporada de Primavera!" : "Todavía no hay personajes destacados"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
        {mode === "players"
          ? "Jueguen algunos torneos para arrancar el Ranking Smash 33 🌸"
          : "Todavía no se usó ningún personaje en los torneos de los jugadores incluidos."}
      </Text>
    </View>
  );
}

function RankBar({ items, season, palette }) {
  const total = items.length;
  const H = BAND_HEIGHT * Math.max(total, 1);

  const [message, setMessage] = useState(() => SEASON_MESSAGES[Math.floor(Math.random() * SEASON_MESSAGES.length)]);

  useEffect(() => {
    const id = setInterval(() => {
      setMessage(SEASON_MESSAGES[Math.floor(Math.random() * SEASON_MESSAGES.length)]);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim2 = useRef(new Animated.Value(0)).current;
  const sparkleAnim3 = useRef(new Animated.Value(0)).current;
  const climbAnims = useRef([]).current;
  while (climbAnims.length < items.length) climbAnims.push(new Animated.Value(0));

  useEffect(() => {
    climbAnims.forEach((a) => a.setValue(0));
    Animated.stagger(
      100,
      items.map((_, i) => Animated.timing(climbAnims[i], { toValue: 1, duration: 1050, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
    ).start();
  }, [items.map((it) => it.key).join(",")]);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const sparkleLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim2, { toValue: 1, duration: 700, delay: 250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sparkleAnim2, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const sparkleLoop3 = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim3, { toValue: 1, duration: 1100, delay: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sparkleAnim3, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    glowLoop.start();
    sparkleLoop.start();
    sparkleLoop2.start();
    sparkleLoop3.start();
    return () => {
      floatLoop.stop();
      glowLoop.stop();
      sparkleLoop.stop();
      sparkleLoop2.stop();
      sparkleLoop3.stop();
    };
  }, [floatAnim, glowAnim, sparkleAnim, sparkleAnim2, sparkleAnim3]);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const floatRotate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.35] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const sparkleOpacityA = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const sparkleOpacityB = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] });
  const sparkleOpacityC = sparkleAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });
  const sparkleOpacityD = sparkleAnim3.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] });
  const sparkleScaleC = sparkleAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] });
  const sparkleScaleD = sparkleAnim3.interpolate({ inputRange: [0, 1], outputRange: [1.15, 0.7] });

  return (
    <View style={{ alignItems: "center", marginTop: SPACING.l }}>
      {season.mascotAsset && (
        <View style={[styles.badgeRow, { width: BAR_WIDTH }]}>
          <View style={styles.badgeLeftText}>
            <Text style={[styles.badgeLeftLine, { color: palette.textDark }]}>Premio de la temporada:</Text>
            <View style={styles.badgeLeftArrowRow}>
              <Text style={[styles.badgeLeftLine, { color: palette.pink }]}>Insignia Flor</Text>
              <MaterialCommunityIcons name="arrow-right-thick" size={18} color={palette.pink} style={{ marginLeft: 4 }} />
            </View>
          </View>

          <View style={styles.badgeMascotWrap}>
            <Animated.View
              style={[
                styles.badgeGlow,
                { backgroundColor: RADIANT_GOLD, opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />
            <Animated.Image
              source={season.mascotAsset}
              style={[styles.badgeMascot, { transform: [{ translateY: floatTranslate }, { rotate: floatRotate }] }]}
              resizeMode="contain"
            />
            <Animated.View style={[styles.sparkleA, { opacity: sparkleOpacityA }]}>
              <MaterialCommunityIcons name="star-four-points" size={13} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleB, { opacity: sparkleOpacityB }]}>
              <MaterialCommunityIcons name="star-four-points" size={10} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleC, { opacity: sparkleOpacityC, transform: [{ scale: sparkleScaleC }] }]}>
              <MaterialCommunityIcons name="star-four-points" size={11} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleD, { opacity: sparkleOpacityD, transform: [{ scale: sparkleScaleD }] }]}>
              <MaterialCommunityIcons name="star-four-points" size={8} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleE, { opacity: sparkleOpacityC }]}>
              <MaterialCommunityIcons name="star-four-points" size={9} color={RADIANT_GOLD} />
            </Animated.View>
          </View>

          <View style={styles.speechBubbleRow}>
            <View style={[styles.speechDot1, { backgroundColor: palette.surface, borderColor: palette.pink }]} />
            <View style={[styles.speechDot2, { backgroundColor: palette.surface, borderColor: palette.pink }]} />
            <View style={[styles.speechBubble, { backgroundColor: palette.surface, borderColor: palette.pink }]}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: palette.textDark, textAlign: "center", lineHeight: 16 }} numberOfLines={6}>
                {message}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ width: BAR_WIDTH, height: H, marginTop: SPACING.m }}>
        <View style={[styles.rankBarShell, { borderColor: palette.pink }]}>
          {Array.from({ length: Math.max(total, 1) }).map((_, i) => (
            <LinearGradient
              key={i}
              colors={[lighten(RANK_COLORS[i % RANK_COLORS.length], 0.25), RANK_COLORS[i % RANK_COLORS.length]]}
              style={[
                styles.rankBand,
                {
                  height: BAND_HEIGHT,
                  borderTopLeftRadius: i === 0 ? RADIUS.xl : 0,
                  borderTopRightRadius: i === 0 ? RADIUS.xl : 0,
                  borderBottomLeftRadius: i === Math.max(total, 1) - 1 ? RADIUS.xl : 0,
                  borderBottomRightRadius: i === Math.max(total, 1) - 1 ? RADIUS.xl : 0,
                },
              ]}
            />
          ))}
        </View>

        {items.map((item, i) => {
          const targetY = i * BAND_HEIGHT + BAND_HEIGHT / 2 - 28;
          const anim = climbAnims[i];
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [H - 28, targetY] });

          return (
            <Animated.View
              key={item.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                paddingHorizontal: SPACING.l,
                flexDirection: "row",
                alignItems: "center",
                opacity: anim,
                transform: [{ translateY }],
              }}
            >
              <View style={styles.rankNumberBadge}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#FFFFFF" }}>{i + 1}</Text>
              </View>
              <View style={[styles.rankAvatarRing, { borderColor: "rgba(255,255,255,0.9)" }]}>
                {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.rankAvatarImg} />}
              </View>
              <View style={styles.rankNameChip}>
                <Text style={styles.rankNameText} numberOfLines={1}>{item.label}</Text>
                {item.sublabel && <Text style={styles.rankSubLabelText} numberOfLines={1}>{item.sublabel}</Text>}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const NEXT_SEASON_EMOJI = { spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️" };

function getEndedPositionVisual(index, total, palette) {
  const position = index + 1;
  const isLast = position === total;
  if (position === 2) return { icon: "medal", color: "#C7CDD6" };
  if (position === 3) return { icon: "medal", color: "#CD7F32" };
  if (isLast && total > 3) return { icon: "emoticon-poop", color: palette.textMuted };
  if (position === 4) return { icon: "medal", color: "#8B5A2B" };
  return { icon: null, color: palette.pink };
}

function lighten(hex, amount) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export default function WorldRankingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [mode, setMode] = useState("players");
  const [now, setNow] = useState(new Date());

  const [currentTrack, setCurrentTrack] = useState(() => SEASON_TRACKS[Math.floor(Math.random() * SEASON_TRACKS.length)]);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const notifAnim = useRef(new Animated.Value(0)).current;
  const player = useAudioPlayer(currentTrack.source);

  const insigniaFloatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(insigniaFloatAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(insigniaFloatAnim, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [insigniaFloatAnim]);
  const insigniaTranslate = insigniaFloatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const insigniaRotate = insigniaFloatAnim.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "5deg"] });

  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [finished, setFinished] = useState([]);
  const [allRounds, setAllRounds] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [includedUids, setIncludedUids] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: "none" } });
      return () => {
        parent?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation])
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCurrentTrack(SEASON_TRACKS[Math.floor(Math.random() * SEASON_TRACKS.length)]);
    }, [])
  );

  useEffect(() => {
    if (!isFocused) {
      player.pause();
      return;
    }

    player.seekTo(0);
    player.play();

    setShowNowPlaying(true);
    notifAnim.setValue(0);
    Animated.sequence([
      Animated.timing(notifAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(notifAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setShowNowPlaying(false));

  }, [currentTrack, isFocused]);

  useEffect(() => {
    const unsub = listenRankingSettings((settings) => setIncludedUids(settings.includedUids || []));
    return unsub;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [users, finishedTournaments, characters] = await Promise.all([getAllUsers(), getFinishedTournaments(), getAllCharacters()]);
    const roundsByTournament = await Promise.all(
      finishedTournaments.map(async (t) => (await getRounds(t.id)).map((r) => ({ ...r, tournamentId: t.id })))
    );
    setAllUsers(users);
    setFinished(finishedTournaments);
    setAllRounds(roundsByTournament.flat().filter((r) => r.roundNumber > 0));
    setAllCharacters(characters);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seasonInfo = getSeasonInfo(now);
  const season = SEASONS[seasonInfo.key];
  const visibleEnd = getVisibleSeasonEnd(seasonInfo);
  const seasonEnded = now >= visibleEnd;
  const nextSeason = SEASONS[getNextSeasonKey(seasonInfo.key)];

  const [historySnapshot, setHistorySnapshot] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!seasonEnded) return;
    let cancelled = false;
    setHistoryLoading(true);
    getSeasonHistory()
      .then((entries) => {
        if (cancelled) return;
        const match = entries.find((e) => e.seasonKey === seasonInfo.key);
        setHistorySnapshot(match || null);
      })
      .catch((e) => console.log("Error cargando historial de temporada:", e.message))
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seasonEnded, seasonInfo.key]);
  const palette = getPalette(seasonInfo.key);

  const { qualified, topCharacters } = computeRankingData({
    users: allUsers,
    finished,
    allRounds,
    allCharacters,
    includedUids,
  });

  const revealPlayers = historySnapshot ? historySnapshot.players : qualified;
  const revealLoading = historyLoading || (!historySnapshot && loading);

  const activeList =
    mode === "players"
      ? qualified.slice(0, MAX_PLAYER_SLOTS)
      : topCharacters.slice(0, MAX_CHARACTER_SLOTS).map((c) => ({ ...c, character: { name: c.characterName, images: { iconImage: c.characterIcon } } }));

  const barItems =
    mode === "players"
      ? activeList.map((m) => ({ key: m.uid, imageUri: m.photoURL, label: m.playerName }))
      : activeList.map((c) => ({
          key: c.charId,
          imageUri: c.character.images?.iconImage,
          label: c.character.name,
          sublabel: c.topPlayerName ? `Usado por ${c.topPlayerName}` : null,
        }));

  return (
    <LinearGradient colors={palette.gradient} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.l, paddingTop: insets.top + SPACING.l, paddingBottom: SPACING.xxxl }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate("MoreHome")} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={palette.textDark} />
          </Pressable>
          <Image source={require("../../assets/logo.webp")} style={[styles.logo, { tintColor: palette.pink }]} resizeMode="contain" />
          <View style={{ marginLeft: SPACING.m }}>
            <Text style={styles.title}>
              <Text style={{ color: palette.pink }}>Ranking</Text>{" "}
              <Text style={{ color: palette.green }}>Smash</Text>{" "}
              <Text style={{ color: palette.gold }}>33</Text>
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>Basado en torneos y combates de todos</Text>
          </View>
        </View>

        <View style={[styles.seasonBanner, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
          <View style={[styles.seasonIconWrap, { backgroundColor: `${palette.pink}22` }]}>
            <MaterialCommunityIcons name={season.icon} size={26} color={palette.pink} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text style={[styles.seasonTitle, { color: palette.textDark }]}>Temporada de {season.label}</Text>
            <Text style={[styles.seasonCountdown, { color: palette.pink }]}>
              {seasonEnded ? "Terminó — a la espera de Verano" : `Termina en ${formatCountdown(visibleEnd, now).days} días`}
            </Text>
          </View>
        </View>

        {seasonEnded ? (
          <View style={[styles.endedCard, { backgroundColor: palette.surface, borderColor: palette.gold }]}>
            <MaterialCommunityIcons name="flag-checkered" size={38} color={palette.gold} />
            <Text style={[styles.endedTitle, { color: palette.textDark }]}>
              La Temporada de {season.label} ha terminado
            </Text>

            {revealLoading ? (
              <Skeleton width={140} height={140} radius={70} style={{ marginTop: SPACING.l, backgroundColor: palette.surfaceSoft }} />
            ) : revealPlayers.length === 0 ? (
              <Text style={{ color: palette.textMuted, marginTop: SPACING.m, textAlign: "center" }}>
                No hubo suficientes jugadores incluidos para coronar a nadie esta vez.
              </Text>
            ) : (
              <>
                <View style={styles.endedDuoRow}>
                  <View style={styles.endedDuoCol}>
                    <Text style={[styles.endedBigLabel, { color: palette.pink }]}>JUGADOR{"\n"}GANADOR</Text>
                    <Avatar.Image size={100} source={{ uri: revealPlayers[0].photoURL }} />
                    <Text style={[styles.endedChampionName, { color: palette.textDark }]} numberOfLines={1}>
                      {revealPlayers[0].playerName}
                    </Text>
                  </View>

                  <View style={styles.endedDuoCol}>
                    <Text style={[styles.endedBigLabel, { color: palette.pink }]}>PERSONAJE{"\n"}GANADOR</Text>
                    {revealPlayers[0].bestCharacterFullImage ? (
                      <Image
                        source={{ uri: revealPlayers[0].bestCharacterFullImage }}
                        style={styles.endedCharBigImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={[styles.endedCharBigImage, styles.endedCharFallback, { backgroundColor: palette.surfaceSoft }]}>
                        <MaterialCommunityIcons name="sword-cross" size={40} color={palette.textMuted} />
                      </View>
                    )}
                    <Text style={[styles.endedChampionName, { color: palette.textDark }]} numberOfLines={1}>
                      {revealPlayers[0].bestCharacterName || "Sin datos"}
                    </Text>
                  </View>
                </View>

                <View style={styles.endedInsigniaSection}>
                  <Animated.Image
                    source={season.mascotAsset}
                    style={[
                      styles.endedBigInsignia,
                      { transform: [{ translateY: insigniaTranslate }, { rotate: insigniaRotate }] },
                    ]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.endedWonText, { color: palette.pink }]}>¡GANARON LA INSIGNIA FLOR!</Text>
                </View>

                {revealPlayers.slice(1, MAX_PLAYER_SLOTS).length > 0 && (
                  <View style={styles.endedRestList}>
                    {revealPlayers.slice(1, MAX_PLAYER_SLOTS).map((m, idx) => {
                      const pos = getEndedPositionVisual(idx + 1, revealPlayers.length, palette);
                      return (
                        <View key={m.uid} style={[styles.endedRestRow, { backgroundColor: palette.surfaceSoft }]}>
                          <View style={styles.endedRestPosWrap}>
                            {pos.icon ? (
                              <MaterialCommunityIcons name={pos.icon} size={20} color={pos.color} />
                            ) : (
                              <Text style={{ fontWeight: "800", color: pos.color, fontSize: 13 }}>{idx + 2}°</Text>
                            )}
                          </View>
                          <Avatar.Image size={32} source={{ uri: m.photoURL }} style={{ marginRight: SPACING.s }} />
                          <Text style={{ color: palette.textDark, fontSize: 14, fontWeight: "700", flex: 1 }} numberOfLines={1}>{m.playerName}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            <Text style={[styles.endedFootnote, { color: palette.pink }]}>
              ¡Prepárense para la Temporada de {nextSeason.label}! {NEXT_SEASON_EMOJI[nextSeason.key] || ""}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.toggleRow}>
              <Pressable onPress={() => setMode("players")} style={{ flex: 1 }}>
                {mode === "players" ? (
                  <LinearGradient colors={[palette.pink, "#F58AB0"]} style={styles.toggleBtn}>
                    <Text style={styles.toggleTextActive}>Jugadores</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.toggleBtn, { backgroundColor: palette.surface, borderColor: palette.pink, borderWidth: 1.5 }]}>
                    <Text style={[styles.toggleTextInactive, { color: palette.pink }]}>Jugadores</Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={() => setMode("characters")} style={{ flex: 1 }}>
                {mode === "characters" ? (
                  <LinearGradient colors={[palette.green, "#6FCB74"]} style={styles.toggleBtn}>
                    <Text style={styles.toggleTextActive}>Personajes</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.toggleBtn, { backgroundColor: palette.surface, borderColor: palette.green, borderWidth: 1.5 }]}>
                    <Text style={[styles.toggleTextInactive, { color: palette.green }]}>Personajes</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {loading ? (
              <LoadingFlower palette={palette} />
            ) : activeList.length === 0 ? (
              <EmptyRankingState mode={mode} palette={palette} />
            ) : (
              <RankBar items={barItems} season={season} palette={palette} />
            )}
          </>
        )}

        <Pressable onPress={() => navigation.navigate("SeasonHistory")} style={styles.historyBtn}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={18} color={palette.purple} />
          <Text style={{ color: palette.purple, fontWeight: "700", marginLeft: SPACING.xs }}>Ver temporadas pasadas</Text>
        </Pressable>
      </ScrollView>

      {showNowPlaying && (
        <Portal>
          <Animated.View
            style={[
              styles.nowPlayingBanner,
              {
                top: insets.top + 8,
                backgroundColor: palette.surface,
                borderColor: palette.pink,
                opacity: notifAnim,
                transform: [{ translateY: notifAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
              },
            ]}
          >
            <Image source={require("../../assets/logo.webp")} style={[styles.nowPlayingLogo, { tintColor: palette.pink }]} resizeMode="contain" />
            <View style={{ flex: 1, marginLeft: SPACING.s }}>
              <Text style={{ color: palette.textDark, fontWeight: "800", fontSize: 13 }} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={{ color: palette.textMuted, fontSize: 11 }} numberOfLines={1}>{currentTrack.game}</Text>
            </View>
            <MaterialCommunityIcons name="music-note" size={16} color={palette.green} />
          </Animated.View>
        </Portal>
      )}

      {isFocused && <FloatingPetals />}
      {isFocused && <OccasionalCreatures palette={palette} />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  nowPlayingBanner: {
    position: "absolute",
    left: SPACING.l,
    right: SPACING.l,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.s,
    zIndex: 30,
    elevation: 30,
  },
  nowPlayingLogo: { width: 28, height: 28 },
  endedCard: {
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: SPACING.xl,
    marginTop: SPACING.l,
  },
  endedTitle: { fontFamily: "Fredoka_700Bold", fontSize: 19, textAlign: "center", marginTop: SPACING.s },
  endedDuoRow: { flexDirection: "row", justifyContent: "center", gap: SPACING.xl, marginTop: SPACING.l, width: "100%" },
  endedDuoCol: { alignItems: "center", flex: 1 },
  endedBigLabel: { fontSize: 14, fontWeight: "800", letterSpacing: 0.6, textAlign: "center", marginBottom: SPACING.s, lineHeight: 17 },
  endedCharBigImage: { width: 100, height: 100 },
  endedCharFallback: { alignItems: "center", justifyContent: "center", borderRadius: RADIUS.lg },
  endedBigInsignia: { width: 130, height: 130 },
  endedInsigniaSection: { alignItems: "center", marginTop: SPACING.xl },
  endedWonText: { fontFamily: "Fredoka_700Bold", fontSize: 19, marginTop: SPACING.s, textAlign: "center" },
  endedChampionName: { fontFamily: "Fredoka_700Bold", fontSize: 16, marginTop: SPACING.s, textAlign: "center" },
  endedRestList: { width: "100%", marginTop: SPACING.xl },
  endedRestRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.md, padding: SPACING.s, marginBottom: SPACING.s,
  },
  endedRestPosWrap: { width: 28, alignItems: "center", justifyContent: "center", marginRight: SPACING.xs },
  endedFootnote: { fontWeight: "700", marginTop: SPACING.l, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.l },
  backBtn: { marginRight: SPACING.xs, padding: 4 },
  logo: { width: 40, height: 40 },
  title: { fontFamily: "Fredoka_700Bold", fontSize: 22 },

  seasonBanner: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.xl, borderWidth: 1.5,
    padding: SPACING.l, marginBottom: SPACING.l,
  },
  seasonIconWrap: { width: 48, height: 48, borderRadius: RADIUS.lg, alignItems: "center", justifyContent: "center" },
  seasonTitle: { fontFamily: "Fredoka_700Bold", fontSize: 20 },
  seasonCountdown: { fontFamily: "Fredoka_700Bold", fontSize: 16, marginTop: 3 },

  toggleRow: { flexDirection: "row", gap: SPACING.s, marginBottom: SPACING.s },
  toggleBtn: {
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.m,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextActive: { color: "#FFFFFF", fontFamily: "Fredoka_600SemiBold", fontSize: 14 },
  toggleTextInactive: { fontFamily: "Fredoka_600SemiBold", fontSize: 14 },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeLeftText: { flex: 1, paddingLeft: SPACING.m, paddingRight: SPACING.s },
  badgeLeftLine: { fontFamily: "Fredoka_700Bold", fontSize: 15, lineHeight: 19 },
  badgeLeftArrowRow: { flexDirection: "row", alignItems: "center" },
  badgeMascotWrap: { width: 62, height: 62, alignItems: "center", justifyContent: "center" },
  badgeGlow: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  badgeMascot: { width: 62, height: 62 },
  sparkleA: { position: "absolute", top: -6, right: -4 },
  sparkleB: { position: "absolute", bottom: 0, left: -8 },
  sparkleC: { position: "absolute", top: 6, left: -10 },
  sparkleD: { position: "absolute", bottom: -6, right: 2 },
  sparkleE: { position: "absolute", top: -8, left: 14 },
  speechBubbleRow: { flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: SPACING.xs },
  speechDot1: { width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, marginRight: 3 },
  speechDot2: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, marginRight: 5 },
  speechBubble: {
    flex: 1,
    height: 96,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
  },
  rankBarShell: {
    borderWidth: 2,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  rankBand: { width: "100%" },
  rankNumberBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center", justifyContent: "center",
    marginRight: SPACING.s,
  },
  rankAvatarRing: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  rankAvatarImg: { width: 51, height: 51, borderRadius: 26 },
  rankNameChip: {
    flex: 1,
    marginLeft: SPACING.m,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
  },
  rankNameText: { color: "#FFFFFF", fontFamily: "Fredoka_600SemiBold", fontSize: 15 },
  rankSubLabelText: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 1 },
  emptyCard: {
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.l,
  },
  emptyFlowerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: SPACING.l },
  emptyMainFlower: { width: 84, height: 84, marginHorizontal: SPACING.s },
  emptySideFlower: { width: 44, height: 44, opacity: 0.75 },
  emptyTitle: { fontFamily: "Fredoka_700Bold", fontSize: 19, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginTop: SPACING.s, lineHeight: 19 },
  loadingWrap: { alignItems: "center", justifyContent: "center", marginTop: SPACING.l },
  loadingLabel: { marginTop: SPACING.m, fontFamily: "Fredoka_700Bold", fontSize: 16, letterSpacing: 0.3 },
  historyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: SPACING.xxl, padding: SPACING.s },
});