'use client';

import React, { useState } from 'react';
import { Bracket, generateBrackets, getBracketStats } from '@/lib/bracketGenerator';
import { SAMPLE_ROSTER } from '@/lib/sampleRoster';
import { ChevronDown, Users, Trophy } from 'lucide-react';

export default function BracketSystemPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="text-yellow-400" size={40} />
            Karate Tournament Bracket System
          </h1>
          <p className="text-slate-300">Goju-Ryu Karate Championship 2026</p>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateBrackets}
          className="mb-8 px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
        >
          Generate Brackets from Roster
        </button>

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
  );
}
