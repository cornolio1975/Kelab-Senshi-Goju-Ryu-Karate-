'use client';

import React, { useState } from 'react';
import { Bracket, Match, Athlete } from '@/lib/bracketGenerator';
import { Trophy, ChevronDown, Play, CheckCircle } from 'lucide-react';

interface AdvancedBracketProps {
  bracket: Bracket;
  onMatchComplete?: (match: Match, winner: Athlete) => void;
}

export function AdvancedBracketComponent({ bracket, onMatchComplete }: AdvancedBracketProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<Map<string, Athlete>>(new Map());

  const handleRecordWinner = (matchId: string, winner: Athlete) => {
    const match = bracket.rounds
      .flatMap((r) => r.matches)
      .find((m) => m.id === matchId);

    if (match) {
      setMatchResults(new Map(matchResults).set(matchId, winner));
      onMatchComplete?.(match, winner);
      setSelectedMatch(null);
    }
  };

  const getMatchStatus = (match: Match): string => {
    if (matchResults.has(match.id)) {
      return 'completed';
    }
    return 'pending';
  };

  const getWinnerDisplay = (matchId: string) => {
    const winner = matchResults.get(matchId);
    return winner ? winner.fullName : null;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 border-b border-slate-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{bracket.division}</h3>
            <p className="text-sm text-slate-300 mt-1">
              {bracket.athletes.length} competitor{bracket.athletes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Trophy className="text-yellow-400" size={32} />
        </div>
      </div>

      {/* Rounds */}
      <div className="divide-y divide-slate-600">
        {bracket.rounds.map((round) => (
          <div key={round.number} className="bg-slate-800">
            {/* Round Header */}
            <button
              onClick={() => setExpandedRound(expandedRound === round.number ? null : round.number)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-700 transition-colors"
            >
              <div className="text-left">
                <h4 className="font-semibold text-white">
                  {round.number === 1
                    ? 'Quarterfinals'
                    : round.number === 2
                      ? 'Semifinals'
                      : round.number === 3
                        ? 'Finals'
                        : `Round ${round.number}`}
                </h4>
                <p className="text-xs text-slate-400">{round.matches.length} match(es)</p>
              </div>
              <ChevronDown
                size={20}
                className={`text-slate-400 transition-transform ${
                  expandedRound === round.number ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Matches */}
            {expandedRound === round.number && (
              <div className="bg-slate-700 px-6 py-4 space-y-3">
                {round.matches.map((match) => (
                  <div
                    key={match.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedMatch === match.id ? 'border-blue-500 bg-slate-600' : 'border-slate-500 bg-slate-800'
                    }`}
                  >
                    {/* Match Details */}
                    <div className="space-y-2 mb-3">
                      {/* Athlete 1 */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            {match.athlete1?.fullName || 'TBD'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {match.athlete1?.club} • {match.athlete1?.weight}kg
                          </div>
                        </div>
                        {getWinnerDisplay(match.id) === match.athlete1?.fullName && (
                          <CheckCircle className="text-green-500" size={20} />
                        )}
                      </div>

                      {/* VS */}
                      <div className="text-center text-slate-400 text-sm">vs</div>

                      {/* Athlete 2 */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            {match.athlete2?.fullName || 'TBD'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {match.athlete2?.club} • {match.athlete2?.weight}kg
                          </div>
                        </div>
                        {getWinnerDisplay(match.id) === match.athlete2?.fullName && (
                          <CheckCircle className="text-green-500" size={20} />
                        )}
                      </div>
                    </div>

                    {/* Match Status */}
                    <div className="mb-3 px-3 py-2 bg-slate-900 rounded text-sm">
                      <span className={`font-semibold ${
                        getMatchStatus(match.id) === 'completed' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {getMatchStatus(match.id) === 'completed' ? '✓ Completed' : '◯ Pending'}
                      </span>
                      {getWinnerDisplay(match.id) && (
                        <span className="text-slate-300 ml-2">
                          Winner: {getWinnerDisplay(match.id)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {getMatchStatus(match.id) === 'pending' && (
                      <div className="space-y-2">
                        {match.athlete1 && (
                          <button
                            onClick={() => handleRecordWinner(match.id, match.athlete1!)}
                            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Play size={16} />
                            {match.athlete1.fullName} Wins
                          </button>
                        )}
                        {match.athlete2 && (
                          <button
                            onClick={() => handleRecordWinner(match.id, match.athlete2!)}
                            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Play size={16} />
                            {match.athlete2.fullName} Wins
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-slate-700 px-6 py-4 border-t border-slate-600">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">
              {matchResults.size}
            </div>
            <div className="text-xs text-slate-400">Matches Won</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {bracket.rounds.reduce((sum, r) => sum + r.matches.length, 0)}
            </div>
            <div className="text-xs text-slate-400">Total Matches</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {Math.round((matchResults.size / bracket.rounds.reduce((sum, r) => sum + r.matches.length, 0)) * 100)}%
            </div>
            <div className="text-xs text-slate-400">Progress</div>
          </div>
        </div>
      </div>
    </div>
  );
}
