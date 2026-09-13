//Character:
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseConfig";

let cachedCharacters = null;

export async function getAllCharacters() {
  if (cachedCharacters) return cachedCharacters;
  const q = query(collection(db, "characters"), orderBy("fighterNumber"));
  const snap = await getDocs(q);
  cachedCharacters = snap.docs.map((d) => d.data());
  return cachedCharacters;
}

export function getCharacterById(characters, id) {
  return characters.find((c) => c.id === id) || null;
}
