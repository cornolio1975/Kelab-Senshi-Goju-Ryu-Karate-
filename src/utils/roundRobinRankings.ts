import { Bout, Participant, Club } from '@/db/types';

export interface RoundRobinStat {
  participantId: string;
  fullName: string;
  clubName: string;
  wins: number;
  losses: number;
  draws: number;
  pointsScored: number;
  pointsConceded: number;
  pointsDifference: number;
}

/**
 * Calculates Round Robin standings based on:
 * 1. Number of wins
 * 2. Match points difference (points scored - points conceded)
 * 3. Total points scored
 * 4. Head-to-head result
 * 5. Tie (needs manual decision / Hantei)
 */
export function calculateRoundRobinRankings(
  bouts: Bout[],
  participants: Participant[],
  clubs: Club[]
): RoundRobinStat[] {
  const stats: Record<string, RoundRobinStat> = {};

  // Initialize stats for all athletes in the bouts
  bouts.forEach((b) => {
    [b.participant_a_id, b.participant_b_id].forEach((id) => {
      if (id && !stats[id]) {
        const p = participants.find((part) => part.id === id);
        const club = p ? clubs.find((c) => c.id === p.club_id) : null;
        stats[id] = {
          participantId: id,
          fullName: p ? p.full_name : 'Unknown Athlete',
          clubName: club ? club.name : 'Independent',
          wins: 0,
          losses: 0,
          draws: 0,
          pointsScored: 0,
          pointsConceded: 0,
          pointsDifference: 0,
        };
      }
    });
  });

  // Calculate scores
  bouts.forEach((b) => {
    if (b.status === 'Completed' || b.status === 'Walkover') {
      const idA = b.participant_a_id;
      const idB = b.participant_b_id;
      const scoreA = b.score_a || 0;
      const scoreB = b.score_b || 0;

      if (idA && stats[idA]) {
        stats[idA].pointsScored += scoreA;
        stats[idA].pointsConceded += scoreB;
      }
      if (idB && stats[idB]) {
        stats[idB].pointsScored += scoreB;
        stats[idB].pointsConceded += scoreA;
      }

      if (b.winner_id) {
        const winner = b.winner_id;
        const loser = winner === idA ? idB : idA;
        if (winner && stats[winner]) stats[winner].wins += 1;
        if (loser && stats[loser]) stats[loser].losses += 1;
      } else if (b.status === 'Completed') {
        // Draw (when status is Completed and winner_id is null)
        if (idA && stats[idA]) stats[idA].draws += 1;
        if (idB && stats[idB]) stats[idB].draws += 1;
      }
    }
  });

  // Compute point difference
  Object.values(stats).forEach((s) => {
    s.pointsDifference = s.pointsScored - s.pointsConceded;
  });

  const rankingList = Object.values(stats);

  // Sort according to WKF tie-breaking rules
  rankingList.sort((a, b) => {
    // 1. Number of wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 2. Match points difference
    if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;

    // 3. Total points scored
    if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;

    // 4. Head-to-head result
    const match = bouts.find(
      (m) =>
        (m.participant_a_id === a.participantId && m.participant_b_id === b.participantId) ||
        (m.participant_a_id === b.participantId && m.participant_b_id === a.participantId)
    );
    if (match && match.status === 'Completed' && match.winner_id) {
      if (match.winner_id === a.participantId) return -1;
      if (match.winner_id === b.participantId) return 1;
    }

    return 0; // Tie / Hantei
  });

  return rankingList;
}
