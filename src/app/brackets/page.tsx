'use client';

import React, { useState } from 'react';
import { Bracket, generateBrackets, getBracketStats } from '@/lib/bracketGenerator';
import { SAMPLE_ROSTER } from '@/lib/sampleRoster';
import { ChevronDown, Users, Trophy, Printer } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import { basePath } from '@/db/dbClient';

export default function BracketSystemPage() {
  const { logoUrl } = useTournament();
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedBracket, setSelectedBracket] = useState<string | null>(null);
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);

  const handleGenerateBrackets = () => {
    const generatedBrackets = generateBrackets(SAMPLE_ROSTER);
    setBrackets(generatedBrackets);
    setStats(getBracketStats(generatedBrackets));
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 no-print">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/20 bg-slate-900 shrink-0">
              <img src={logoUrl || `${basePath}/logo.jpg`} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col leading-none">
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '1.15rem', lineHeight: 1, letterSpacing: '0.01em' }}>
                <span style={{ color: '#b91c2e' }}>Karate</span>
                <span style={{ color: '#38bdf8' }}>Tech</span>
              </div>
              <div style={{ height: '2px', background: 'linear-gradient(90deg, #b91c2e 60%, transparent 100%)', marginTop: '2px', marginBottom: '2px', borderRadius: '1px' }} />
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.01em', color: '#818cf8', lineHeight: 1.15 }}>
                SP SportData Solution
              </span>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.58rem', letterSpacing: '0.08em', color: '#64748b', lineHeight: 1.2, marginTop: '2px', whiteSpace: 'nowrap' }}>
                • Precision. • Speed. • Results. •
              </span>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2 justify-end">
              <Trophy className="text-yellow-400" size={24} />
              Bracket System
            </h1>
            <p className="text-xs text-slate-400">Goju-Ryu Karate Championship 2026</p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleGenerateBrackets}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg cursor-pointer"
          >
            Generate Brackets from Roster
          </button>
          {brackets.length > 0 && (
            <button
              onClick={() => window.print()}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Printer size={18} />
              Print Brackets
            </button>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="text-slate-300 text-sm font-semibold">Total Brackets</div>
              <div className="text-3xl font-bold text-white mt-2">{stats.totalBrackets}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="text-slate-300 text-sm font-semibold">Total Athletes</div>
              <div className="text-3xl font-bold text-white mt-2">{stats.totalAthletes}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="text-slate-300 text-sm font-semibold">Male Divisions</div>
              <div className="text-3xl font-bold text-blue-400 mt-2">{stats.byGender.male}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <div className="text-slate-300 text-sm font-semibold">Female Divisions</div>
              <div className="text-3xl font-bold text-pink-400 mt-2">{stats.byGender.female}</div>
            </div>
          </div>
        )}

        {/* Brackets List */}
        {brackets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={28} />
              Divisions
            </h2>
            {brackets.map((bracket) => (
              <div key={bracket.id} className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
                {/* Division Header */}
                <button
                  onClick={() =>
                    setExpandedDivision(expandedDivision === bracket.id ? null : bracket.id)
                  }
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        bracket.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
                      }`}
                    />
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">{bracket.division}</h3>
                      <p className="text-sm text-slate-400">
                        {bracket.athletes.length} athlete{bracket.athletes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={24}
                    className={`text-slate-400 transition-transform ${
                      expandedDivision === bracket.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Division Details */}
                {expandedDivision === bracket.id && (
                  <div className="px-6 py-4 bg-slate-600 border-t border-slate-500">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Participants:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {bracket.athletes.map((athlete) => (
                          <div
                            key={athlete.registrationNo}
                            className="bg-slate-700 p-3 rounded text-sm border border-slate-500"
                          >
                            <div className="font-semibold text-white">{athlete.fullName}</div>
                            <div className="text-slate-400 text-xs">
                              {athlete.weight}kg | {athlete.club}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tournament Rounds */}
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Tournament Rounds:</h4>
                      {bracket.rounds.map((round) => (
                        <div key={round.number} className="mb-4 p-3 bg-slate-700 rounded border border-slate-500">
                          <div className="text-sm font-semibold text-blue-400 mb-2">
                            Round {round.number}
                          </div>
                          <div className="space-y-2">
                            {round.matches.map((match) => (
                              <div
                                key={match.id}
                                className="text-xs bg-slate-800 p-2 rounded flex justify-between items-center"
                              >
                                <div className="flex-1">
                                  <div className="text-slate-300">
                                    {match.athlete1?.fullName || 'TBD'}
                                  </div>
                                  <div className="text-slate-300">
                                    {match.athlete2?.fullName || 'TBD'}
                                  </div>
                                </div>
                                <div className="text-slate-500 px-2">vs</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {brackets.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="mx-auto text-slate-500 mb-4" size={48} />
            <p className="text-slate-400 text-lg">Click "Generate Brackets" to create tournament divisions</p>
          </div>
        )}
      </div>
    </div>

    {/* HIDDEN PRINT AREA — rendered for @media print only */}
    <div className="hidden print:block text-black bg-white p-4">
      <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoUrl || `${basePath}/logo.jpg`} alt="Logo" style={{ height: '50px', width: '50px', objectFit: 'cover', borderRadius: '50%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '1.15rem', lineHeight: 1, letterSpacing: '0.01em' }}>
              <span style={{ color: '#b91c2e' }}>Karate</span>
              <span style={{ color: '#38bdf8' }}>Tech</span>
            </div>
            <div style={{ height: '2px', background: 'linear-gradient(90deg, #b91c2e 60%, transparent 100%)', marginTop: '2px', marginBottom: '2px', borderRadius: '1px' }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.01em', color: '#000', lineHeight: 1.15 }}>
              SP SportData Solution
            </span>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.58rem', letterSpacing: '0.08em', color: '#64748b', lineHeight: 1.2, marginTop: '2px' }}>
              • Precision. • Speed. • Results. •
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div className="font-black text-sm">Bracket Sheet</div>
          <div>Printed: {new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {brackets.map(bracket => (
        <div key={bracket.id} className="mb-8" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
          <h2 className="text-lg font-bold border-b pb-2 mb-4">{bracket.division} ({bracket.athletes.length} Athletes)</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Athletes:</h3>
              <ul className="space-y-1 text-xs">
                {bracket.athletes.map(a => (
                  <li key={a.registrationNo} className="border-b py-1">
                    {a.fullName} - {a.weight}kg ({a.club})
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Matches:</h3>
              <div className="space-y-2">
                {bracket.rounds.map(r => (
                  <div key={r.number} className="border p-2 rounded">
                    <h4 className="text-xs font-bold text-blue-600 mb-1">Round {r.number}</h4>
                    {r.matches.map(m => (
                      <div key={m.id} className="text-[10px] flex justify-between py-0.5">
                        <span>{m.athlete1?.fullName || 'TBD'}</span>
                        <span className="text-gray-400">vs</span>
                        <span>{m.athlete2?.fullName || 'TBD'}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}

