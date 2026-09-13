//TournamentLogic:

export const POINTS_TO_WIN = 3;

export function recomputeTournamentState(roster, rounds) {
  const state = roster.map((p) => ({
    ...p,
    points: 0,
    usedCharacterIds: [],
    currentCharacterId: null,
  }));

  let winnerUid = null;

  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  for (const round of sorted) {
    const characters = round.characters || {};
    for (const player of state) {
      const characterId = characters[player.uid];
      if (!characterId) continue;
      player.currentCharacterId = characterId;
      if (!player.usedCharacterIds.includes(characterId)) {
        player.usedCharacterIds.push(characterId);
      }
    }
    if (round.winnerUid) {
      const winner = state.find((p) => p.uid === round.winnerUid);
      if (winner) {
        winner.points += 1;
        if (winner.points >= POINTS_TO_WIN) {
          winnerUid = winner.uid;
        }
      }
    }
  }

  return { participants: state, winnerUid, isFinished: !!winnerUid };
}

export function getAvailableCharacterIds(allCharacterIds, usedCharacterIds) {
  return allCharacterIds.filter((id) => !usedCharacterIds.includes(id));
}
