//RankingCalc:

export function computeRankingData({ users, finished, allRounds, allCharacters, includedUids }) {
    const userByUid = (uid) => users.find((u) => u.uid === uid);
    const charById = (id) => allCharacters.find((c) => c.fighterNumber === id);

    const commonFinished =
        includedUids.length > 0
        ? finished.filter((t) => includedUids.every((uid) => t.participantUids?.includes(uid)))
        : [];
    const commonIds = new Set(commonFinished.map((t) => t.id));
    const commonRounds = allRounds.filter((r) => commonIds.has(r.tournamentId));

    const qualified = includedUids
        .map((uid) => userByUid(uid))
        .filter(Boolean)
        .map((u) => {
        const played = commonFinished.filter((t) => t.participantUids?.includes(u.uid));
        const won = played.filter((t) => t.winnerUid === u.uid).length;
        const playedIds = new Set(played.map((t) => t.id));
        const userRounds = commonRounds.filter((r) => playedIds.has(r.tournamentId));
        const roundsWon = userRounds.filter((r) => r.winnerUid === u.uid).length;
        const tournamentWinRate = played.length > 0 ? won / played.length : 0;
        const roundWinRate = userRounds.length > 0 ? roundsWon / userRounds.length : 0;
        const score = (tournamentWinRate * 0.65 + roundWinRate * 0.35) * 100;

        const winCharCounts = {};
        userRounds.forEach((r) => {
            if (r.winnerUid !== u.uid) return;
            const charId = r.characters?.[u.uid];
            if (charId) winCharCounts[charId] = (winCharCounts[charId] || 0) + 1;
        });
        const [bestCharId] = Object.entries(winCharCounts).sort((a, b) => b[1] - a[1])[0] || [];

        return {
            uid: u.uid,
            playerName: u.playerName,
            photoURL: u.photoURL,
            played: played.length,
            won,
            roundsPlayed: userRounds.length,
            roundsWon,
            score,
            bestCharacterId: bestCharId || null,
            bestCharacterName: bestCharId ? charById(bestCharId)?.name || null : null,
            bestCharacterIcon: bestCharId ? charById(bestCharId)?.images?.iconImage || null : null,
            bestCharacterFullImage: bestCharId ? charById(bestCharId)?.images?.fullImage || null : null,
        };
        })
        .sort((a, b) => b.score - a.score);

    const charUsage = {};
    includedUids.forEach((uid) => {
        const played = commonFinished.filter((t) => t.participantUids?.includes(uid));
        const playedIds = new Set(played.map((t) => t.id));
        const userRounds = commonRounds.filter((r) => playedIds.has(r.tournamentId));
        userRounds.forEach((r) => {
        const charId = r.characters?.[uid];
        if (!charId) return;
        if (!charUsage[charId]) charUsage[charId] = { uses: 0, wins: 0, byPlayer: {} };
        charUsage[charId].uses += 1;
        if (!charUsage[charId].byPlayer[uid]) charUsage[charId].byPlayer[uid] = { uses: 0, wins: 0 };
        charUsage[charId].byPlayer[uid].uses += 1;
        if (r.winnerUid === uid) {
            charUsage[charId].wins += 1;
            charUsage[charId].byPlayer[uid].wins += 1;
        }
        });
    });

    const topCharacters = Object.entries(charUsage)
        .map(([charId, stat]) => {
        const topPlayerUid = Object.entries(stat.byPlayer).sort((a, b) => b[1].wins - a[1].wins)[0]?.[0];
        return {
            charId,
            characterName: charById(charId)?.name || null,
            characterIcon: charById(charId)?.images?.iconImage || null,
            uses: stat.uses,
            wins: stat.wins,
            score: (stat.wins / stat.uses) * 100,
            topPlayerUid: topPlayerUid || null,
            topPlayerName: topPlayerUid ? userByUid(topPlayerUid)?.playerName || null : null,
        };
        })
        .filter((c) => c.characterName)
        .sort((a, b) => b.score - a.score);

    return { qualified, topCharacters };
}