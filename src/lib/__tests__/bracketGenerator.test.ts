import { describe, it, expect } from 'vitest';
import {
  categorizeAthletes,
  generateBrackets,
  getBracketStats,
  WEIGHT_CATEGORIES,
} from '../bracketGenerator';
import { Athlete } from '../bracketGenerator';

const mockAthletes: Athlete[] = [
  {
    registrationNo: 'REG-001',
    fullName: 'John Doe',
    gender: 'Male',
    weight: 65,
    height: 175,
    club: 'Dojo A',
    status: 'Confirmed',
    medicalClearance: 'Cleared',
  },
  {
    registrationNo: 'REG-002',
    fullName: 'Jane Smith',
    gender: 'Female',
    weight: 55,
    height: 165,
    club: 'Dojo B',
    status: 'Confirmed',
    medicalClearance: 'Cleared',
  },
  {
    registrationNo: 'REG-003',
    fullName: 'Bob Johnson',
    gender: 'Male',
    weight: 75,
    height: 180,
    club: 'Dojo A',
    status: 'Confirmed',
    medicalClearance: 'Cleared',
  },
  {
    registrationNo: 'REG-004',
    fullName: 'Alice Brown',
    gender: 'Female',
    weight: 48,
    height: 160,
    club: 'Dojo C',
    status: 'Confirmed',
    medicalClearance: 'Cleared',
  },
  {
    registrationNo: 'REG-005',
    fullName: 'Charlie Wilson',
    gender: 'Male',
    weight: 58,
    height: 170,
    club: 'Dojo B',
    status: 'Confirmed',
    medicalClearance: 'Review Needed',
  },
];

describe('Bracket Generator', () => {
  describe('categorizeAthletes', () => {
    it('should filter out athletes without medical clearance', () => {
      const brackets = categorizeAthletes(mockAthletes);
      const totalAthletes = Array.from(brackets.values()).reduce(
        (sum, bracket) => sum + bracket.athletes.length,
        0
      );
      expect(totalAthletes).toBe(4); // 5 athletes - 1 with "Review Needed"
    });

    it('should organize athletes by gender and weight category', () => {
      const brackets = categorizeAthletes(mockAthletes);
      const divisions = Array.from(brackets.keys());

      // Should have at least one male and one female division
      const maleCount = divisions.filter((d) => d.includes('Male')).length;
      const femaleCount = divisions.filter((d) => d.includes('Female')).length;

      expect(maleCount).toBeGreaterThan(0);
      expect(femaleCount).toBeGreaterThan(0);
    });

    it('should place athletes in correct weight categories', () => {
      const brackets = categorizeAthletes(mockAthletes);
      const maleU65 = brackets.get('Male-U-65kg');

      if (maleU65) {
        // John Doe should be in U-65kg
        expect(maleU65.athletes.some((a) => a.fullName === 'John Doe')).toBe(true);
      }
    });

    it('should create unique division keys', () => {
      const brackets = categorizeAthletes(mockAthletes);
      const divisions = Array.from(brackets.keys());
      const uniqueDivisions = new Set(divisions);

      expect(divisions.length).toBe(uniqueDivisions.size);
    });
  });

  describe('generateBrackets', () => {
    it('should generate brackets with tournament rounds', () => {
      const brackets = generateBrackets(mockAthletes);

      expect(brackets.length).toBeGreaterThan(0);
      brackets.forEach((bracket) => {
        if (bracket.athletes.length > 1) {
          expect(bracket.rounds.length).toBeGreaterThan(0);
        }
      });
    });

    it('should create single-elimination rounds', () => {
      const brackets = generateBrackets(mockAthletes);
      const bracket = brackets[0];

      if (bracket.rounds.length > 0) {
        // First round should have ceil(athletes/2) matches
        const firstRound = bracket.rounds[0];
        expect(firstRound.matches.length).toBeLessThanOrEqual(Math.ceil(bracket.athletes.length / 2));
      }
    });

    it('should generate proper match structure', () => {
      const brackets = generateBrackets(mockAthletes);
      const bracket = brackets[0];

      bracket.rounds.forEach((round) => {
        round.matches.forEach((match) => {
          expect(match.id).toBeDefined();
          expect(match.round).toBe(round.number);
          expect(match.status).toBe('pending');
        });
      });
    });
  });

  describe('getBracketStats', () => {
    it('should calculate correct statistics', () => {
      const brackets = generateBrackets(mockAthletes);
      const stats = getBracketStats(brackets);

      expect(stats.totalBrackets).toBeGreaterThan(0);
      expect(stats.totalAthletes).toBe(4); // Only cleared athletes
      expect(stats.byGender.male).toBeGreaterThan(0);
      expect(stats.byGender.female).toBeGreaterThan(0);
    });

    it('should list all bracket categories', () => {
      const brackets = generateBrackets(mockAthletes);
      const stats = getBracketStats(brackets);

      expect(stats.byCategory.length).toBe(brackets.length);
      stats.byCategory.forEach((cat) => {
        expect(cat.division).toBeDefined();
        expect(cat.count).toBeGreaterThan(0);
      });
    });
  });

  describe('Weight Categories', () => {
    it('should have valid weight category definitions', () => {
      expect(WEIGHT_CATEGORIES.length).toBeGreaterThan(0);

      WEIGHT_CATEGORIES.forEach((category) => {
        expect(category.name).toBeDefined();
        expect(category.minWeight).toBeLessThanOrEqual(category.maxWeight);
      });
    });

    it('should cover all weight ranges', () => {
      const sorted = [...WEIGHT_CATEGORIES].sort((a, b) => a.minWeight - b.minWeight);

      // First category should start at 0 or low value
      expect(sorted[0].minWeight).toBeLessThanOrEqual(40);

      // Last category should handle heavy weights
      expect(sorted[sorted.length - 1].maxWeight).toBeGreaterThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty roster', () => {
      const brackets = generateBrackets([]);
      expect(brackets).toEqual([]);
    });

    it('should handle single athlete', () => {
      const singleAthlete: Athlete[] = [
        {
          registrationNo: 'REG-001',
          fullName: 'Solo',
          gender: 'Male',
          weight: 65,
          height: 175,
          club: 'Dojo',
          status: 'Confirmed',
          medicalClearance: 'Cleared',
        },
      ];

      const brackets = generateBrackets(singleAthlete);
      expect(brackets.length).toBe(1);
      expect(brackets[0].athletes.length).toBe(1);
    });

    it('should handle two athletes in same division', () => {
      const twoAthletes: Athlete[] = [
        {
          registrationNo: 'REG-001',
          fullName: 'Athlete A',
          gender: 'Male',
          weight: 65,
          height: 175,
          club: 'Dojo',
          status: 'Confirmed',
          medicalClearance: 'Cleared',
        },
        {
          registrationNo: 'REG-002',
          fullName: 'Athlete B',
          gender: 'Male',
          weight: 64,
          height: 174,
          club: 'Dojo',
          status: 'Confirmed',
          medicalClearance: 'Cleared',
        },
      ];

      const brackets = generateBrackets(twoAthletes);
      expect(brackets.length).toBe(1);
      expect(brackets[0].rounds[0].matches.length).toBe(1);
      expect(brackets[0].rounds[0].matches[0].athlete1).toBeDefined();
      expect(brackets[0].rounds[0].matches[0].athlete2).toBeDefined();
    });
  });
});
