// Types for bracket system
export interface Athlete {
  registrationNo: string;
  fullName: string;
  gender: 'Male' | 'Female';
  weight: number;
  height: number;
  club: string;
  status: string;
  medicalClearance: string;
}

export interface WeightCategory {
  name: string;
  minWeight: number;
  maxWeight: number;
}

export interface Bracket {
  id: string;
  division: string; // e.g., "Male U-60kg", "Female U-55kg"
  gender: string;
  weightCategory: WeightCategory;
  athletes: Athlete[];
  rounds: Round[];
  winner?: Athlete;
}

export interface Match {
  id: string;
  round: number;
  athlete1?: Athlete;
  athlete2?: Athlete;
  winner?: Athlete;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Round {
  number: number;
  matches: Match[];
}

// Weight categories for karate tournaments (based on common standards)
export const WEIGHT_CATEGORIES: WeightCategory[] = [
  { name: 'U-50kg', minWeight: 0, maxWeight: 50 },
  { name: 'U-55kg', minWeight: 50.1, maxWeight: 55 },
  { name: 'U-60kg', minWeight: 55.1, maxWeight: 60 },
  { name: 'U-65kg', minWeight: 60.1, maxWeight: 65 },
  { name: 'U-70kg', minWeight: 65.1, maxWeight: 70 },
  { name: 'U-75kg', minWeight: 70.1, maxWeight: 75 },
  { name: 'U-80kg', minWeight: 75.1, maxWeight: 80 },
  { name: 'U-85kg', minWeight: 80.1, maxWeight: 85 },
  { name: '+85kg', minWeight: 85.1, maxWeight: 500 },
];

/**
 * Categorize athletes into weight brackets
 */
export function categorizeAthletes(athletes: Athlete[]): Map<string, Bracket> {
  const brackets = new Map<string, Bracket>();

  // Group by gender and weight category
  const grouped = new Map<string, Athlete[]>();

  athletes.forEach((athlete) => {
    // Only include athletes with cleared medical status
    if (athlete.medicalClearance !== 'Cleared') {
      return;
    }

    const category = findWeightCategory(athlete.weight);
    const divisionKey = `${athlete.gender}-${category.name}`;

    if (!grouped.has(divisionKey)) {
      grouped.set(divisionKey, []);
    }
    grouped.get(divisionKey)!.push(athlete);
  });

  // Create brackets
  let bracketId = 1;
  grouped.forEach((athletes, divisionKey) => {
    const [gender, categoryName] = divisionKey.split('-');
    const category = WEIGHT_CATEGORIES.find((c) => c.name === categoryName)!;

    const bracket: Bracket = {
      id: `bracket-${bracketId}`,
      division: divisionKey,
      gender,
      weightCategory: category,
      athletes: athletes.sort(() => Math.random() - 0.5), // Shuffle for random seeding
      rounds: [],
      winner: undefined,
    };

    bracket.rounds = generateRounds(bracket.athletes);
    brackets.set(divisionKey, bracket);
    bracketId++;
  });

  return brackets;
}

/**
 * Find the appropriate weight category for an athlete
 */
function findWeightCategory(weight: number): WeightCategory {
  return (
    WEIGHT_CATEGORIES.find(
      (cat) => weight >= cat.minWeight && weight <= cat.maxWeight
    ) || WEIGHT_CATEGORIES[WEIGHT_CATEGORIES.length - 1]
  );
}

/**
 * Generate tournament rounds using single-elimination format
 */
function generateRounds(athletes: Athlete[]): Round[] {
  const rounds: Round[] = [];
  let currentRound = athletes;

  let roundNumber = 1;

  while (currentRound.length > 1) {
    const matches: Match[] = [];

    for (let i = 0; i < currentRound.length; i += 2) {
      const matchId = `match-${roundNumber}-${Math.floor(i / 2)}`;
      const match: Match = {
        id: matchId,
        round: roundNumber,
        athlete1: currentRound[i],
        athlete2: currentRound[i + 1] || undefined,
        winner: undefined,
        status: 'pending',
      };
      matches.push(match);
    }

    rounds.push({
      number: roundNumber,
      matches,
    });

    // Prepare for next round (simulate winners advancing)
    currentRound = matches.map((m) => m.athlete1!); // In real scenario, use actual winners
    roundNumber++;
  }

  return rounds;
}

/**
 * Convert athletes array to bracket groups
 */
export function generateBrackets(athletes: Athlete[]): Bracket[] {
  const bracketMap = categorizeAthletes(athletes);
  return Array.from(bracketMap.values());
}

/**
 * Get bracket statistics
 */
export function getBracketStats(brackets: Bracket[]) {
  return {
    totalBrackets: brackets.length,
    totalAthletes: brackets.reduce((sum, b) => sum + b.athletes.length, 0),
    byGender: {
      male: brackets.filter((b) => b.gender === 'Male').length,
      female: brackets.filter((b) => b.gender === 'Female').length,
    },
    byCategory: brackets.map((b) => ({
      division: b.division,
      count: b.athletes.length,
    })),
  };
}
