//VoiceMatch:

// ---------- Alias / sobrenombres ----------
export const PLAYER_ALIASES = {
    shu: ["kevin", "kesin", "el desgracia"],
    tato: ["tatoine", "tatarás", "tateishon", "lauta", "tauin"],
    desvan: ["descan", "descansaras", "iñaki", "iña", "desvanescense", "desacnesens"],
    aurex: ["aure", "el lans", "lancelot", "lans", "el mas fuerte", "lancilota"],
    matifliflinek: ["matiflinek", "mati", "matias", "karina yelinek", "mati shelinek"],
    matiflinek: ["matifliflinek", "mati", "matias", "karina yelinek", "mati shelinek"],
    lucks301: ["lucks", "lucas", "luquitas", "el hermano de kevin"],
    };

    export const CHARACTER_ALIASES = {
    miifighter: ["peleador mii", "tirador mii", "loushop", "bochi", "bochi vieri", "indesise"],
    miibrawler: ["peleador mii", "loushop", " el bochi", " el bochi vieri", "el bocha", "el bocha vieri"], 
    miigunner: ["tirador mii"],
    wiifittrainer: ["nemesis del descan", "nemesis del desvan", "entrenadora de wii fit", "balde de agua fria", "la wifit", "wifit"],
    cloud: ["claudio", "claudio lopez", "claudia"],
    luigi: ["el verde", "la prioridad"],
    sonic: ["sonico", "sonil", "velocidad supersonica"],
    isabelle: ["canela", "once y cincuenta y nueve", "11 59", "el confeti"],
    donkeykong: ["el mono", "el ozaru", "donkey"],
    link: ["linkin", "linkin park", "el recipiente"],
    samus: ["samuel"],
    ness: ["el niño abeja", "el niño"],
    ike: ["ique", "seuti pego"],
    pacman: ["paku paku", "pacman"],
    bowserjr: ["bowser junior"],
    ridley: ["pesadilla del fonoaudiologo"],
    piranhaplant: ["planta piraña", "planta tres acero"],
    hero: ["heroe", "todos a bordo", "a babor"],
    banjokazooie: ["banjo y kasui", "banjo"],
    byleth: ["violeta", "vaioletto"],
    stevealex: ["stiv", "steve", "alex"],
    steve: ["stiv", "alex"], 
    yoshi: ["ioshi", "yoyi"],
    captainfalcon: ["capitan falcon", "capitanaso", "policia de los niños", "falcon vistea la moda", "falcon"],
    drmario: ["doctor mario", "barney stinson"],
    marth: ["marta"],
    ganondorf: ["ganon"],
    rob: ["rob", "el robot", "robot"],
    younglink: ["joven link"],
    mrgamewatch: ["mister game and watch", "mister geim and wach", "geim and wach", "game and watch"],
    darkpit: ["pit sombrio", "pit oscuro"],
    snake: ["sneik", "snaque", "tigre gareca"],
    pokemontrainer: ["entrenador pokemon"],
    kingdedede: ["rey dedede", "el pinguino", "dedede"],
    villager: ["aldeano"],
    megaman: ["megamanco"],
    rosalinaluma: ["la rosalia", "rosalina", "rosalina y destello"],
    rosalinaluna: ["la rosalia", "rosalina", "rosalina y destello"],
    littlemac: ["el pequeño mac", "pequeño mac"],
    joker: ["puto de la facultad"],
    sephiroth: ["sefirot", "sefiroto"],
    sephirot: ["sefirot", "sefiroto"],
    pyramythra: ["mitrapira", "pyra", "mytra", "mitra", "pira", "las nenas"],
    };

    const normKey = (name) =>
    (name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const aliasesFor = (table, name) => table[normKey(name)] || [];

    // ---------- Normalización fonética ----------

    export function phonetic(text) {
    if (!text) return "";
    let s = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") 
        .replace(/[^a-z0-9ñ\s]/g, " ") 
        .replace(/\s+/g, " ")
        .trim();

    s = s
        .replace(/ph/g, "f")
        .replace(/sh/g, "ch")
        .replace(/qu/g, "k")
        .replace(/c(?=[ei])/g, "s")
        .replace(/c/g, "k")
        .replace(/w/g, "u")
        .replace(/y/g, "i")
        .replace(/v/g, "b")
        .replace(/z/g, "s")
        .replace(/x/g, "ks")
        .replace(/ll/g, "i")
        .replace(/h/g, "")
        .replace(/(.)\1+/g, "$1"); 

    return s;
    }

    const compact = (s) => s.replace(/\s/g, "");

    function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const curr = [i];
        for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        prev = curr;
    }
    return prev[b.length];
    }

    function similarity(a, b) {
    const x = compact(a);
    const y = compact(b);
    if (!x || !y) return 0;
    return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
    }

    function scoreInPhrase(phrase, name) {
    const words = phrase.split(" ").filter(Boolean);
    const nameWords = name.split(" ").filter(Boolean).length || 1;
    let best = similarity(phrase, name);
    for (let size = Math.max(1, nameWords - 1); size <= nameWords + 1; size++) {
        for (let i = 0; i + size <= words.length; i++) {
        best = Math.max(best, similarity(words.slice(i, i + size).join(" "), name));
        }
    }
    return best;
    }

    /**
     * @param {string[]} transcripts  
     * @param {{id: string, names: string[]}[]} options 
     * @returns {{ best: object|null, ranked: object[], heard: string, confident: boolean }}
     */
    export function matchSpoken(transcripts, options, { minScore = 0.62, margin = 0.08 } = {}) {
    const heard = transcripts?.[0] || "";
    const ranked = options
        .map((opt) => {
        let score = 0;
        let matched = ""; 
        transcripts.forEach((t) => {
            const phrase = phonetic(t);
            opt.names.forEach((n) => {
            const name = phonetic(n);
            const sc = scoreInPhrase(phrase, name);
            if (sc > score || (sc === score && name.length > matched.length)) {
                score = sc;
                matched = name;
            }
            });
        });
        return { id: opt.id, score, matched };
        })
        .sort((a, b) => b.score - a.score || b.matched.length - a.matched.length);

    const [first, second] = ranked;
    let confident = !!first && first.score >= minScore && (!second || first.score - second.score >= margin);

    if (!confident && first && second && first.score >= minScore) {
        const a = compact(first.matched);
        const b = compact(second.matched);
        if (a.length > b.length && a.includes(b)) confident = true;
    }

    return { best: confident ? first : null, ranked, heard, confident };
    }

    // ---------- Ayudantes para armar las opciones ----------
    export function playerOptions(participants) {
    return participants.map((p) => ({
        id: p.uid,
        names: [p.playerName, ...aliasesFor(PLAYER_ALIASES, p.playerName)],
    }));
    }

    export function characterOptions(characters) {
    return characters.map((c) => ({
        id: c.fighterNumber,
        names: [c.name, ...aliasesFor(CHARACTER_ALIASES, c.name)],
    }));
    }

    // ---------- Comandos ----------
    export const COMMANDS = {
    register: ["registrar resultado", "registrar ronda", "resultado"],
    back: ["atras", "volver", "para atras"],
    confirm: ["confirmar", "confirmo", "si", "dale"],
    cancel: ["cancelar", "no"],
    };

    export function commandOptions(ids) {
    return ids.map((id) => ({ id: `cmd:${id}`, names: COMMANDS[id] }));
    }

    export function wordCount(text) {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
    }

export const CONTINUOUS_MATCH = { minScore: 0.84, margin: 0.1 };