'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Upload, X, Check, RefreshCw, AlertCircle, FileText, ArrowRight } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { triggerRefresh } = useTournament();
  const [dragActive, setDragActive] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [importReport, setImportReport] = useState<{
    importedIds: string[];
    duplicates: string[];
    errors: string[];
  } | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview & Map, 3: Success Report
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Raw mock CSV sample to seed pasting - Tab-separated to match user's custom template
  const sampleCSV = "Full\tName\tGender\tDOB\tWeight\tHeight\tPassport/IC\tClub\tEmail\tPhone\tPayment\tMedical\n" +
    "Rayyan\tIskandar\tMale\t2006-11-20\t68\t175\t061120-10-2222\tSenshi Karate Academy\trayyan@example.com\t60121523691\tPaid\tCleared\n" +
    "Sophia\tLee\tFemale\t2005-02-14\t53.5\t163\t050214-14-9999\tGoju-Ryu Karate Club\tsophia@example.com\t6011-3334445\tPending\tReview\n" +
    "Hao\tXuan\tMale\t2003-05-10\t72.3\t180\t030510-02-1234\tTiger Claw Dojo\thaoxuan@example.com\t6018-7776655\tUnpaid\tNeeded";

  const downloadCSVTemplate = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
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

  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n');
      const rows: ParsedRow[] = [];
      
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Support tab-separated and comma-separated layouts
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        if (cols.length < 7) continue;

        let fullName = '';
        let gender: 'Male' | 'Female' = 'Male';
        let dob = '2005-01-01';
        let weight = 60;
        let height = 170;
        let passport_ic = '';
        let club_name = 'Senshi Karate Academy';
        let email = '';
        let phone = '';
        let payment_status: 'Paid' | 'Unpaid' | 'Pending' = 'Unpaid';
        let medical_status: 'Cleared' | 'Review Needed' = 'Cleared';

        if (cols.length >= 12) {
          // Tabbed layout (12 columns: Full, Name, Gender, DOB, Weight, Height, Passport/IC, Club, Email, Phone, Payment, Medical)
          fullName = `${cols[0]?.trim()} ${cols[1]?.trim()}`.trim();
          gender = cols[2]?.trim() === 'Female' ? 'Female' : 'Male';
          dob = cols[3]?.trim() || '2005-01-01';
          weight = parseFloat(cols[4]?.trim()) || 60;
          height = parseFloat(cols[5]?.trim()) || 170;
          passport_ic = cols[6]?.trim() || `IC-${Math.random()}`;
          club_name = cols[7]?.trim() || 'Senshi Karate Academy';
          email = cols[8]?.trim() || '';
          phone = cols[9]?.trim() || '';
          payment_status = (cols[10]?.trim() as any) || 'Unpaid';
          medical_status = cols[11]?.trim() === 'Cleared' ? 'Cleared' : 'Review Needed';
        } else {
          // Comma layout or standard (11 columns: Full Name, Gender, DOB, Weight, Height, Passport/IC, Club, Email, Phone, Payment, Medical)
          fullName = cols[0]?.trim();
          gender = cols[1]?.trim() === 'Female' ? 'Female' : 'Male';
          dob = cols[2]?.trim() || '2005-01-01';
          weight = parseFloat(cols[3]?.trim()) || 60;
          height = parseFloat(cols[4]?.trim()) || 170;
          passport_ic = cols[5]?.trim() || `IC-${Math.random()}`;
          club_name = cols[6]?.trim() || 'Senshi Karate Academy';
          email = cols[7]?.trim() || '';
          phone = cols[8]?.trim() || '';
          payment_status = (cols[9]?.trim() as any) || 'Unpaid';
          medical_status = cols[10]?.trim() === 'Cleared' ? 'Cleared' : 'Review Needed';
        }

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
        alert("No valid rows parsed from CSV. Make sure you match the format.");
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
        // 1. Duplicate Detection (check Passport/IC or Full Name)
        const isDuplicate = activeParticipants.some(p => 
          p.passport_ic.toLowerCase() === row.passport_ic.toLowerCase() ||
          p.full_name.toLowerCase() === row.full_name.toLowerCase()
        );

        if (isDuplicate) {
          duplicates.push(row.full_name);
          continue;
        }

        // 2. Find or create club id
        let clubId = clubs.find(c => c.name.toLowerCase() === row.club_name.toLowerCase())?.id;
        if (!clubId) {
          const newClub = await db.clubs.add({ name: row.club_name, city: 'Unknown' });
          clubId = newClub.id;
        }

        // 3. Create Participant
        const newPart = await db.participants.add({
          full_name: row.full_name,
          gender: row.gender,
          dob: row.dob,
          weight: row.weight,
          height: row.height,
          passport_ic: row.passport_ic,
          club_id: clubId,
          email: row.email,
          phone: row.phone,
          status: 'Pending',
          payment_status: row.payment_status,
          medical_status: row.medical_status === 'Cleared' ? 'Cleared' : 'Review Needed',
          remarks: 'CSV Imported'
        });
        
        importedIds.push(newPart.id);
      }

      setImportReport({
        importedIds,
        duplicates,
        errors
      });
      setStep(3);
      triggerRefresh();
    } catch (e: any) {
      alert(`Import failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = async () => {
    if (!importReport || importReport.importedIds.length === 0) return;
    if (confirm(`Rollback will delete the ${importReport.importedIds.length} participant(s) imported in this batch. Proceed?`)) {
      setIsProcessing(true);
      try {
        for (const id of importReport.importedIds) {
          // Hard delete from storage by editing raw array
          // Since our db client wraps mockStore, we can just delete soft-delete or clear them
          await db.participants.delete(id, 'System Rollback');
        }
        alert("Rollback completed successfully.");
        onClose();
        triggerRefresh();
      } catch (e: any) {
        alert("Rollback failed: " + e.message);
      } finally {
        setIsProcessing(false);
        setImportReport(null);
        setStep(1);
        setPreviewRows([]);
      }
    }
  };

  const handleReset = () => {
    setCsvContent('');
    setPreviewRows([]);
    setImportReport(null);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-foreground">
      <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col h-[600px] border border-border animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/10">
          <div>
            <h3 className="font-bold text-lg">CSV Participant Import Wizard</h3>
            <p className="text-xs text-muted-foreground">Upload or paste comma-separated data to populate registrations instantly</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Template Download Panel */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-left w-full">
                  <span className="font-bold text-xs text-foreground block">Download CSV Import Template</span>
                  <span className="text-[11px] text-muted-foreground block">Get the official spreadsheet layout to prepare your Dojo participant list.</span>
                </div>
                <button
                  type="button"
                  onClick={downloadCSVTemplate}
                  className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Drag n Drop area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragActive ? 'border-primary bg-secondary/50' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <input 
                  type="file" 
                  id="csv-file-upload" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <label htmlFor="csv-file-upload" className="w-full h-full cursor-pointer flex flex-col items-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <span className="font-semibold text-sm mb-1 block">Drag and drop CSV files here</span>
                  <span className="text-xs text-muted-foreground mb-3">or click to browse from device</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border">
                    CSV Format Only
                  </span>
                </label>
              </div>

              {/* Paste Text Area */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Or Paste CSV Comma-Separated Values</label>
                <textarea
                  placeholder={sampleCSV}
                  value={csvContent}
                  onChange={handlePasteChange}
                  className="w-full h-36 p-3 bg-secondary border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                />
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setCsvContent(sampleCSV)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Insert template columns & sample rows
                  </button>
                  <button
                    onClick={handlePasteParse}
                    disabled={!csvContent.trim()}
                    className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    Parse Data <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Parsed <strong>{previewRows.length}</strong> record(s) successfully. Please verify columns before uploading. Duplicate checks will skip matches.
                  </span>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col bg-card">
                <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-secondary/40 sticky top-0 border-b border-border">
                      <tr>
                        <th className="p-3 font-semibold text-muted-foreground">Full Name</th>
                        <th className="p-3 font-semibold text-muted-foreground">Gender</th>
                        <th className="p-3 font-semibold text-muted-foreground">DOB</th>
                        <th className="p-3 font-semibold text-muted-foreground">Weight</th>
                        <th className="p-3 font-semibold text-muted-foreground">Height</th>
                        <th className="p-3 font-semibold text-muted-foreground">Passport/IC</th>
                        <th className="p-3 font-semibold text-muted-foreground">Club</th>
                        <th className="p-3 font-semibold text-muted-foreground">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-secondary/20">
                          <td className="p-3 font-medium">{row.full_name}</td>
                          <td className="p-3">{row.gender}</td>
                          <td className="p-3 font-mono">{row.dob}</td>
                          <td className="p-3 font-mono">{row.weight} kg</td>
                          <td className="p-3 font-mono">{row.height} cm</td>
                          <td className="p-3 font-mono">{row.passport_ic}</td>
                          <td className="p-3">{row.club_name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              row.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {row.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Wizard Nav */}
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={handleReset} 
                  className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Run Import Wizard
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && importReport && (
            <div className="space-y-6">
              {/* Completed Panel */}
              <div className="flex flex-col items-center justify-center text-center p-8 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-foreground mb-1">Import Completed Successfully</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  We scanned and matched the data structure. Standard categories were automatically calculated and mapped for each imported entry.
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Successfully Imported</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{importReport.importedIds.length}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Registrations added</span>
                </div>
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Skipped (Duplicates)</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{importReport.duplicates.length}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Matched name or IC</span>
                </div>
                <div className="bg-secondary/40 border border-border p-4 rounded-xl">
                  <span className="text-xs text-muted-foreground block">Failures / Errors</span>
                  <span className="text-2xl font-bold text-foreground block mt-1">{importReport.errors.length}</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">Validation failed</span>
                </div>
              </div>

              {/* Duplicate Details */}
              {importReport.duplicates.length > 0 && (
                <div className="bg-secondary/20 border border-border p-4 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Skipped Entries</span>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {importReport.duplicates.map((dup, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        <span>{dup} (Duplicate registry conflict)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                {importReport.importedIds.length > 0 ? (
                  <button
                    onClick={handleRollback}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Rollback This Batch
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={handleReset} 
                    className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Import More
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
