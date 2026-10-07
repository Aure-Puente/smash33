// Escucha continua para manejar el torneo con la voz, más respuestas habladas.
//Importaciones:
import { useCallback, useEffect, useRef, useState } from "react";

//JS:
let SpeechRec = null;
let Speech = null;
let KeepAwake = null;
try { SpeechRec = require("expo-speech-recognition").ExpoSpeechRecognitionModule; } catch (e) { SpeechRec = null; }
try { Speech = require("expo-speech"); } catch (e) { Speech = null; }
try { KeepAwake = require("expo-keep-awake"); } catch (e) { KeepAwake = null; }

export const isVoiceSupported = !!SpeechRec;

const KEEP_AWAKE_TAG = "smash-voice";
const RESTART_DELAY = 350;

export default function useVoiceCommands({ enabled, onTranscripts, getContextualStrings }) {
    const [listening, setListening] = useState(false);
    const [muted, setMuted] = useState(false);
    const [lastHeard, setLastHeard] = useState("");
    const [permissionDenied, setPermissionDenied] = useState(false);

    const onTranscriptsRef = useRef(onTranscripts);
    onTranscriptsRef.current = onTranscripts;
    const contextRef = useRef(getContextualStrings);
    contextRef.current = getContextualStrings;

    const activeRef = useRef(false); 
    const speakingRef = useRef(false);
    const restartTimer = useRef(null);
    const speakIdRef = useRef(0);

    const active = !!SpeechRec && enabled && !muted && !permissionDenied;

    const startRecognition = useCallback(() => {
        if (!SpeechRec || !activeRef.current || speakingRef.current) return;
        try {
        SpeechRec.start({
            lang: "es-AR",
            interimResults: false,
            continuous: true,
            maxAlternatives: 5,
            contextualStrings: contextRef.current?.() || [],
        });
        setListening(true);
        } catch (e) {
        scheduleRestart();
        }
    }, []);

    function scheduleRestart() {
        clearTimeout(restartTimer.current);
        restartTimer.current = setTimeout(() => {
        if (activeRef.current && !speakingRef.current) startRecognition();
        }, RESTART_DELAY);
    }

    function stopRecognition() {
        clearTimeout(restartTimer.current);
        try { SpeechRec?.abort(); } catch (e) {}
        setListening(false);
    }

    useEffect(() => {
        if (!SpeechRec) return undefined;
        const subs = [
        SpeechRec.addListener("result", (event) => {
            if (!event.isFinal || speakingRef.current) return;
            const texts = (event.results || []).map((r) => r.transcript).filter(Boolean);
            if (!texts.length) return;
            setLastHeard(texts[0]);
            onTranscriptsRef.current?.(texts);
        }),
        SpeechRec.addListener("end", () => {
            setListening(false);
            if (activeRef.current && !speakingRef.current) scheduleRestart(); // el sistema cortó: retomamos
        }),
        SpeechRec.addListener("error", (event) => {
            setListening(false);
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setPermissionDenied(true);
            return;
            }
            if (activeRef.current && !speakingRef.current) scheduleRestart();
        }),
        ];
        return () => subs.forEach((s) => s.remove());
    }, []);

    useEffect(() => {
        activeRef.current = active;
        if (!SpeechRec) return undefined;

        if (active) {
        let cancelled = false;
        SpeechRec.requestPermissionsAsync().then((perm) => {
            if (cancelled) return;
            if (!perm.granted) {
            setPermissionDenied(true);
            return;
            }
            startRecognition();
        });
        KeepAwake?.activateKeepAwakeAsync?.(KEEP_AWAKE_TAG);
        return () => {
            cancelled = true;
        };
        }

        stopRecognition();
        KeepAwake?.deactivateKeepAwake?.(KEEP_AWAKE_TAG);
        return undefined;
    }, [active]);

    useEffect(
        () => () => {
        activeRef.current = false;
        stopRecognition();
        try { Speech?.stop(); } catch (e) {}
        KeepAwake?.deactivateKeepAwake?.(KEEP_AWAKE_TAG);
        },
        []
    );

    const say = useCallback((text) => {
        if (!text) return;
        if (!Speech) return;
        const id = ++speakIdRef.current;
        speakingRef.current = true;
        stopRecognition();
        const resume = () => {
        if (id !== speakIdRef.current) return;
        speakingRef.current = false;
        if (activeRef.current) scheduleRestart();
        };
        try { Speech.stop(); } catch (e) {}
        Speech.speak(text, { language: "es-AR", rate: 1.05, onDone: resume, onStopped: resume, onError: resume });
    }, []);

    return {
        supported: !!SpeechRec,
        listening,
        muted,
        toggleMute: () => setMuted((m) => !m),
        lastHeard,
        permissionDenied,
        say,
    };
}