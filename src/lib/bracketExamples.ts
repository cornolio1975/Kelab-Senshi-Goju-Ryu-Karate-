/**
 * Bracket System Integration Examples
 * Demonstrates how to use the bracket system in various scenarios
 */

import { generateBrackets, getBracketStats, Bracket } from '@/lib/bracketGenerator';
import { parseCSV, exportBracketResults } from '@/lib/csvUtils';
import { SAMPLE_ROSTER } from '@/lib/sampleRoster';
import { BRACKET_CONFIG } from '@/lib/bracketConfig';
import { Athlete } from '@/lib/bracketGenerator';

/**
 * Example 1: Basic Bracket Generation
 * Generate brackets from the sample roster
 */
export function example1_BasicGeneration() {
  console.log('=== Example 1: Basic Bracket Generation ===');

  // Generate brackets from sample roster
  const brackets = generateBrackets(SAMPLE_ROSTER);

  // Get statistics
  const stats = getBracketStats(brackets);

  console.log(`Tournament: ${BRACKET_CONFIG.tournament.name}`);
  console.log(`Total Brackets: ${stats.totalBrackets}`);
  console.log(`Total Athletes: ${stats.totalAthletes}`);
  console.log(`Male Athletes: ${stats.byGender.male}`);
  console.log(`Female Athletes: ${stats.byGender.female}`);

  // Display each bracket
  brackets.forEach((bracket) => {
    console.log(`\nBracket: ${bracket.division}`);
    console.log(`Athletes: ${bracket.athletes.length}`);
    console.log(`Rounds: ${bracket.rounds.length}`);
  });

  return brackets;
}

/**
 * Example 2: Custom CSV Import
 * Load athletes from a custom CSV file
 */
export function example2_CustomCSVImport(csvContent: string) {
  console.log('=== Example 2: Custom CSV Import ===');

  // Parse CSV content
  const athletes = parseCSV(csvContent);
  console.log(`Imported ${athletes.length} athletes`);

  // Generate brackets from imported data
  const brackets = generateBrackets(athletes);
  console.log(`Generated ${brackets.length} brackets`);

  return { athletes, brackets };
}

/**
 * Example 3: Filter Athletes by Criteria
 * Generate brackets for specific criteria
 */
export function example3_FilterByCriteria(criteria: {
  gender?: 'Male' | 'Female';
  club?: string;
  minWeight?: number;
  maxWeight?: number;
}) {
  console.log('=== Example 3: Filter Athletes by Criteria ===');

  let filtered = SAMPLE_ROSTER;

  // Apply filters
  if (criteria.gender) {
    filtered = filtered.filter((a) => a.gender === criteria.gender);
    console.log(`Filtered by gender: ${criteria.gender} → ${filtered.length} athletes`);
  }

  if (criteria.club) {
    filtered = filtered.filter((a) => a.club === criteria.club);
    console.log(`Filtered by club: ${criteria.club} → ${filtered.length} athletes`);
  }

  if (criteria.minWeight !== undefined) {
    filtered = filtered.filter((a) => a.weight >= criteria.minWeight!);
    console.log(`Filtered by min weight: ${criteria.minWeight}kg → ${filtered.length} athletes`);
  }

  if (criteria.maxWeight !== undefined) {
    filtered = filtered.filter((a) => a.weight <= criteria.maxWeight!);
    console.log(`Filtered by max weight: ${criteria.maxWeight}kg → ${filtered.length} athletes`);
  }

  // Generate brackets for filtered athletes
  const brackets = generateBrackets(filtered);
  console.log(`Generated ${brackets.length} brackets from filtered athletes`);

  return { filteredAthletes: filtered, brackets };
}

/**
 * Example 4: Export Bracket Results
 * Export bracket data in various formats
 */
export function example4_ExportResults(brackets: Bracket[]) {
  console.log('=== Example 4: Export Bracket Results ===');

  const exports: Record<string, string> = {};

  // Export each bracket
  brackets.forEach((bracket) => {
    const csv = exportBracketResults(bracket.division, bracket.athletes);
    exports[bracket.division] = csv;

    console.log(`Exported ${bracket.division}`);
  });

  return exports;
}

/**
 * Example 5: Tournament Statistics Analysis
 * Analyze and display detailed tournament statistics
 */
export function example5_StatisticsAnalysis(brackets: Bracket[]) {
  console.log('=== Example 5: Tournament Statistics Analysis ===');

  const stats = getBracketStats(brackets);

  // Overall Statistics
  console.log('\n--- Overall Statistics ---');
  console.log(`Tournament: ${BRACKET_CONFIG.tournament.name}`);
  console.log(`Total Brackets: ${stats.totalBrackets}`);
  console.log(`Total Athletes: ${stats.totalAthletes}`);

  // Gender Distribution
  console.log('\n--- Gender Distribution ---');
  console.log(`Male: ${stats.byGender.male} (${((stats.byGender.male / stats.totalAthletes) * 100).toFixed(1)}%)`);
  console.log(`Female: ${stats.byGender.female} (${((stats.byGender.female / stats.totalAthletes) * 100).toFixed(1)}%)`);

  // Bracket Distribution
  console.log('\n--- Bracket Distribution ---');
  stats.byCategory.forEach((cat) => {
    const percentage = ((cat.count / stats.totalAthletes) * 100).toFixed(1);
    console.log(`${cat.division}: ${cat.count} athletes (${percentage}%)`);
  });

  return stats;
}

/**
 * Example 6: Club Distribution Analysis
 * Analyze athlete distribution by club
 */
export function example6_ClubAnalysis(athletes: Athlete[] = SAMPLE_ROSTER) {
  console.log('=== Example 6: Club Analysis ===');

  const clubStats: Record<string, number> = {};

  athletes.forEach((athlete) => {
    clubStats[athlete.club] = (clubStats[athlete.club] || 0) + 1;
  });

  console.log('\nClub Distribution:');
  Object.entries(clubStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([club, count]) => {
      const percentage = ((count / athletes.length) * 100).toFixed(1);
      console.log(`${club}: ${count} athletes (${percentage}%)`);
    });

  return clubStats;
}

/**
 * Example 7: Match Simulation
 * Simulate tournament progression with random match results
 */
export function example7_MatchSimulation(brackets: Bracket[]) {
  console.log('=== Example 7: Match Simulation ===');

  const results: Record<string, string> = {};

  brackets.forEach((bracket) => {
    const winners: Athlete[] = [];

    // Simulate each round
    bracket.rounds.forEach((round, roundIndex) => {
      console.log(`\n${bracket.division} - Round ${round.number}:`);

      round.matches.forEach((match) => {
        if (match.athlete1 && match.athlete2) {
          // Random winner
          const winner = Math.random() > 0.5 ? match.athlete1 : match.athlete2;
          console.log(`  ${match.athlete1.fullName} vs ${match.athlete2.fullName} → Winner: ${winner.fullName}`);

          if (roundIndex === bracket.rounds.length - 1) {
            winners.push(winner);
          }
        }
      });
    });

    if (winners.length > 0) {
      results[bracket.division] = winners[0].fullName;
      console.log(`\n${bracket.division} Champion: ${winners[0].fullName}`);
    }
  });

  return results;
}

/**
 * Example 8: Weight Category Analysis
 * Analyze athlete distribution across weight categories
 */
export function example8_WeightCategoryAnalysis(athletes: Athlete[] = SAMPLE_ROSTER) {
  console.log('=== Example 8: Weight Category Analysis ---');

  const weightStats: Record<string, Athlete[]> = {};

  // Group by approximate weight category
  athletes.forEach((athlete) => {
    let category = '+85kg';

    if (athlete.weight <= 50) category = 'U-50kg';
    else if (athlete.weight <= 55) category = 'U-55kg';
    else if (athlete.weight <= 60) category = 'U-60kg';
    else if (athlete.weight <= 65) category = 'U-65kg';
    else if (athlete.weight <= 70) category = 'U-70kg';
    else if (athlete.weight <= 75) category = 'U-75kg';
    else if (athlete.weight <= 80) category = 'U-80kg';
    else if (athlete.weight <= 85) category = 'U-85kg';

    if (!weightStats[category]) {
      weightStats[category] = [];
    }
    weightStats[category].push(athlete);
  });

  console.log('\nWeight Category Distribution:');
  Object.entries(weightStats)
    .sort()
    .forEach(([category, athletes]) => {
      console.log(`${category}: ${athletes.length} athletes`);
      athletes.forEach((a) => {
        console.log(`  - ${a.fullName} (${a.weight}kg, ${a.gender})`);
      });
    });

  return weightStats;
}

/**
 * Example 9: Medical Clearance Status
 * Analyze medical clearance distribution
 */
export function example9_MedicalClearanceAnalysis(athletes: Athlete[] = SAMPLE_ROSTER) {
  console.log('=== Example 9: Medical Clearance Analysis ===');

  const clearanceStats: Record<string, number> = {};

  athletes.forEach((athlete) => {
    const status = athlete.medicalClearance || 'Unknown';
    clearanceStats[status] = (clearanceStats[status] || 0) + 1;
  });

  console.log('\nMedical Clearance Status:');
  Object.entries(clearanceStats).forEach(([status, count]) => {
    const percentage = ((count / athletes.length) * 100).toFixed(1);
    console.log(`${status}: ${count} athletes (${percentage}%)`);
  });

  return clearanceStats;
}

/**
 * Example 10: Generate Tournament Report
 * Generate comprehensive tournament report
 */
export function example10_GenerateTournamentReport(brackets: Bracket[]) {
  console.log('=== Example 10: Generate Tournament Report ===');

  const stats = getBracketStats(brackets);
  const timestamp = new Date().toISOString();

  const report = {
    timestamp,
    tournament: BRACKET_CONFIG.tournament,
    statistics: stats,
    brackets: brackets.map((b) => ({
      division: b.division,
      athleteCount: b.athletes.length,
      roundCount: b.rounds.length,
      athletes: b.athletes.map((a) => ({
        name: a.fullName,
        club: a.club,
        weight: a.weight,
      })),
    })),
  };

  console.log('\nTournament Report Generated:');
  console.log(JSON.stringify(report, null, 2));

  return report;
}

/**
 * Main Runner - Execute all examples
 */
export function runAllExamples() {
  console.log('╔════════════════════════════════��═══════════════════════════╗');
  console.log('║     Bracket System Integration Examples                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Example 1
    const brackets = example1_BasicGeneration();

    // Example 3
    example3_FilterByCriteria({ gender: 'Male' });
    example3_FilterByCriteria({ club: 'Senshi Karate Academy' });

    // Example 5
    example5_StatisticsAnalysis(brackets);

    // Example 6
    example6_ClubAnalysis();

    // Example 8
    example8_WeightCategoryAnalysis();

    // Example 9
    example9_MedicalClearanceAnalysis();

    // Example 10
    example10_GenerateTournamentReport(brackets);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     All Examples Completed Successfully                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}
