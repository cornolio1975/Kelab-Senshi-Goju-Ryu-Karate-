'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { db } from '@/db/dbClient';
import { 
  Upload, X, Check, RefreshCw, AlertCircle, FileText, ArrowRight, Home, ChevronLeft 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ParsedRow {
  full_name: string;
  gender: 'Male' | 'Female';
  dob: string;
  weight: number;
  height: number;
  passport_ic: string;
  club_name: string;
  email?: string;
  phone?: string;
  payment_status: 'Paid' | 'Unpaid' | 'Pending';
  medical_status: 'Cleared' | 'Review Needed';
}

export default function PublicRegistrationPage() {
  const [mounted, setMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [importReport, setImportReport] = useState<{
    importedIds: string[];
    duplicates: string[];
    errors: string[];
  } | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview, 3: Success Report
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic basePath resolution
  const [basePath, setBasePath] = useState('');
  const [tournamentName, setTournamentName] = useState('Kelab Senshi Goju-Ryu Open Karate Championship 2026');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const isProd = window.location.hostname.includes('github.io') || window.location.pathname.includes('/Kelab-Senshi-Goju-Ryu-Karate-');
      setBasePath(isProd ? '/Kelab-Senshi-Goju-Ryu-Karate-' : '');
      
      const customName = localStorage.getItem('ts_upcoming_name');
      if (customName !== null) setTournamentName(customName);
    }
  }, []);

  // Raw mock CSV sample to seed pasting - Tab-separated to match user's custom template
  const sampleCSV = "First Name\tLast Name\tGender\tDOB\tWeight / kg\tSize / cm\tPassport/IC\tClub\tEMail\tPhone\tPayment\tMedical\n" +
    "Aainesh\tAainesh\tm\t2012-05-01\t46\t0\t\tSenshi Goju-Ryu\t\t60121523691\tPaid\tCleared\n" +
    "AKILESH\tVAMATHEVAN\tm\t2008-09-06\t86\t0\t\tSenshi Goju-Ryu\t\t6011-3334445\tPaid\tCleared\n" +
    "AKILESH ALAGAN\tVAMATHEVAN\tm\t2008-09-06\t86\t0\t80906101709\tSenshi Goju-Ryu\t\t6018-7776655\tPaid\tCleared";

  const downloadCSVTemplate = () => {
    const link = document.createElement("a");
    link.setAttribute("href", `${basePath}/senshi_karate_registration_template.csv`);
    link.setAttribute("download", "senshi_karate_registration_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSV(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSV(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvContent(e.target.value);
  };

  const handlePasteParse = () => {
    if (!csvContent.trim()) return;
    parseCSV(csvContent);
  };

  // Helper: normalize a name segment - replace underscores with spaces, trim
  const normalizeName = (name: string): string => {
    return name.replace(/_/g, ' ').trim();
  };

  // Helper: build full_name from first and last in Malaysian format
  // If firstName == lastName (same word), just use one
  // Last Name may have bracket suffix like [1], [2] for siblings - strip for display
  const buildFullName = (rawFirst: string, rawLast: string): string => {
    const firstName = normalizeName(rawFirst);
    const lastName = normalizeName(rawLast);
    const lastNameDisplay = lastName.replace(/\s*\[\d+\]$/, '');
    if (!firstName && !lastName) return 'Unknown';
    if (!lastName || firstName.toLowerCase() === lastNameDisplay.toLowerCase()) return firstName || lastName;
    return `${firstName} ${lastNameDisplay}`.trim();
  };

  const splitCSVLine = (line: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n');
      const rows: ParsedRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Support tab-separated and comma-separated layouts
        const separator = line.includes('\t') ? '\t' : ',';
        const cols = splitCSVLine(line, separator);
        if (cols.length < 7) continue;

        let fullName = '';
        let gender: 'Male' | 'Female' = 'Male';
        let dob = '2005-01-01';
        let weight = 0;
        let height = 0;
        let passport_ic = '';
        let club_name = 'Senshi Goju-Ryu';
        let email = '';
        let phone = '';
        let payment_status: 'Paid' | 'Unpaid' | 'Pending' = 'Unpaid';
        let medical_status: 'Cleared' | 'Review Needed' = 'Cleared';

        if (cols.length >= 12) {
          // 12 columns: First Name, Last Name, Gender, DOB, Weight / kg, Size / cm, Passport/IC, Club, EMail, Phone, Payment, Medical
          fullName = buildFullName(cols[0]?.trim() || '', cols[1]?.trim() || '');
          const rawGen = cols[2]?.trim().toLowerCase();
          gender = (rawGen === 'f' || rawGen === 'female') ? 'Female' : 'Male';
          dob = cols[3]?.trim() || '2005-01-01';
          weight = parseFloat(cols[4]?.trim()) || 0;
          height = parseFloat(cols[5]?.trim()) || 0;
          passport_ic = cols[6]?.trim() || '';
          club_name = cols[7]?.trim() || 'Senshi Goju-Ryu';
          email = cols[8]?.trim() || '';
          phone = cols[9]?.trim() || '';
          
          const payStr = cols[10]?.trim().toLowerCase();
          payment_status = payStr === 'paid' ? 'Paid' : payStr === 'pending' ? 'Pending' : 'Unpaid';
          
          const medStr = cols[11]?.trim().toLowerCase();
          medical_status = medStr === 'cleared' ? 'Cleared' : 'Review Needed';
        } else {
          // Comma layout or standard (11 columns: Full Name, Gender, DOB, Weight, Height, Passport/IC, Club, Email, Phone, Payment, Medical)
          fullName = normalizeName(cols[0]?.trim() || '');
          const rawGen = cols[1]?.trim().toLowerCase();
          gender = (rawGen === 'f' || rawGen === 'female') ? 'Female' : 'Male';
          dob = cols[2]?.trim() || '2005-01-01';
          weight = parseFloat(cols[3]?.trim()) || 0;
          height = parseFloat(cols[4]?.trim()) || 0;
          passport_ic = cols[5]?.trim() || '';
          club_name = cols[6]?.trim() || 'Senshi Goju-Ryu';
          email = cols[7]?.trim() || '';
          phone = cols[8]?.trim() || '';
          
          const payStr = cols[9]?.trim().toLowerCase();
          payment_status = payStr === 'paid' ? 'Paid' : payStr === 'pending' ? 'Pending' : 'Unpaid';
          
          const medStr = cols[10]?.trim().toLowerCase();
          medical_status = medStr === 'cleared' ? 'Cleared' : 'Review Needed';
        }

        if (!fullName) continue;

        rows.push({
          full_name: fullName,
          gender,
          dob,
          weight,
          height,
          passport_ic,
          club_name,
          email,
          phone,
          payment_status,
          medical_status
        });
      }

      if (rows.length === 0) {
        alert("No valid rows parsed from CSV. Make sure you match the template columns.");
        return;
      }

      setPreviewRows(rows);
      setStep(2);
    } catch (e: any) {
      alert("Error parsing CSV: " + e.message);
    }
  };


  const handleImport = async () => {
    setIsProcessing(true);
    const importedIds: string[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];

    try {
      const activeParticipants = await db.participants.list();
      const clubs = await db.clubs.list();

      for (const row of previewRows) {
        // Only match IC when both sides are non-empty (empty IC must not cross-match)
        const icMatch = row.passport_ic
          ? activeParticipants.some(p => p.passport_ic && p.passport_ic.toLowerCase() === row.passport_ic.toLowerCase())
          : false;
        // Only match name as duplicate when IC also confirms it, or both IC are present and match
        const nameMatch = activeParticipants.some(p =>
          p.full_name.toLowerCase() === row.full_name.toLowerCase() &&
          (!row.passport_ic || p.passport_ic.toLowerCase() === row.passport_ic.toLowerCase())
        );
        const isDuplicate = icMatch || nameMatch;

        if (isDuplicate) {
          duplicates.push(row.full_name);
          continue;
        }

        let clubId = clubs.find(c => c.name.toLowerCase() === row.club_name.toLowerCase())?.id;
        if (!clubId) {
          const newClub = await db.clubs.add({ name: row.club_name, city: 'Unknown' });
          clubId = newClub.id;
        }

        const newPart = await db.participants.add({
          full_name: row.full_name,
          gender: row.gender,
          dob: row.dob,
          weight: row.weight,
          height: row.height,
          passport_ic: row.passport_ic || '',
          club_id: clubId,
          email: row.email,
          phone: row.phone,
          status: 'Pending',
          payment_status: row.payment_status,
          medical_status: row.medical_status === 'Cleared' ? 'Cleared' : 'Review Needed',
          remarks: row.passport_ic ? 'Public CSV Registered' : 'Public CSV Registered — IC/Passport pending update'
        });
        
        importedIds.push(newPart.id);
      }

      setImportReport({
        importedIds,
        duplicates,
        errors
      });

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 }
      });

      setStep(3);
    } catch (e: any) {
      alert(`Registration submission failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCsvContent('');
    setPreviewRows([]);
    setImportReport(null);
    setStep(1);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#070b15] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden p-6 relative">
      
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.12),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[35%] h-[35%] bg-indigo-900/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Floating Buttons */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between relative z-10">
        <Link
          href="/public/tournaments"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-white/10 hover:border-white/20 hover:bg-slate-900 text-xs font-bold text-slate-300 hover:text-white rounded-lg transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Tournaments</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-white/10 hover:border-white/20 hover:bg-slate-900 text-xs font-bold text-slate-300 hover:text-white rounded-lg transition"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Home</span>
        </Link>
      </div>

      <main className="max-w-4xl mx-auto bg-slate-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 space-y-8 relative z-10 shadow-xl">
        
        {/* Title */}
        <div className="text-center md:text-left space-y-1.5 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-white/10 bg-slate-900 shrink-0">
              <img src={`${basePath}/logo.jpg`} alt="Kelab Senshi Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Tournament Registration Portal</h1>
              <p className="text-xs text-slate-400 font-medium">{tournamentName}</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        {step === 1 && (
          <div className="space-y-6">
            
            {/* Step 1: Download Template */}
            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-left w-full">
                <span className="font-bold text-sm text-indigo-300 block">1. Download CSV Template File</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Prepare your participant list offline using our standard spreadsheet template columns. Ensure Name, Gender, DOB, Weight, Height, IC/Passport, and Dojo name are filled.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadCSVTemplate}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-2 shrink-0 cursor-pointer shadow-md uppercase tracking-wider"
              >
                <FileText className="h-4 w-4" />
                <span>Download Template</span>
              </button>
            </div>

            {/* Step 2: Upload Dropzone */}
            <div className="space-y-3">
              <span className="font-bold text-xs text-slate-400 uppercase tracking-widest block">2. Upload Your Dojo Spreadsheet</span>
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 bg-slate-950/20'
                }`}
              >
                <input 
                  type="file" 
                  id="csv-file-upload-public" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <label htmlFor="csv-file-upload-public" className="w-full h-full cursor-pointer flex flex-col items-center">
                  <Upload className="h-12 w-12 text-slate-500 mb-4" />
                  <span className="font-bold text-sm text-slate-200 mb-1 block">Drag and drop completed CSV here</span>
                  <span className="text-xs text-slate-500 mb-4">or click to browse from your device</span>
                  <span className="text-[10px] uppercase font-black text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 tracking-wider">
                    CSV Format Only
                  </span>
                </label>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black uppercase text-slate-600 tracking-widest">Or Paste raw data</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* Paste Data Text Area */}
            <div className="space-y-3">
              <span className="font-bold text-xs text-slate-400 uppercase tracking-widest block">Paste Comma-Separated Values</span>
              <textarea
                placeholder={sampleCSV}
                value={csvContent}
                onChange={handlePasteChange}
                className="w-full h-40 p-4 bg-slate-950/40 border border-white/10 hover:border-white/25 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder:text-slate-700 transition"
              />
              <div className="flex justify-between items-center">
                <button 
                  type="button"
                  onClick={() => setCsvContent(sampleCSV)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Insert template preview data
                </button>
                <button
                  type="button"
                  onClick={handlePasteParse}
                  disabled={!csvContent.trim()}
                  className="px-5 py-2 bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  Parse & Review <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Step 2: Verification Preview */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Parsed <strong>{previewRows.length}</strong> registration entries successfully. Please verify columns and details before submitting registration.
                </span>
              </div>
            </div>

            {/* Dojo Grouping Preview */}
            <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900/60 border-b border-white/10">
                    <tr>
                      <th className="p-3.5 font-bold uppercase text-slate-400 tracking-wider">Full Name</th>
                      <th className="p-3.5 font-bold uppercase text-slate-400 tracking-wider">Gender</th>
                      <th className="p-3.5 font-bold uppercase text-slate-400 tracking-wider">DOB</th>
                      <th className="p-3.5 font-bold uppercase text-slate-400 tracking-wider">Weight</th>
                      <th className="p-3.5 font-bold uppercase text-slate-400 tracking-wider">Height</th>
                      <th className="p-3.5 font-bold uppercase text-slate-400 tracking-wider">IC / Passport</th>
                      <th className="p-3.5 font-bold uppercase text-slate-400 tracking-wider">Dojo (Club)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/2">
                        <td className="p-3.5 font-bold text-white">{row.full_name}</td>
                        <td className="p-3.5 text-slate-300">{row.gender}</td>
                        <td className="p-3.5 font-mono text-slate-400">{row.dob}</td>
                        <td className="p-3.5 font-mono text-slate-400">{row.weight} kg</td>
                        <td className="p-3.5 font-mono text-slate-400">{row.height} cm</td>
                        <td className="p-3.5 font-mono text-slate-400">{row.passport_ic}</td>
                        <td className="p-3.5 text-indigo-300 font-semibold">{row.club_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={handleReset} 
                className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer uppercase tracking-wider"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isProcessing}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer disabled:opacity-40 uppercase tracking-widest"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Submit Registration
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Report */}
        {step === 3 && importReport && (
          <div className="space-y-6">
            
            {/* Success Hero */}
            <div className="flex flex-col items-center justify-center text-center p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="h-14 w-14 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <Check className="h-7 w-7" />
              </div>
              <h4 className="font-extrabold text-lg text-white mb-2 uppercase tracking-wide">Registration Submitted Successfully!</h4>
              <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                Thank you! Your participants have been registered in our database under their respective Dojos. Bracket assignments and matching are calculated automatically.
              </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/20 border border-white/5 p-5 rounded-xl text-center">
                <span className="text-xs text-slate-400 block uppercase tracking-wider">Participants Registered</span>
                <span className="text-3xl font-black text-emerald-400 block mt-2">{importReport.importedIds.length}</span>
              </div>
              <div className="bg-slate-950/20 border border-white/5 p-5 rounded-xl text-center">
                <span className="text-xs text-slate-400 block uppercase tracking-wider">Duplicates / Skipped</span>
                <span className="text-3xl font-black text-slate-400 block mt-2">{importReport.duplicates.length}</span>
              </div>
            </div>

            {/* Duplicate Notice */}
            {importReport.duplicates.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-400 block uppercase tracking-wider">Skipped duplicates (already registered)</span>
                <ul className="text-xs space-y-1 text-slate-400">
                  {importReport.duplicates.map((dup, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      <span>{dup}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button 
                type="button"
                onClick={handleReset} 
                className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer uppercase tracking-wider"
              >
                Register More
              </button>
              <Link
                href="/public/tournaments"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold transition cursor-pointer uppercase tracking-wider"
              >
                Go to Tournaments
              </Link>
            </div>

          </div>
        )}

      </main>

      {/* Public Footer */}
      <footer className="max-w-4xl mx-auto py-12 text-center text-xs text-slate-500 relative z-10 border-t border-white/5 mt-12 space-y-1">
        <span className="font-bold text-slate-400 block mb-1">© 2026 KarateTech</span>
        <div className="text-slate-450">Developed by <span className="font-semibold text-slate-350">SP Sport Data Solution</span></div>
        <div className="text-[11px] text-slate-500">Professional Karate Tournament Management System</div>
        <div className="text-[11px] text-slate-550">All Rights Reserved.</div>
      </footer>

    </div>
  );
}
