# Bracket System Documentation

## Overview

The Bracket System is a TypeScript-based tournament management module for the Kelab Senshi Goju-Ryu Karate tournament application. It automatically generates competition brackets based on athlete data from CSV exports.

## Features

- **Automatic Categorization**: Organizes athletes by gender and weight class
- **Medical Clearance Filtering**: Only includes athletes with cleared medical status
- **Single-Elimination Rounds**: Generates tournament brackets with multiple rounds
- **CSV Import/Export**: Parse roster data from CSV files and export results
- **Statistics Generation**: Provides tournament statistics and insights
- **TypeScript Support**: Fully typed for better development experience

## Architecture

### Core Components

#### `bracketGenerator.ts`
Core logic for bracket generation and tournament structure.

**Key Functions:**
- `categorizeAthletes(athletes: Athlete[])`: Groups athletes into weight-based brackets
- `generateBrackets(athletes: Athlete[])`: Creates complete tournament brackets
- `getBracketStats(brackets: Bracket[])`: Calculates tournament statistics

**Key Types:**
- `Athlete`: Represents a karate competitor
- `Bracket`: Tournament division with participants and rounds
- `Match`: Individual match between two athletes
- `Round`: Collection of matches in a tournament round

#### `sampleRoster.ts`
Contains sample data from the karate roster CSV export for development and testing.

#### `csvUtils.ts`
Utilities for importing and exporting tournament data.

**Key Functions:**
- `parseCSV(csvContent: string)`: Convert CSV string to Athlete array
- `athletesToCSV(athletes: Athlete[])`: Convert athletes to CSV format
- `exportBracketResults(bracketName: string, athletes: Athlete[])`: Export bracket results
- `downloadCSV(filename: string, content: string)`: Trigger browser download

### UI Components

#### `src/app/brackets/page.tsx`
React component for displaying and managing tournament brackets.

**Features:**
- Generate brackets from roster data
- Display bracket statistics
- Expandable division details
- Participant listings with club affiliation
- Tournament round visualization

## Weight Categories

The system uses the following standard karate weight categories:

| Category | Range |
|----------|-------|
| U-50kg   | Up to 50 kg |
| U-55kg   | 50.1 - 55 kg |
| U-60kg   | 55.1 - 60 kg |
| U-65kg   | 60.1 - 65 kg |
| U-70kg   | 65.1 - 70 kg |
| U-75kg   | 70.1 - 75 kg |
| U-80kg   | 75.1 - 80 kg |
| U-85kg   | 80.1 - 85 kg |
| +85kg    | 85.1 kg and above |

## Usage

### Basic Example

```typescript
import { generateBrackets, getBracketStats } from '@/lib/bracketGenerator';
import { SAMPLE_ROSTER } from '@/lib/sampleRoster';

// Generate brackets from roster
const brackets = generateBrackets(SAMPLE_ROSTER);

// Get tournament statistics
const stats = getBracketStats(brackets);

console.log(`Total brackets: ${stats.totalBrackets}`);
console.log(`Total athletes: ${stats.totalAthletes}`);
console.log(`Male divisions: ${stats.byGender.male}`);
console.log(`Female divisions: ${stats.byGender.female}`);
```

### Importing CSV Data

```typescript
import { parseCSV } from '@/lib/csvUtils';

const csvContent = `Registration No,Full Name,Gender,Weight (kg),Height (cm),Club,Status,Medical Clearance
REG-2026-001,"Ahmad Daniel",Male,64.5,172,"Senshi Karate Academy",Confirmed,Cleared`;

const athletes = parseCSV(csvContent);
```

### Exporting Results

```typescript
import { exportBracketResults, downloadCSV } from '@/lib/csvUtils';

const csv = exportBracketResults('Male-U-65kg', bracketAthletes);
downloadCSV('Male-U65kg-bracket.csv', csv);
```

## Data Flow

```
CSV Import
    ↓
parseCSV() → Athlete[]
    ↓
generateBrackets() → Bracket[]
    ↓
BracketSystemPage (React)
    ↓
Display & Interact with Tournaments
    ↓
exportBracketResults() → CSV Export
```

## Medical Clearance

Only athletes with `medicalClearance: 'Cleared'` status are included in brackets:

- **Cleared**: Eligible to compete
- **Review Needed**: Awaiting medical review (excluded)
- **Action Required**: Requires medical action (excluded)

## Testing

The bracket system includes comprehensive unit tests:

```bash
npm run test
```

### Test Files

- `src/lib/__tests__/bracketGenerator.test.ts`: Core bracket generation logic
- `src/lib/__tests__/csvUtils.test.ts`: CSV import/export functionality

### Test Coverage

- ✅ Athlete categorization by gender and weight
- ✅ Medical clearance filtering
- ✅ Bracket generation and round creation
- ✅ CSV parsing and conversion
- ✅ Statistics calculation
- ✅ Edge cases (empty rosters, single athletes, etc.)

## Sample Data

The `SAMPLE_ROSTER` includes 56 karate athletes with:
- Complete personal information
- Weight and height measurements
- Club affiliation
- Medical clearance status
- Registration numbers

**Clubs represented:**
- Senshi Karate Academy
- Goju-Ryu Karate Club
- Tiger Claw Dojo
- Budokan Singapore
- Kyokushin Jakarta

## API Reference

### Athlete Interface

```typescript
interface Athlete {
  registrationNo: string;
  fullName: string;
  gender: 'Male' | 'Female';
  weight: number; // kg
  height: number; // cm
  club: string;
  status: string; // e.g., "Confirmed"
  medicalClearance: string; // "Cleared", "Review Needed", "Action Required"
}
```

### Bracket Interface

```typescript
interface Bracket {
  id: string;
  division: string; // e.g., "Male U-60kg"
  gender: string;
  weightCategory: WeightCategory;
  athletes: Athlete[];
  rounds: Round[];
  winner?: Athlete;
}
```

### Match Interface

```typescript
interface Match {
  id: string;
  round: number;
  athlete1?: Athlete;
  athlete2?: Athlete;
  winner?: Athlete;
  status: 'pending' | 'in-progress' | 'completed';
}
```

## Future Enhancements

Potential improvements for future versions:

1. **Match Recording**: Track match results and winner progression
2. **Seeding System**: Implement ranking-based seeding
3. **Draw Management**: Manual bracket adjustments
4. **Real-time Updates**: Live tournament updates
5. **Reporting**: Comprehensive tournament reports
6. **Database Integration**: Persist bracket data
7. **Admin Dashboard**: Tournament management UI
8. **Notifications**: Email/SMS athlete notifications

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:3000/brackets
```

### Running Tests

```bash
npm run test
```

### Building

```bash
npm run build
```

## File Structure

```
src/
├── lib/
│   ├── bracketGenerator.ts          # Core bracket logic
│   ├── sampleRoster.ts              # Sample data
│   ├── csvUtils.ts                  # CSV utilities
│   └── __tests__/
│       ├── bracketGenerator.test.ts  # Bracket tests
│       └── csvUtils.test.ts          # CSV tests
└── app/
    └── brackets/
        └── page.tsx                 # UI component
```

## Contributing

When contributing to the bracket system:

1. Maintain type safety with TypeScript
2. Add tests for new features
3. Update documentation
4. Follow existing code style
5. Test with sample data

## License

Part of the Kelab Senshi Goju-Ryu Karate tournament management system.
