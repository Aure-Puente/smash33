//VoiceAliasesService:
import { deleteField, doc, FieldPath, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { setCustomAliases } from "../utils/voiceMatch";

const aliasesRef = () => doc(db, "settings", "voiceAliases");

function normalize(data) {
  return { players: data?.players || {}, characters: data?.characters || {} };
}

export async function loadVoiceAliases() {
  try {
    const snap = await getDoc(aliasesRef());
    const data = normalize(snap.exists() ? snap.data() : null);
    setCustomAliases(data);
    return data;
  } catch (e) {
    console.log("Error leyendo alias de voz:", e.message);
    return normalize(null);
  }
}

export function listenVoiceAliases(callback) {
  return onSnapshot(
    aliasesRef(),
    (snap) => {
      const data = normalize(snap.exists() ? snap.data() : null);
      setCustomAliases(data);
      callback?.(data);
    },
    (e) => console.log("Error escuchando alias de voz:", e.message)
  );
}

export async function savePlayerAliases(uid, aliases) {
  await setDoc(aliasesRef(), { players: { [uid]: aliases } }, { merge: true });
}

export async function saveCharacterAliases(fighterNumber, aliases) {
  await setDoc(aliasesRef(), { characters: { [String(fighterNumber)]: aliases } }, { merge: true });
}

export async function resetPlayerAliases(uid) {
  await updateDoc(aliasesRef(), new FieldPath("players", uid), deleteField());
}

export async function resetCharacterAliases(fighterNumber) {
  await updateDoc(aliasesRef(), new FieldPath("characters", String(fighterNumber)), deleteField());
}