//Firestore:
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebaseConfig";

// ---------- USUARIOS ----------

export async function createUserProfile({ uid, email, playerName, photoURL }) {
  await setDoc(doc(db, "users", uid), {
    uid,
    email,
    playerName,
    playerNameLower: playerName.toLowerCase(),
    photoURL: photoURL || null,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  const payload = { ...data };
  if (payload.playerName) payload.playerNameLower = payload.playerName.toLowerCase();
  await updateDoc(doc(db, "users", uid), payload);
}

export async function getAllUsers() {
  const q = query(collection(db, "users"), orderBy("playerNameLower"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function uploadProfilePhoto(uid, uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `profile-photos/${uid}.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

// ---------- MIS PERSONAJES----------

export function listenMyCharacters(uid, callback) {
  const q = query(collection(db, "users", uid, "myCharacters"), orderBy("addedAt"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}

export async function addMyCharacter(uid, characterId) {
  await setDoc(doc(db, "users", uid, "myCharacters", characterId), {
    characterId,
    addedAt: serverTimestamp(),
  });
}

export async function removeMyCharacter(uid, characterId) {
  await deleteDoc(doc(db, "users", uid, "myCharacters", characterId));
}

export async function getMyCharacterWinCounts(uid) {
  const q = query(collection(db, "tournaments"), where("participantUids", "array-contains", uid));
  const tournamentsSnap = await getDocs(q);

  const wins = {};
  for (const tDoc of tournamentsSnap.docs) {
    const roundsSnap = await getDocs(collection(db, "tournaments", tDoc.id, "rounds"));
    roundsSnap.docs.forEach((r) => {
      const round = r.data();
      if (round.winnerUid !== uid) return;
      const charId = round.characters?.[uid];
      if (!charId) return;
      wins[charId] = (wins[charId] || 0) + 1;
    });
  }
  return wins;
}

// ---------- TORNEOS ----------

export function listenActiveTournament(callback) {
  const q = query(collection(db, "tournaments"), where("status", "==", "in_progress"), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
      return;
    }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() });
  });
}

export async function createTournament({ createdBy, roster }) {
  const activeQ = query(collection(db, "tournaments"), where("status", "==", "in_progress"), limit(1));
  const activeSnap = await getDocs(activeQ);
  if (!activeSnap.empty) {
    throw new Error("Ya hay un torneo en curso. Esperá a que termine para crear uno nuevo.");
  }

  const baseParticipants = roster.map((p) => ({
    uid: p.uid,
    playerName: p.playerName,
    photoURL: p.photoURL || null,
    points: 0,
    usedCharacterIds: [],
    currentCharacterId: null,
  }));

  const docRef = await addDoc(collection(db, "tournaments"), {
    createdBy,
    createdAt: serverTimestamp(),
    finishedAt: null,
    status: "in_progress",
    winnerUid: null,
    roster,
    participantUids: roster.map((p) => p.uid),
    participants: baseParticipants,
  });

  return docRef.id;
}

export function listenTournament(tournamentId, callback) {
  return onSnapshot(doc(db, "tournaments", tournamentId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function listenRounds(tournamentId, callback) {
  const q = query(collection(db, "tournaments", tournamentId, "rounds"), orderBy("roundNumber"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getRounds(tournamentId) {
  const q = query(collection(db, "tournaments", tournamentId, "rounds"), orderBy("roundNumber"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function submitRound({ tournamentId, roundNumber, winnerUid, characters }) {
  await addDoc(collection(db, "tournaments", tournamentId, "rounds"), {
    roundNumber,
    winnerUid: winnerUid || null,
    characters,
    createdAt: serverTimestamp(),
  });
}

export async function correctRound({ tournamentId, roundId, winnerUid, characters }) {
  await updateDoc(doc(db, "tournaments", tournamentId, "rounds", roundId), {
    winnerUid: winnerUid || null,
    characters,
  });
}

export async function applyRecomputedState({ tournamentId, participants, winnerUid, isFinished }) {
  await updateDoc(doc(db, "tournaments", tournamentId), {
    participants,
    winnerUid: winnerUid || null,
    status: isFinished ? "finished" : "in_progress",
    finishedAt: isFinished ? serverTimestamp() : null,
  });
}

export async function getFinishedTournaments() {
  try {
    const q = query(collection(db, "tournaments"), where("status", "==", "finished"));
    const snap = await getDocs(q);
    const tournaments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tournaments.sort((a, b) => (b.finishedAt?.toMillis?.() || 0) - (a.finishedAt?.toMillis?.() || 0));
    return tournaments;
  } catch (e) {
    console.log("Error consultando torneos terminados:", e.message);
    return [];
  }
}

export async function deleteTournament(tournamentId) {
  const roundsSnap = await getDocs(collection(db, "tournaments", tournamentId, "rounds"));
  for (const roundDoc of roundsSnap.docs) {
    const reactionsSnap = await getDocs(collection(db, "tournaments", tournamentId, "rounds", roundDoc.id, "reactions"));
    await Promise.all(reactionsSnap.docs.map((r) => deleteDoc(r.ref)));
    await deleteDoc(roundDoc.ref);
  }
  const commentsSnap = await getDocs(collection(db, "tournaments", tournamentId, "comments"));
  await Promise.all(commentsSnap.docs.map((c) => deleteDoc(c.ref)));
  await deleteDoc(doc(db, "tournaments", tournamentId));
}

// ---------- INVITACIONES ----------

export function listenActiveInvitation(callback) {
  const q = query(collection(db, "invitations"), where("status", "==", "open"), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
      return;
    }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() });
  });
}

export async function createInvitation({ createdBy, slots }) {
  const activeQ = query(collection(db, "invitations"), where("status", "==", "open"), limit(1));
  const activeSnap = await getDocs(activeQ);
  if (!activeSnap.empty) {
    throw new Error("Ya hay una invitación abierta. Cerrala antes de crear otra.");
  }

  const docRef = await addDoc(collection(db, "invitations"), {
    createdBy,
    createdAt: serverTimestamp(),
    status: "open",
    slots,
  });
  return docRef.id;
}

export function listenInvitation(invitationId, callback) {
  return onSnapshot(doc(db, "invitations", invitationId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function listenInvitationVotes(invitationId, callback) {
  return onSnapshot(collection(db, "invitations", invitationId, "votes"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function setMyInvitationVote({ invitationId, uid, playerName, photoURL, slotIds }) {
  await setDoc(doc(db, "invitations", invitationId, "votes", uid), {
    uid,
    playerName,
    photoURL: photoURL || null,
    slotIds,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInvitation(invitationId) {
  const votesSnap = await getDocs(collection(db, "invitations", invitationId, "votes"));
  await Promise.all(votesSnap.docs.map((v) => deleteDoc(v.ref)));
  await deleteDoc(doc(db, "invitations", invitationId));
}

export async function getLastFinishedTournament() {
  const tournaments = await getFinishedTournaments();
  return tournaments[0] || null;
}

export async function getPlayerDeepStats(uid) {
  const q = query(collection(db, "tournaments"), where("participantUids", "array-contains", uid));
  const tournamentsSnap = await getDocs(q);

  const characterWins = {};
  const lossPairs = {}; 
  const beatenPairs = new Set();

  for (const tDoc of tournamentsSnap.docs) {
    const roundsSnap = await getDocs(collection(db, "tournaments", tDoc.id, "rounds"));
    roundsSnap.docs.forEach((r) => {
      const round = r.data();
      if (!round.roundNumber) return; 
      const chars = round.characters || {};

      if (round.winnerUid === uid) {
        const myChar = chars[uid];
        if (myChar) characterWins[myChar] = (characterWins[myChar] || 0) + 1;
        Object.entries(chars).forEach(([otherUid, charId]) => {
          if (otherUid === uid) return;
          beatenPairs.add(`${otherUid}|${charId}`);
        });
      } else if (chars[uid]) {
        const winnerChar = chars[round.winnerUid];
        if (winnerChar) {
          const key = `${round.winnerUid}|${winnerChar}`;
          lossPairs[key] = (lossPairs[key] || 0) + 1;
        }
      }
    });
  }

  let nemesis = null;
  Object.entries(lossPairs).forEach(([key, count]) => {
    if (count < 2 || beatenPairs.has(key)) return;
    if (!nemesis || count > nemesis.count) {
      const [opponentUid, characterId] = key.split("|");
      nemesis = { opponentUid, characterId, count };
    }
  });

  return { characterWins, nemesis };
}

// ---------- COMENTARIOS Y REACCIONES ----------

export function listenComments(tournamentId, callback) {
  const q = query(collection(db, "tournaments", tournamentId, "comments"), orderBy("createdAt"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addComment({ tournamentId, uid, playerName, photoURL, text }) {
  await addDoc(collection(db, "tournaments", tournamentId, "comments"), {
    uid,
    playerName,
    photoURL: photoURL || null,
    text,
    createdAt: serverTimestamp(),
  });
}

export function listenRoundReactions(tournamentId, roundId, callback) {
  return onSnapshot(collection(db, "tournaments", tournamentId, "rounds", roundId, "reactions"), (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const likes = docs.filter((d) => d.reaction === "like").length;
    const dislikes = docs.filter((d) => d.reaction === "dislike").length;
    callback({ likes, dislikes, docs });
  });
}

export async function setRoundReaction({ tournamentId, roundId, uid, playerName, reaction }) {
  await setDoc(doc(db, "tournaments", tournamentId, "rounds", roundId, "reactions", uid), {
    uid,
    playerName,
    reaction,
    updatedAt: serverTimestamp(),
  });
}
