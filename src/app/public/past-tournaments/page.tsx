'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Filter, Trophy, MapPin, Calendar, Medal,
  Download, ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
  Crown, Users, Star, X, Image as ImageIcon
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Discipline = 'All' | 'Kata' | 'Kumite';

interface MedalCount {
  gold: number;
  silver: number;
  bronze: number;
}

interface Champion {
  name: string;
  club: string;
  category: string;
  medal: '🥇' | '🥈' | '🥉';
}

interface PastTournament {
  id: string;
  name: string;
  year: number;
  date: string;
  venue: string;
  city: string;
  discipline: Discipline[];
  medals: MedalCount;
  champions: Champion[];
  totalParticipants: number;
  totalClubs: number;
  posterGradient: string;
  posterEmoji: string;
  pdfUrl?: string;
  photos: { id: string; caption: string; gradient: string }[];
}

// ─── Static Past Tournament Data ────────────────────────────────────────────

const PAST_TOURNAMENTS: PastTournament[] = [
  {
    id: 'ksg-open-2026',
    name: 'Kelab Senshi Goju-Ryu Open Karate Championship 2026',
    year: 2026,
    date: '14 June 2026 18:41',
    venue: 'Dewan Serbaguna Petaling Jaya',
    city: 'Petaling Jaya, Selangor',
    discipline: ['Kata', 'Kumite'],
    medals: { gold: 24, silver: 24, bronze: 48 },
    totalParticipants: 203,
    totalClubs: 6,
    posterGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)',
    posterEmoji: '🥇',
    pdfUrl: '#',
    photos: [
      { id: 'p26-1', caption: 'Opening Ceremony 2026', gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
      { id: 'p26-2', caption: 'Kumite Selections', gradient: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' },
      { id: 'p26-3', caption: 'Finalists Group Photo', gradient: 'linear-gradient(135deg,#14532d,#166534)' },
    ],
    champions: [
      { name: 'YESHARLINNI MURULI', club: 'Kelab Senshi Goju-Ryu Karate Do', category: "Girls 10-11 Kumite -35kg", medal: '🥇' },
      { name: 'Aqil bin Jaafar', club: 'Tiger Claw Dojo', category: "Junior Male Individual Kumite -61 kg", medal: '🥇' },
      { name: 'Qistina bin Razali', club: 'Budokan Singapore', category: "U14 FEMALE INDIVIDUAL KUMITE -52KG", medal: '🥇' },
      { name: 'Asyraf bin Salleh', club: 'Budokan Singapore', category: "Junior Male Individual Kumite -55 kg", medal: '🥇' },
    ],
  },
  {
    id: 'ksg-open-2025',
    name: 'Kelab Senshi Goju-Ryu Open Karate Championship 2025',
    year: 2025,
    date: '12–13 July 2025',
    venue: 'Dewan Serbaguna Petaling Jaya',
    city: 'Petaling Jaya, Selangor',
    discipline: ['Kata', 'Kumite'],
    medals: { gold: 18, silver: 18, bronze: 36 },
    totalParticipants: 312,
    totalClubs: 28,
    posterGradient: 'linear-gradient(135deg, #7f1d1d 0%, #1a1a1a 50%, #78350f 100%)',
    posterEmoji: '🥋',
    pdfUrl: '#',
    photos: [
      { id: 'p1', caption: 'Opening Ceremony', gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
      { id: 'p2', caption: 'Kata Finals', gradient: 'linear-gradient(135deg,#14532d,#166534)' },
      { id: 'p3', caption: 'Kumite Semi-Finals', gradient: 'linear-gradient(135deg,#7f1d1d,#991b1b)' },
      { id: 'p4', caption: 'Medal Ceremony', gradient: 'linear-gradient(135deg,#713f12,#92400e)' },
      { id: 'p5', caption: 'Team Kata', gradient: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' },
      { id: 'p6', caption: 'Award Presentation', gradient: 'linear-gradient(135deg,#4a044e,#6b21a8)' },
    ],
    champions: [
      { name: 'Ahmad Faris', club: 'Kelab Senshi PJ', category: "Kata U-18 Male", medal: '🥇' },
      { name: 'Nur Aisyah', club: 'Dojo Wira Shah Alam', category: "Kata U-15 Female", medal: '🥇' },
      { name: 'Hazwan Hakimi', club: 'Kelab Senshi PJ', category: "Kumite -68kg Male", medal: '🥇' },
      { name: 'Siti Maryam', club: 'Kelab Senshi PJ', category: "Kumite -55kg Female", medal: '🥇' },
      { name: 'Kelab Senshi A', club: 'Kelab Senshi PJ', category: "Team Kata Open", medal: '🥇' },
    ],
  },
  {
    id: 'msn-state-2025',
    name: 'MSN Selangor State Karate Championship 2025',
    year: 2025,
    date: '22 March 2025',
    venue: 'Stadium Tertutup Shah Alam',
    city: 'Shah Alam, Selangor',
    discipline: ['Kata', 'Kumite'],
    medals: { gold: 8, silver: 12, bronze: 20 },
    totalParticipants: 186,
    totalClubs: 21,
    posterGradient: 'linear-gradient(135deg, #0c1a2e 0%, #0b2244 50%, #14532d 100%)',
    posterEmoji: '🏆',
    pdfUrl: '#',
    photos: [
      { id: 'p1', caption: 'Draw Ceremony', gradient: 'linear-gradient(135deg,#1e3a5f,#0369a1)' },
      { id: 'p2', caption: 'Junior Kata', gradient: 'linear-gradient(135deg,#14532d,#15803d)' },
      { id: 'p3', caption: 'Kumite Finals', gradient: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' },
      { id: 'p4', caption: 'Podium', gradient: 'linear-gradient(135deg,#713f12,#b45309)' },
    ],
    champions: [
      { name: 'Irfan Danial', club: 'Kelab Senshi PJ', category: "Kumite U-21 Male", medal: '🥇' },
      { name: 'Farah Liyana', club: 'Dojo Wira Shah Alam', category: "Kata Senior Female", medal: '🥇' },
      { name: 'Zulhairy', club: 'Kelab Senshi PJ', category: "Kumite +80kg Male", medal: '🥈' },
    ],
  },
  {
    id: 'ksg-open-2024',
    name: 'Kelab Senshi Goju-Ryu Open Karate Championship 2024',
    year: 2024,
    date: '10–11 August 2024',
    venue: 'Dewan Serbaguna Petaling Jaya',
    city: 'Petaling Jaya, Selangor',
    discipline: ['Kata', 'Kumite'],
    medals: { gold: 20, silver: 20, bronze: 40 },
    totalParticipants: 290,
    totalClubs: 25,
    posterGradient: 'linear-gradient(135deg, #0b1120 0%, #1e3a5f 50%, #312e81 100%)',
    posterEmoji: '⚔️',
    pdfUrl: '#',
    photos: [
      { id: 'p1', caption: 'Opening Ceremony 2024', gradient: 'linear-gradient(135deg,#1e1b4b,#4338ca)' },
      { id: 'p2', caption: 'Kata Eliminations', gradient: 'linear-gradient(135deg,#064e3b,#047857)' },
      { id: 'p3', caption: 'Kumite Quarters', gradient: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
      { id: 'p4', caption: 'Finals Day', gradient: 'linear-gradient(135deg,#713f12,#d97706)' },
      { id: 'p5', caption: 'Champions 2024', gradient: 'linear-gradient(135deg,#0b4f27,#16a34a)' },
    ],
    champions: [
      { name: 'Ahmad Faris', club: 'Kelab Senshi PJ', category: "Kata U-21 Male", medal: '🥇' },
      { name: 'Nur Aisyah', club: 'Dojo Wira Shah Alam', category: "Kata U-18 Female", medal: '🥇' },
      { name: 'Khairul Anwar', club: 'Selangor Karate Academy', category: "Kumite -75kg Male", medal: '🥇' },
      { name: 'Syafiqah Zahra', club: 'Kelab Senshi PJ', category: "Kumite -61kg Female", medal: '🥇' },
    ],
  },
];

// ─── Photo Gallery Lightbox ─────────────────────────────────────────────────

function PhotoGallery({
  photos,
}: {
  photos: PastTournament['photos'];
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <>
      <div className="pt-gallery">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            className="pt-gallery__thumb"
            style={{ background: photo.gradient }}
            onClick={() => setLightbox(i)}
            aria-label={`View photo: ${photo.caption}`}
          >
            <ImageIcon size={20} className="pt-gallery__thumb-icon" />
            <span className="pt-gallery__thumb-caption">{photo.caption}</span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="pt-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setLightbox(null)}
        >
          <div
            className="pt-lightbox__content"
            style={{ background: photos[lightbox].gradient }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-lightbox__inner">
              <ImageIcon size={60} style={{ opacity: 0.5, color: '#fff' }} />
              <p style={{ color: '#fff', marginTop: 12, fontWeight: 600 }}>
                {photos[lightbox].caption}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>
                Tournament photo placeholder
              </p>
            </div>

            <div className="pt-lightbox__nav">
              <button
                className="pt-lightbox__btn"
                onClick={() => setLightbox((l) => Math.max(0, (l ?? 1) - 1))}
                disabled={lightbox === 0}
                aria-label="Previous"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="pt-lightbox__counter">
                {lightbox + 1} / {photos.length}
              </span>
              <button
                className="pt-lightbox__btn"
                onClick={() => setLightbox((l) => Math.min(photos.length - 1, (l ?? 0) + 1))}
                disabled={lightbox === photos.length - 1}
                aria-label="Next"
              >
                <ArrowRight size={18} />
              </button>
              <button
                className="pt-lightbox__close"
                onClick={() => setLightbox(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Past Tournament Card ──────────────────────────────────────────────────

function PastTournamentCard({ tournament }: { tournament: PastTournament }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="pt-card">
      {/* Poster + Info Row */}
      <div className="pt-card__top">
        {/* Poster */}
        <div
          className="pt-card__poster"
          style={{ background: tournament.posterGradient }}
          aria-hidden="true"
        >
          <span className="pt-card__poster-emoji">{tournament.posterEmoji}</span>
          <span className="pt-card__poster-year">{tournament.year}</span>
        </div>

        {/* Info */}
        <div className="pt-card__info">
          <div className="pt-card__info-header">
            <h2 className="pt-card__name">{tournament.name}</h2>
            <div className="pt-card__disciplines">
              {tournament.discipline.map((d) => (
                <span key={d} className="pt-disc-pill">
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-card__meta">
            <span>
              <Calendar size={13} /> {tournament.date}
            </span>
            <span>
              <MapPin size={13} /> {tournament.venue}, {tournament.city}
            </span>
            <span>
              <Users size={13} /> {tournament.totalParticipants} athletes •{' '}
              {tournament.totalClubs} clubs
            </span>
          </div>

          {/* Medal Count */}
          <div className="pt-card__medals">
            <span className="pt-medal pt-medal--gold">
              🥇 {tournament.medals.gold}
            </span>
            <span className="pt-medal pt-medal--silver">
              🥈 {tournament.medals.silver}
            </span>
            <span className="pt-medal pt-medal--bronze">
              🥉 {tournament.medals.bronze}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-card__actions">
            {tournament.pdfUrl && (
              <a
                href={tournament.pdfUrl}
                download
                className="pt-btn-download"
                aria-label="Download results PDF"
              >
                <Download size={13} />
                Download Results
              </a>
            )}
            <button
              className="pt-btn-details"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              aria-controls={`details-${tournament.id}`}
            >
              {expanded ? (
                <>
                  <ChevronUp size={14} /> Hide Details
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> View Details
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div
          id={`details-${tournament.id}`}
          className="pt-card__details"
        >
          {/* Photo Gallery */}
          <div className="pt-section">
            <h3 className="pt-section__title">
              <ImageIcon size={15} /> Photo Gallery
            </h3>
            <PhotoGallery photos={tournament.photos} />
          </div>

          {/* Champions */}
          <div className="pt-section">
            <h3 className="pt-section__title">
              <Crown size={15} /> Champion List
            </h3>
            <div className="pt-champions">
              {tournament.champions.map((c, i) => (
                <div key={i} className="pt-champion-row">
                  <span className="pt-champion-medal">{c.medal}</span>
                  <div className="pt-champion-info">
                    <span className="pt-champion-name">{c.name}</span>
                    <span className="pt-champion-club">{c.club}</span>
                  </div>
                  <span className="pt-champion-category">{c.category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function PastTournamentsPage() {
  const [searchYear, setSearchYear] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState<Discipline>('All');

  const years = useMemo(
    () => [...new Set(PAST_TOURNAMENTS.map((t) => t.year))].sort((a, b) => b - a),
    []
  );

  const filtered = useMemo(() => {
    return PAST_TOURNAMENTS.filter((t) => {
      const yearMatch = searchYear ? t.year === parseInt(searchYear, 10) : true;
      const disciplineMatch =
        filterDiscipline === 'All' || t.discipline.includes(filterDiscipline);
      return yearMatch && disciplineMatch;
    });
  }, [searchYear, filterDiscipline]);

  const totalMedals = useMemo(
    () =>
      PAST_TOURNAMENTS.reduce(
        (acc, t) => ({
          gold: acc.gold + t.medals.gold,
          silver: acc.silver + t.medals.silver,
          bronze: acc.bronze + t.medals.bronze,
        }),
        { gold: 0, silver: 0, bronze: 0 }
      ),
    []
  );

  return (
    <div className="pt-page">
      {/* Hero */}
      <header className="pt-hero">
        <div className="pt-hero__content">
          <div className="pt-hero__badge">
            <Trophy size={14} fill="currentColor" />
            Tournament Archive
          </div>
          <h1 className="pt-hero__title">Past Tournaments</h1>
          <p className="pt-hero__subtitle">
            A legacy of dedication, discipline, and excellence. Browse our
            tournament history and relive the moments that defined Kelab Senshi
            Goju-Ryu.
          </p>

          {/* Summary stats */}
          <div className="pt-hero__stats">
            <div className="pt-hero__stat">
              <span className="pt-hero__stat-value">{PAST_TOURNAMENTS.length}</span>
              <span className="pt-hero__stat-label">Tournaments</span>
            </div>
            <div className="pt-hero__stat-divider" />
            <div className="pt-hero__stat">
              <span className="pt-hero__stat-value">
                {PAST_TOURNAMENTS.reduce((a, t) => a + t.totalParticipants, 0)}
              </span>
              <span className="pt-hero__stat-label">Total Athletes</span>
            </div>
            <div className="pt-hero__stat-divider" />
            <div className="pt-hero__stat">
              <span className="pt-hero__stat-value">
                🥇 {totalMedals.gold} &nbsp;🥈 {totalMedals.silver} &nbsp;🥉{' '}
                {totalMedals.bronze}
              </span>
              <span className="pt-hero__stat-label">Medals Awarded</span>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="pt-filters" role="search" aria-label="Filter past tournaments">
        {/* Year search */}
        <div className="pt-filters__search">
          <Search size={15} className="pt-filters__search-icon" />
          <select
            className="pt-filters__select"
            value={searchYear}
            onChange={(e) => setSearchYear(e.target.value)}
            aria-label="Filter by year"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Discipline filter */}
        <div className="pt-filters__discipline" role="group" aria-label="Filter by discipline">
          <Filter size={14} className="pt-filters__disc-icon" />
          {(['All', 'Kata', 'Kumite'] as Discipline[]).map((d) => (
            <button
              key={d}
              className={`pt-filters__disc-btn ${filterDiscipline === d ? 'pt-filters__disc-btn--active' : ''}`}
              onClick={() => setFilterDiscipline(d)}
              aria-pressed={filterDiscipline === d}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div className="pt-filters__count">
          {filtered.length} tournament{filtered.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Tournament list */}
      <section className="pt-list" aria-label="Past tournaments">
        {filtered.length === 0 ? (
          <div className="pt-empty">
            <Star size={40} className="pt-empty__icon" />
            <p>No tournaments found for the selected filters.</p>
          </div>
        ) : (
          filtered.map((t) => <PastTournamentCard key={t.id} tournament={t} />)
        )}
      </section>

      {/* Nav to upcoming */}
      <div className="pt-page__footer">
        <Link href="/public/tournaments" className="tournaments-back__link">
          <ArrowRight size={14} />
          View Upcoming Tournaments
        </Link>
      </div>
    </div>
  );
}
