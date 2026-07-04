import { describe, it, expect } from 'vitest';
import { parseCSV, athletesToCSV, exportBracketResults } from './csvUtils';
import { Athlete } from './bracketGenerator';

const mockAthletes: Athlete[] = [
  {
    registrationNo: 'REG-2026-001',
    fullName: 'Ahmad Daniel',
    gender: 'Male',
    weight: 64.5,
    height: 172,
    club: 'Senshi Karate Academy',
    status: 'Confirmed',
    medicalClearance: 'Cleared',
  },
  {
    registrationNo: 'REG-2026-002',
    fullName: 'Chloe Tan',
    gender: 'Female',
    weight: 52,
    height: 161,
    club: 'Goju-Ryu Karate Club',
    status: 'Confirmed',
    medicalClearance: 'Cleared',
  },
];

const sampleCSV = `Registration No,Full Name,Gender,Weight (kg),Height (cm),Club,Status,Medical Clearance
REG-2026-001,"Ahmad Daniel",Male,64.5,172,"Senshi Karate Academy",Confirmed,Cleared
REG-2026-002,"Chloe Tan",Female,52,161,"Goju-Ryu Karate Club",Confirmed,Cleared`;

describe('CSV Utils', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const athletes = parseCSV(sampleCSV);
      expect(athletes.length).toBe(2);
    });

    it('should correctly parse athlete properties', () => {
      const athletes = parseCSV(sampleCSV);
      const first = athletes[0];

      expect(first.registrationNo).toBe('REG-2026-001');
      expect(first.fullName).toBe('Ahmad Daniel');
      expect(first.gender).toBe('Male');
      expect(first.weight).toBe(64.5);
      expect(first.height).toBe(172);
      expect(first.club).toBe('Senshi Karate Academy');
      expect(first.status).toBe('Confirmed');
      expect(first.medicalClearance).toBe('Cleared');
    });

    it('should handle quoted fields', () => {
      const athletes = parseCSV(sampleCSV);
      const second = athletes[1];

      expect(second.fullName).toBe('Chloe Tan');
      expect(second.club).toBe('Goju-Ryu Karate Club');
    });

    it('should skip empty lines', () => {
      const csvWithEmptyLines = `Registration No,Full Name,Gender,Weight (kg),Height (cm),Club,Status,Medical Clearance
REG-2026-001,"Ahmad Daniel",Male,64.5,172,"Senshi Karate Academy",Confirmed,Cleared

REG-2026-002,"Chloe Tan",Female,52,161,"Goju-Ryu Karate Club",Confirmed,Cleared`;

      const athletes = parseCSV(csvWithEmptyLines);
      expect(athletes.length).toBe(2);
    });

    it('should handle empty CSV', () => {
      const athletes = parseCSV('');
      expect(athletes.length).toBe(0);
    });

    it('should handle CSV with only headers', () => {
      const athletes = parseCSV('Registration No,Full Name,Gender,Weight (kg),Height (cm),Club,Status,Medical Clearance');
      expect(athletes.length).toBe(0);
    });
  });

  describe('athletesToCSV', () => {
    it('should convert athletes to CSV format', () => {
      const csv = athletesToCSV(mockAthletes);
      expect(csv).toBeDefined();
      expect(csv.length).toBeGreaterThan(0);
    });

    it('should include headers', () => {
      const csv = athletesToCSV(mockAthletes);
      expect(csv).toContain('Registration No');
      expect(csv).toContain('Full Name');
      expect(csv).toContain('Gender');
      expect(csv).toContain('Weight (kg)');
    });

    it('should include all athletes', () => {
      const csv = athletesToCSV(mockAthletes);
      expect(csv).toContain('Ahmad Daniel');
      expect(csv).toContain('Chloe Tan');
    });

    it('should quote names and clubs', () => {
      const csv = athletesToCSV(mockAthletes);
      expect(csv).toContain('"Ahmad Daniel"');
      expect(csv).toContain('"Senshi Karate Academy"');
    });

    it('should handle empty array', () => {
      const csv = athletesToCSV([]);
      expect(csv).toContain('Registration No');
    });
  });

  describe('exportBracketResults', () => {
    it('should include bracket name', () => {
      const result = exportBracketResults('Male-U-65kg', mockAthletes);
      expect(result).toContain('Male-U-65kg');
    });

    it('should include participant count', () => {
      const result = exportBracketResults('Male-U-65kg', mockAthletes);
      expect(result).toContain('Total Participants');
    });

    it('should only export cleared athletes', () => {
      const mixedAthletes: Athlete[] = [
        ...mockAthletes,
        {
          registrationNo: 'REG-2026-003',
          fullName: 'Test Athlete',
          gender: 'Male',
          weight: 70,
          height: 175,
          club: 'Test Club',
          status: 'Confirmed',
          medicalClearance: 'Review Needed',
        },
      ];

      const result = exportBracketResults('Test', mixedAthletes);
      expect(result).not.toContain('Test Athlete');
      expect(result).toContain('Total Participants: 2');
    });

    it('should include CSV data', () => {
      const result = exportBracketResults('Male-U-65kg', mockAthletes);
      expect(result).toContain('Ahmad Daniel');
      expect(result).toContain('Chloe Tan');
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain data integrity through parse and convert', () => {
      const original = mockAthletes;
      const csv = athletesToCSV(original);
      const parsed = parseCSV(csv);

      expect(parsed.length).toBe(original.length);
      parsed.forEach((athlete, index) => {
        expect(athlete.registrationNo).toBe(original[index].registrationNo);
        expect(athlete.fullName).toBe(original[index].fullName);
        expect(athlete.weight).toBe(original[index].weight);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in names', () => {
      const specialAthletes: Athlete[] = [
        {
          registrationNo: 'REG-001',
          fullName: "O'Brien-Smith, José María",
          gender: 'Male',
          weight: 70,
          height: 175,
          club: 'Dojo "Elite"',
          status: 'Confirmed',
          medicalClearance: 'Cleared',
        },
      ];

      const csv = athletesToCSV(specialAthletes);
      expect(csv).toContain('José María');
    });

    it('should handle decimal weights', () => {
      const athletes: Athlete[] = [
        {
          registrationNo: 'REG-001',
          fullName: 'Test',
          gender: 'Male',
          weight: 64.75,
          height: 172,
          club: 'Dojo',
          status: 'Confirmed',
          medicalClearance: 'Cleared',
        },
      ];

      const csv = athletesToCSV(athletes);
      expect(csv).toContain('64.75');
    });

    it('should handle zero or missing values gracefully', () => {
      const csv = parseCSV(`Registration No,Full Name,Gender,Weight (kg),Height (cm),Club,Status,Medical Clearance
,Name,Male,0,0,Club,Status,Cleared`);

      expect(csv.length).toBe(0); // Should skip due to empty registrationNo
    });
  });
});
