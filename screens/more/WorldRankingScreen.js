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
import { scale } from "../../utils/responsive";

//JS:
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MAX_PLAYER_SLOTS = 8;
const MAX_CHARACTER_SLOTS = 10;
const BAND_HEIGHT = scale(80);
const BAR_WIDTH = SCREEN_W - SPACING.l * 2;

const RANK_COLORS = ["#F2B84B", "#FF8A65", "#EF5DA8", "#9B5DE5", "#5C7CFA", "#4FC3D9", "#66BB6A", "#8D99AE", "#B0BEC5", "#78909C"];
const RADIANT_GOLD = "#FFD54F";

const SEASON_TRACKS = [
  { source: require("../../assets/spring/audio/FlowerGardenYoshi.mp3"), title: "Flower Field", game: "Yoshi Touch & Go" },
  { source: require("../../assets/spring/audio/ForestKirby.mp3"), title: "Forest / Nature Area", game: "Kirby and the Amazing Mirror" },
  { source: require("../../assets/spring/audio/SpringStadiumSonic.mp3"), title: "Spring Stadium", game: "Sonic 3D Blast" },
];

const SEASON_PETAL_ASSETS = [
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
  "¡Que gane el mejor!",
  "Cada combate suma 🌷",
  "¡A por la insignia!",
  "¡Mucha suerte a todos!",
  "¡No se guarden nada! 💪",

  // Desvan
  "Desvan, cuidado con los ligamentos de la mano negrito",
  "Practicá la paciencia, Desvan — pronto vas a ser papá 👶",
  "Desvan perdiendo el control... otra vez",
  "Las sillas tiemblan cuando Desvan está por perder...",
  "Desvan ya practica para las noches sin dormir...",
  "Desvan: te quedó el culo como una flor",
  "Desvan se prepara para ser padre practicando el autocontrol...",
  "Sufre Desvan mas que en la despedida de soltero",
  "Desvan con el OK de Mica, listo para gremiar",
  "Desvan es de River, o sea que ya perdió antes de arrancar el torneo",
  "River pierde más finales que Desvan combates",
  "Con Desvan de River, la pregunta no es si pierde, es cuántas veces",

  // Tato
  "Tato ajustándose los lentes antes de humillarte",
  "El joystick rosa de Tato acumulando flor de victorias",
  "La Mari ya sabe que hoy Tato llega tarde por el torneo",
  "Con esos lentes, Tato ve tus combos venir de lejos, claro que si",
  "Si Tato gana, la Mari ya sabe que festeja toda la noche",
  "Oye Tato, me quieres verdad?",
  "El Tato se acomoda los lentes y a Desvan no le gusta",
  "La Mari ya conoce de memoria la cara de campeón de Tato",
  "El Tato, como roba con su ROB",
  "Totoine, ya te arreglaron el quincho?",
  "Sin la foto a la Mari, el torneo ni cuenta",
  "Tato jura que hoy no compra más cartas de Magic...",
  "Nadie toca la carta de Cloud de Tato, ni en broma",

  // Aure ("el Lance")
  "El Lance nunca vio un tutorial en su vida, y se nota",
  "Cuidado con el 'Abajo y Jamás' del Lance",
  "El Lance ya suma otra mandíbula a la colección",
  "Aure prefiere descubrirlo todo solo, tutoriales para qué",
  "El Aureliano, si que es fuerte",
  "El Lance no lee guías, rompe ortos",
  "Otra mandíbula para la vitrina del Lance",
  "El Lance no necesita internet, tiene instinto (solo un poco)",
  "Cuando el Lance dice 'Saluda al Sol', ya podés ir despidiéndote",
  "Oye Lance, porque tan abajo en el ranking?",
  "El Lance, si que es la piedra del papel de Tato",
  "Aure: cero tutoriales, cien mandíbulas coleccionadas",
  "Con el Lance nunca sabés, ja",

  // Shu
  "Sin la Switch de Shu, no hay torneo — no lo olviden",
  "Shu llega con la consola y con hambre de empanadas de María Alsina",
  "Flor de pija se come el Shu",
  "Ganondorf es débil, te suena Shu?",
  "Shu: el proveedor oficial de consola del Gremio",
  "Ja , el Lance si que le gana en todo al Shu",
  "Shu extraña al Pepi más de lo que extraña ganarle a Aure",
  "Sin el visto bueno de la Belencita, no hay Gremio",
  "Oye Shu!, ya sabemos que no invitás a tu hermano por miedo a perder",

  // Rivalidad Tato vs Kevin
  "Tato y Kevin, la rivalidad que nadie pidió pero todos disfrutan",
  "Kevin ya está focuseando  a Tato",
  "Tato con el joystick rosa, Kevin con ganas de arruinarle la night",
  "Si perdés contra Kevin, prepará el pecho... viene la chocolatada",
  "Kevin: agita, prepara, ¡chocolatada al pecho! 🍫",
  "Tato gana, Kevin jura revancha con la trompada de fuego",
  "Cuidado con Kevin, siempre saca el 9, pregunten al Lance",

  // Rivalidad Desvan vs Aure (el Lance)
  "Desvan y Aure, la rivalidad que termina siempre en gritos... de un solo lado",
  "Aure inventando la pólvora, Desvan gritándole que ya se inventó",
  "El Lance con su técnica, Desvan con sus gritos: duelo clásico del Gremio",
  "Aure queriendo ser amigos, el Descan queriendo matarlo solo por eso",
  "La wifit del Lance, si que queda siempre bien parada",
  "La primera clase, es gratis",
  "La segunda clase te la cobran",
  "No se queden sin ir a Londres, ya sale el último tren",
  "Se acuerdan de Carmandú, pueden ir en tren a verlo",

  // Desvan y las esquinas
  "Desvan el flechero maal parado de la esquina",

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
    <View style={[styles.loadingWrap, { height: BAND_HEIGHT * 4 + scale(110) }]}>
      <Animated.Image source={asset} style={{ width: scale(84), height: scale(84), transform: [{ rotate }] }} resizeMode="contain" />
      <Text style={[styles.loadingLabel, { color: palette.pink }]}>Floreciendo el ranking...</Text>
    </View>
  );
}

function EmptyRankingState({ mode, palette }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const spinLeftAnim = useRef(new Animated.Value(0)).current;
  const spinRightAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spinLeftAnim, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spinLeftAnim]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spinRightAnim, { toValue: 1, duration: 6200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spinRightAnim]);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -scale(10)] });
  const rotate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  const spinLeftDeg = spinLeftAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const spinRightDeg = spinRightAnim.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] });

  return (
      <LinearGradient colors={[palette.gradient[1], palette.gradient[0]]} style={[styles.emptyCard, { borderColor: palette.pink, borderWidth: 1.5 }]}>      
      <View style={styles.emptyFlowerRow}>
        <Animated.Image
          source={require("../../assets/spring/images/flower02.png")}
          style={[styles.emptySideFlower, { transform: [{ rotate: spinLeftDeg }] }]}
          resizeMode="contain"
        />
        <View style={styles.emptyMainFlowerWrap}>
          <Animated.View
            style={[styles.emptyMainGlow, { backgroundColor: RADIANT_GOLD, opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />
          <Animated.Image
            source={require("../../assets/spring/images/flower.png")}
            style={[styles.emptyMainFlower, { transform: [{ translateY }, { rotate }] }]}
            resizeMode="contain"
          />
        </View>
        <Animated.Image
          source={require("../../assets/spring/images/flower03.png")}
          style={[styles.emptySideFlower, { transform: [{ rotate: spinRightDeg }] }]}
          resizeMode="contain"
        />
      </View>

      <Text style={[styles.emptyTitle, { color: palette.green }]}>
        {mode === "players" ? "¡Bienvenidos a la Temporada de Primavera!" : "Todavía no hay personajes destacados"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>
        {mode === "players"
          ? "Jueguen algunos torneos para arrancar el Ranking Smash 33 🌸"
          : "Todavía no se usó ningún personaje en los torneos de los jugadores incluidos."}
      </Text>
    </LinearGradient>
  );
}

function RankBar({ items, season, palette }) {
  const total = items.length;
  const H = BAND_HEIGHT * Math.max(total, 1);

  const messageBagRef = useRef([]);

    function nextMessage() {
      if (messageBagRef.current.length === 0) {
        const bag = SEASON_MESSAGES.map((_, i) => i);
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        messageBagRef.current = bag;
      }
      const index = messageBagRef.current.pop();
      return SEASON_MESSAGES[index];
    }

    const [message, setMessage] = useState(() => nextMessage());

    useEffect(() => {
      const id = setInterval(() => {
        setMessage(nextMessage());
      }, 5000);
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
              <MaterialCommunityIcons name="arrow-right-thick" size={scale(18)} color={palette.pink} style={{ marginLeft: 4 }} />
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
              <MaterialCommunityIcons name="star-four-points" size={scale(13)} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleB, { opacity: sparkleOpacityB }]}>
              <MaterialCommunityIcons name="star-four-points" size={scale(10)} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleC, { opacity: sparkleOpacityC, transform: [{ scale: sparkleScaleC }] }]}>
              <MaterialCommunityIcons name="star-four-points" size={scale(11)} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleD, { opacity: sparkleOpacityD, transform: [{ scale: sparkleScaleD }] }]}>
              <MaterialCommunityIcons name="star-four-points" size={scale(8)} color={RADIANT_GOLD} />
            </Animated.View>
            <Animated.View style={[styles.sparkleE, { opacity: sparkleOpacityC }]}>
              <MaterialCommunityIcons name="star-four-points" size={scale(9)} color={RADIANT_GOLD} />
            </Animated.View>
          </View>

          <View style={styles.speechBubbleRow}>
            <View style={[styles.speechDot1, { backgroundColor: palette.surface, borderColor: palette.pink }]} />
            <View style={[styles.speechDot2, { backgroundColor: palette.surface, borderColor: palette.pink }]} />
            <View style={[styles.speechBubble, { backgroundColor: palette.surface, borderColor: palette.pink }]}>
              <Text style={{ fontSize: scale(13), fontWeight: "700", color: palette.textDark, textAlign: "center", lineHeight: scale(16) }} numberOfLines={6}>
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
          const targetY = i * BAND_HEIGHT + BAND_HEIGHT / 2 - scale(28);
          const anim = climbAnims[i];
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [H - scale(28), targetY] });

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
                <Text style={{ fontSize: scale(14), fontWeight: "800", color: "#FFFFFF" }}>{i + 1}</Text>
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
  const insigniaTranslate = insigniaFloatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -scale(16)] });
  const insigniaRotate = insigniaFloatAnim.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "5deg"] });

  const flagWaveAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flagWaveAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flagWaveAnim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flagWaveAnim]);
  const flagWaveRotate = flagWaveAnim.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] });

  const endedGlowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(endedGlowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(endedGlowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [endedGlowAnim]);
  const endedPersonGlowScale = endedGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.12] });
  const endedPersonGlowOpacity = endedGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });
  const endedInsigniaGlowScale = endedGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.15] });
  const endedInsigniaGlowOpacity = endedGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });

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
            <MaterialCommunityIcons name="arrow-left" size={scale(22)} color={palette.textDark} />
          </Pressable>
          <Image source={require("../../assets/logo.webp")} style={[styles.logo, { tintColor: palette.pink }]} resizeMode="contain" />
          <View style={{ marginLeft: SPACING.m }}>
            <Text style={styles.title}>
              <Text style={{ color: palette.pink }}>Ranking</Text>{" "}
              <Text style={{ color: palette.green }}>Smash</Text>{" "}
              <Text style={{ color: palette.gold }}>33</Text>
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: scale(12) }}>Basado en torneos y combates de todos</Text>
          </View>
        </View>

        <View style={[styles.seasonBanner, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
          <View style={[styles.seasonIconWrap, { backgroundColor: `${palette.pink}22` }]}>
            <MaterialCommunityIcons name={season.icon} size={scale(26)} color={palette.pink} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text style={[styles.seasonTitle, { color: palette.textDark }]}>Temporada de {season.label}</Text>
            <Text style={[styles.seasonCountdown, { color: palette.pink }]}>
              {seasonEnded ? "Terminó — a la espera de Verano" : `Termina en ${formatCountdown(visibleEnd, now).days} días`}
            </Text>
          </View>
        </View>

        {seasonEnded ? (
          <LinearGradient colors={[palette.gradient[1], palette.gradient[0]]} style={[styles.endedCard, { borderColor: palette.gold, borderWidth: 2 }]}>
            <Animated.View style={{ transform: [{ rotate: flagWaveRotate }] }}>
              <MaterialCommunityIcons name="flag-checkered" size={scale(38)} color={palette.gold} />
            </Animated.View>
            <Text style={[styles.endedTitle, { color: palette.gold }]}>
              La Temporada de {season.label} ha terminado
            </Text>

            {revealLoading ? (
              <Skeleton width={scale(140)} height={scale(140)} radius={scale(70)} style={{ marginTop: SPACING.l, backgroundColor: palette.surfaceSoft }} />
            ) : revealPlayers.length === 0 ? (
              <Text style={{ color: palette.textMuted, marginTop: SPACING.m, textAlign: "center" }}>
                No hubo suficientes jugadores incluidos para coronar a nadie esta vez.
              </Text>
            ) : (
              <>
                <View style={styles.endedDuoRow}>
                  <View style={styles.endedDuoCol}>
                    <Text style={[styles.endedBigLabel, { color: palette.pink }]}>JUGADOR{"\n"}GANADOR</Text>
                    <View style={styles.endedAvatarWrap}>
                      <Animated.View
                        style={[
                          styles.endedPersonGlow,
                          { backgroundColor: palette.pink, opacity: endedPersonGlowOpacity, transform: [{ scale: endedPersonGlowScale }] },
                        ]}
                      />
                      <Avatar.Image size={scale(100)} source={{ uri: revealPlayers[0].photoURL }} />
                    </View>
                    <Text style={[styles.endedChampionName, { color: palette.pink }]} numberOfLines={1}>
                      {revealPlayers[0].playerName}
                    </Text>
                  </View>

                  <View style={styles.endedDuoCol}>
                    <Text style={[styles.endedBigLabel, { color: palette.pink }]}>PERSONAJE{"\n"}GANADOR</Text>
                    <View style={styles.endedAvatarWrap}>
                      <Animated.View
                        style={[
                          styles.endedPersonGlow,
                          { backgroundColor: palette.pink, opacity: endedPersonGlowOpacity, transform: [{ scale: endedPersonGlowScale }] },
                        ]}
                      />
                      {revealPlayers[0].bestCharacterFullImage ? (
                        <Image
                          source={{ uri: revealPlayers[0].bestCharacterFullImage }}
                          style={styles.endedCharBigImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[styles.endedCharBigImage, styles.endedCharFallback, { backgroundColor: palette.surfaceSoft }]}>
                          <MaterialCommunityIcons name="sword-cross" size={scale(40)} color={palette.textMuted} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.endedChampionName, { color: palette.pink }]} numberOfLines={1}>
                      {revealPlayers[0].bestCharacterName || "Sin datos"}
                    </Text>
                  </View>
                </View>

                <View style={styles.endedInsigniaSection}>
                  <View style={styles.endedInsigniaWrap}>
                    <Animated.View
                      style={[
                        styles.endedInsigniaGlow,
                        { backgroundColor: RADIANT_GOLD, opacity: endedInsigniaGlowOpacity, transform: [{ scale: endedInsigniaGlowScale }] },
                      ]}
                    />
                    <Animated.Image
                      source={season.mascotAsset}
                      style={[
                        styles.endedBigInsignia,
                        { transform: [{ translateY: insigniaTranslate }, { rotate: insigniaRotate }] },
                      ]}
                      resizeMode="contain"
                    />
                  </View>
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
                              <MaterialCommunityIcons name={pos.icon} size={scale(20)} color={pos.color} />
                            ) : (
                              <Text style={{ fontWeight: "800", color: pos.color, fontSize: scale(13) }}>{idx + 2}°</Text>
                            )}
                          </View>
                          <Avatar.Image size={scale(32)} source={{ uri: m.photoURL }} style={{ marginRight: SPACING.s }} />
                          <Text style={{ color: palette.textDark, fontSize: scale(14), fontWeight: "700", flex: 1 }} numberOfLines={1}>{m.playerName}</Text>
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
          </LinearGradient>
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
          <MaterialCommunityIcons name="calendar-clock-outline" size={scale(18)} color={palette.purple} />
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
              <Text style={{ color: palette.textDark, fontWeight: "800", fontSize: scale(13) }} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={{ color: palette.textMuted, fontSize: scale(11) }} numberOfLines={1}>{currentTrack.game}</Text>
            </View>
            <MaterialCommunityIcons name="music-note" size={scale(16)} color={palette.green} />
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
  nowPlayingLogo: { width: scale(28), height: scale(28) },
  endedCard: {
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: SPACING.xl,
    marginTop: SPACING.l,
  },
  endedTitle: { fontFamily: "Fredoka_700Bold", fontSize: scale(19), textAlign: "center", marginTop: SPACING.s },
  endedDuoRow: { flexDirection: "row", justifyContent: "center", gap: SPACING.xl, marginTop: SPACING.l, width: "100%" },
  endedDuoCol: { alignItems: "center", flex: 1 },
  endedBigLabel: { fontSize: scale(14), fontWeight: "800", letterSpacing: 0.6, textAlign: "center", marginBottom: SPACING.l, lineHeight: scale(17) },
  endedAvatarWrap: { alignItems: "center", justifyContent: "center" },
  endedPersonGlow: {
    position: "absolute",
    width: scale(114),
    height: scale(114),
    borderRadius: scale(57)
  },
  endedCharBigImage: { width: scale(100), height: scale(100) },
  endedCharFallback: { alignItems: "center", justifyContent: "center", borderRadius: RADIUS.lg },
  endedInsigniaWrap: { alignItems: "center", justifyContent: "center" },
  endedInsigniaGlow: {
    position: "absolute",
    width: scale(150),
    height: scale(150),
    borderRadius: scale(75),
  },
  endedBigInsignia: { width: scale(130), height: scale(130) },
  endedInsigniaSection: { alignItems: "center", marginTop: SPACING.xl },
  endedWonText: { fontFamily: "Fredoka_700Bold", fontSize: scale(19), marginTop: SPACING.l, textAlign: "center" },
  endedChampionName: { fontFamily: "Fredoka_700Bold", fontSize: scale(16), marginTop: SPACING.l, textAlign: "center" },
  endedRestList: { width: "100%", marginTop: SPACING.xl },
  endedRestRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.md, padding: SPACING.s, marginBottom: SPACING.s,
  },
  endedRestPosWrap: { width: scale(28), alignItems: "center", justifyContent: "center", marginRight: SPACING.xs },
  endedFootnote: { fontWeight: "700", marginTop: SPACING.l, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.l },
  backBtn: { marginRight: SPACING.xs, padding: 4 },
  logo: { width: scale(40), height: scale(40) },
  title: { fontFamily: "Fredoka_700Bold", fontSize: scale(22) },

  seasonBanner: {
    flexDirection: "row", alignItems: "center",
    borderRadius: RADIUS.xl, borderWidth: 1.5,
    padding: SPACING.l, marginBottom: SPACING.l,
  },
  seasonIconWrap: { width: scale(48), height: scale(48), borderRadius: RADIUS.lg, alignItems: "center", justifyContent: "center" },
  seasonTitle: { fontFamily: "Fredoka_700Bold", fontSize: scale(20) },
  seasonCountdown: { fontFamily: "Fredoka_700Bold", fontSize: scale(16), marginTop: 3 },

  toggleRow: { flexDirection: "row", gap: SPACING.s, marginBottom: SPACING.s },
  toggleBtn: {
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.m,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextActive: { color: "#FFFFFF", fontFamily: "Fredoka_600SemiBold", fontSize: scale(14) },
  toggleTextInactive: { fontFamily: "Fredoka_600SemiBold", fontSize: scale(14) },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeLeftText: { flex: 1, paddingLeft: SPACING.m, paddingRight: SPACING.s },
  badgeLeftLine: { fontFamily: "Fredoka_700Bold", fontSize: scale(15), lineHeight: scale(19) },
  badgeLeftArrowRow: { flexDirection: "row", alignItems: "center" },
  badgeMascotWrap: { width: scale(62), height: scale(62), alignItems: "center", justifyContent: "center" },
  badgeGlow: {
    position: "absolute",
    width: scale(86),
    height: scale(86),
    borderRadius: scale(43),
  },
  badgeMascot: { width: scale(62), height: scale(62) },
  sparkleA: { position: "absolute", top: -6, right: -4 },
  sparkleB: { position: "absolute", bottom: 0, left: -8 },
  sparkleC: { position: "absolute", top: 6, left: -10 },
  sparkleD: { position: "absolute", bottom: -6, right: 2 },
  sparkleE: { position: "absolute", top: -8, left: 14 },
  speechBubbleRow: { flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: SPACING.xs },
  speechDot1: { width: scale(6), height: scale(6), borderRadius: scale(3), borderWidth: 1.5, marginRight: 3 },
  speechDot2: { width: scale(10), height: scale(10), borderRadius: scale(5), borderWidth: 1.5, marginRight: 5 },
  speechBubble: {
    flex: 1,
    height: scale(96),
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
    width: scale(30), height: scale(30), borderRadius: scale(15),
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center", justifyContent: "center",
    marginRight: SPACING.s,
  },
  rankAvatarRing: {
    width: scale(56), height: scale(56), borderRadius: scale(28), borderWidth: 2.5,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  rankAvatarImg: { width: scale(51), height: scale(51), borderRadius: scale(26) },
  rankNameChip: {
    flex: 1,
    marginLeft: SPACING.m,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
  },
  rankNameText: { color: "#FFFFFF", fontFamily: "Fredoka_600SemiBold", fontSize: scale(15) },
  rankSubLabelText: { color: "rgba(255,255,255,0.85)", fontSize: scale(11), marginTop: 1 },
  emptyCard: {
    alignItems: "center",
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.l,
  },
  emptyFlowerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: SPACING.l },
  emptyMainFlowerWrap: {
    width: scale(84), height: scale(84),
    alignItems: "center", justifyContent: "center",
    marginHorizontal: scale(26),
  },
  emptyMainGlow: {
    position: "absolute",
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
  },
  emptyMainFlower: { width: scale(84), height: scale(84) },
  emptySideFlower: { width: scale(44), height: scale(44), opacity: 0.85 },
  emptyTitle: { fontFamily: "Fredoka_700Bold", fontSize: scale(19), textAlign: "center" },
  emptySubtitle: { fontSize: scale(14), textAlign: "center", marginTop: SPACING.s, lineHeight: scale(19) },
  loadingWrap: { alignItems: "center", justifyContent: "center", marginTop: SPACING.l },
  loadingLabel: { marginTop: SPACING.m, fontFamily: "Fredoka_700Bold", fontSize: scale(16), letterSpacing: 0.3 },
  historyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: SPACING.xxl, padding: SPACING.s },
});