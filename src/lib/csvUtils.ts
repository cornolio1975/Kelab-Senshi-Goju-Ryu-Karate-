import { Athlete } from './bracketGenerator';

/**
 * Parse CSV content into Athlete array
 */
export function parseCSV(csvContent: string): Athlete[] {
  const lines = csvContent.trim().split('\n');

  const athletes: Athlete[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle quoted fields in CSV
    const values = parseCSVLine(line);

    const athlete: Athlete = {
      registrationNo: values[0]?.trim() || '',
      fullName: values[1]?.trim() || '',
      gender: (values[2]?.trim() as 'Male' | 'Female') || 'Male',
      weight: parseFloat(values[3]) || 0,
      height: parseInt(values[4]) || 0,
      club: values[5]?.trim() || '',
      status: values[6]?.trim() || '',
      medicalClearance: values[7]?.trim() || '',
    };

    if (athlete.registrationNo) {
      athletes.push(athlete);
    }
  }

  return athletes;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Convert athletes to CSV format
 */
export function athletesToCSV(athletes: Athlete[]): string {
  const headers = [
    'Registration No',
    'Full Name',
    'Gender',
    'Weight (kg)',
    'Height (cm)',
    'Club',
    'Status',
    'Medical Clearance',
  ];

  const rows = athletes.map((athlete) => [
    athlete.registrationNo,
    `"${athlete.fullName}"`,
    athlete.gender,
    athlete.weight,
    athlete.height,
    `"${athlete.club}"`,
    athlete.status,
    athlete.medicalClearance,
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

/**
 * Export bracket results to CSV
 */
export function exportBracketResults(bracketName: string, athletes: Athlete[]): string {
  const clearedAthletes = athletes.filter((a) => a.medicalClearance === 'Cleared');

  const header = `Tournament Division: ${bracketName}\nTotal Participants: ${clearedAthletes.length}\n\n`;
  const csv = athletesToCSV(clearedAthletes);

  return header + csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(filename: string, content: string) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
