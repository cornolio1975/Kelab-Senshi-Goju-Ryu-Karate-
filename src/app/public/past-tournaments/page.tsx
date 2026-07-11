'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, Filter, Trophy, MapPin, Calendar, Medal,
  Download, ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
  Crown, Users, Star, X, Image as ImageIcon, Home
} from 'lucide-react';
import { db } from '@/db/dbClient';

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
    id: 'itosu-ryu-open-2026',
    name: 'ITOSU-RYU OPEN KARATE CHAMPIONSHIP 2026',
    year: 2026,
    date: '2026-06-11',
    venue: 'Pusat Komersial Anggun City, Rawang',
    city: 'Rawang, Selangor',
    discipline: ['Kata', 'Kumite'],
    medals: { gold: 88, silver: 88, bronze: 149 },
    totalParticipants: 481,
    totalClubs: 75,
    posterGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)',
    posterEmoji: '🥇',
    pdfUrl: '#',
    photos: [
      { id: 'p26-1', caption: 'Opening Ceremony 2026', gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
      { id: 'p26-2', caption: 'Kumite Selections', gradient: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' },
      { id: 'p26-3', caption: 'Finalists Group Photo', gradient: 'linear-gradient(135deg,#14532d,#166534)' },
    ],
    champions: [
      { name: "KAASHISH LAL PURANCHAN LAL", club: "ITOSU-RYU", category: "10-11 YEARS MALE KUMITE -35 kg G1", medal: "🥇" },
      { name: "THISHANRAJ JAYARAJ", club: "ITOSU-RYU", category: "10-11 YEARS MALE KUMITE -35 kg G2", medal: "🥇" },
      { name: "GAUTHAM POOVENDRAN", club: "SHK", category: "10-11 YEARS MALE KUMITE -40 kg", medal: "🥇" },
      { name: "MOHD FAIRUL AHMED SAIF FUDAEEL", club: "TSKA", category: "6-7  YEARS  INDIVIDUAL MALE KATA", medal: "🥇" },
      { name: "AYYASH LUQMAN BIN AHMAD NAIM", club: "KAPJ", category: "6-7  YEARS MALE KUMITE -25 KG G1", medal: "🥇" },
      { name: "AATISH SHIVRAM JEREMIA PHILLAI", club: "KAPJ", category: "6-7  YEARS MALE KUMITE -25 KG G2", medal: "🥇" },
      { name: "YOGESAN VARSSHINIE", club: "HAYASHI-HA", category: "6-7 YEARS FEMALE KUMITE -20 KG", medal: "🥇" },
      { name: "SAMERA SREE", club: "KAPJ", category: "6-7 YEARS FEMALE KUMITE -25 KG", medal: "🥇" },
      { name: "VISHAAKAN KHARTE", club: "KIBOKAN SEL", category: "6-7 YEARS MALE -20 KG G1", medal: "🥇" },
      { name: "KARTIGAN MURUGAN", club: "ITOSU-RYU", category: "6-7 YEARS MALE -20 KG G2", medal: "🥇" },
      { name: "VIGNESWARAN YANSHIKA", club: "PSSKNS", category: "8-9 YEARS FEMALE_INDIVIDUAL KUMITE -30KG", medal: "🥇" },
      { name: "SHOBAN SIVARAJAN", club: "JKBA", category: "8-9 YEARS MALE KUMITE -25 KG G1", medal: "🥇" },
      { name: "DARWIN KANTHAN", club: "SHK", category: "8-9 YEARS MALE KUMITE -25 KG G2", medal: "🥇" },
      { name: "MOHD FAIRUL SURI FATEEMA", club: "TSKA", category: "8-9 Years Individual Female Kumite -25KG", medal: "🥇" },
      { name: "DATU NOORNIKMAN DATU NOAH EZRA", club: "MASK", category: "8-9 Years Kata Male", medal: "🥇" },
      { name: "VARSHAN KAMAL", club: "ITOSU-RYU", category: "BOYS 10-11 YEARS INDIVIDUAL KATA G1", medal: "🥇" },
      { name: "MUHAMMAD AFIF MUHAMMAD AIDAN ZIQRI", club: "KUNIBA KAI KL", category: "BOYS 10-11 YEARS INDIVIDUAL KATA G2", medal: "🥇" },
      { name: "KAARTHICK PUVANESWARAN", club: "ITOSU-RYU", category: "BOYS 8-9 YEARS INDIVIDUAL KUMITE -30KG", medal: "🥇" },
      { name: "ITOSU RYU KARATE", club: "ITOSU-RYU", category: "BOYS BELOW 11 YEARS OLD & U14 TEAM KATA", medal: "🥇" },
      { name: "TARUN KALAISELVAN", club: "KARATE KELANTAN BARU", category: "BOYS INDIVIDUAL KUMITE 10-11 YEARS +40KG", medal: "🥇" },
      { name: "YOGESWARAN ANBALAGAN", club: "KARATE SPEED POWER WPKL", category: "BOYS INDIVIDUAL KUMITE 6-7 YEARS +25KG", medal: "🥇" },
      { name: "LEYGAN VIGNESWARAN", club: "KKJK", category: "BOYS INDIVIDUAL KUMITE 8-9 YEARS +30KG G1", medal: "🥇" },
      { name: "LACKSHYAN SHARVINTHIRAN", club: "KIBOKAN SEL", category: "BOYS INDIVIDUAL KUMITE 8-9 YEARS +30KG G2", medal: "🥇" },
      { name: "PERSATUAN KARATEDO DAERAH GOMBAK", club: "ITOSU-RYU", category: "BOYS TEAM KUMITE BELOW 11 YEARS", medal: "🥇" },
      { name: "SHOTOKAN HAYAIDESU KARATE", club: "SHK", category: "BOYS U14 TEAM KUMITE", medal: "🥇" },
      { name: "ITOSU RYU KARATE", club: "ITOSU-RYU", category: "CADET AND JUNIOR FEMALE TEAM KATA", medal: "🥇" },
      { name: "ITOSU RYU KARATE", club: "ITOSU-RYU", category: "CADET AND JUNIOR MALE TEAM KATA", medal: "🥇" },
      { name: "PERSATUAN KARATE KELANTAN BARU", club: "KARATE KELANTAN BARU", category: "CADET FEMALE TEAM KUMITE", medal: "🥇" },
      { name: "ITOSU RYU KARATE", club: "ITOSU-RYU", category: "CADET MALE TEAM KUMITE 14-15 YEARS OLD", medal: "🥇" },
      { name: "SURESH YUVASRI", club: "GOJU-KAI", category: "Cadet Female Individual Kata", medal: "🥇" },
      { name: "PENGERAN TAUFIQ HABIBALLAH PUTERI FAKHIRA HIDAYAH", club: "PKDKULAI", category: "Cadet Female Individual Kumite  +61Kg", medal: "🥇" },
      { name: "THAKSHAYANI SURESH KUMAR", club: "HAYASHI-HA", category: "Cadet Female Individual Kumite  -54Kg", medal: "🥇" },
      { name: "MURUGAN VARSHNI", club: "PKDKULAI", category: "Cadet Female Individual Kumite  -61Kg", medal: "🥇" },
      { name: "RAMU YUGAKAALI", club: "KARATE SPEED POWER WPKL", category: "Cadet Female Individual Kumite -47kg", medal: "🥇" },
      { name: "GUNASEGRAN YUGENDEVAN", club: "GOJU-KAI", category: "Cadet Male Individual Kata", medal: "🥇" },
      { name: "SENTHILNATHAN NIROSHAN", club: "PKDKULAI", category: "Cadet Male Individual Kumite +70kg", medal: "🥇" },
      { name: "RAGAVAN OMNESH VASHAN", club: "HAYASHI-HA", category: "Cadet Male Individual Kumite -52kg G1", medal: "🥇" },
      { name: "GURUNAATH POOBALAN", club: "ITOSU-RYU", category: "Cadet Male Individual Kumite -52kg G2", medal: "🥇" },
      { name: "TUSHANTH SATHISH", club: "ITOSU-RYU", category: "Cadet Male Individual Kumite -57kg", medal: "🥇" },
      { name: "TATYA BAABA KUMARESAN", club: "ITOSU-RYU", category: "Cadet Male Individual Kumite -63kg", medal: "🥇" },
      { name: "SHARVES BALAKRISHNAN", club: "KKJK", category: "Cadet Male Individual Kumite -70kg", medal: "🥇" },
      { name: "MONISHA YAYADI", club: "PKNK", category: "FEMALE KUMITE U21 18 - 21 YRS +68KG", medal: "🥇" },
      { name: "RANEYA MOHAMED ZAMIR", club: "KARATE KELANTAN BARU", category: "FEMALE KUMITE U21 18 - 21 YRS -50KG", medal: "🥇" },
      { name: "PERAVISHAH NADARAJAN", club: "PKNK", category: "FEMALE KUMITE U21 18 - 21 YRS -55KG", medal: "🥇" },
      { name: "GHAYATHRI SURESH", club: "PKNK", category: "FEMALE KUMITE U21 18 - 21 YRS -61KG", medal: "🥇" },
      { name: "NARMATHAA SELVAKUMARAN", club: "PKNK", category: "FEMALE KUMITE U21 18 - 21 YRS -68KG", medal: "🥇" },
      { name: "OLUWAFIKAYO SUCCESS ATOYEBI BRIDGET", club: "TSKA", category: "GIRLS 10-11 YEARS INDIVIDUAL KUMITE -40 KG", medal: "🥇" },
      { name: "ITOSU RYU KARATE", club: "ITOSU-RYU", category: "GIRLS BELOW 11 YEARS OLD & U14 TEAM KATA", medal: "🥇" },
      { name: "SHANMUGANATHAN SAKTHIKA", club: "PKDKULAI", category: "GIRLS INDIVIDUAL KATA  10 -11 YEARS OLD", medal: "🥇" },
      { name: "MOHD FAIRUL SURI FATEEMA", club: "TSKA", category: "GIRLS INDIVIDUAL KATA 8 - 9 YEARS OLD", medal: "🥇" },
      { name: "SUGAKUMAR SHIVAANI", club: "GSRM", category: "GIRLS INDIVIDUAL KUMITE 10-11 YEARS +40KG G1", medal: "🥇" },
      { name: "AISHWARIYAH NANTHA KUMAR", club: "ITOSU-RYU", category: "GIRLS INDIVIDUAL KUMITE 10-11 YEARS +40KG G2", medal: "🥇" },
      { name: "LEENASHA KUMARI PURANCHAN LAL", club: "ITOSU-RYU", category: "GIRLS INDIVIDUAL KUMITE 5 YEARS OLD", medal: "🥇" },
      { name: "SORNAM TAMERRA SATHIA", club: "HOSHI RYU KL", category: "GIRLS INDIVIDUAL KUMITE 6-7 YEARS +25KG", medal: "🥇" },
      { name: "CHARVY LAXMI JEGESWARAN", club: "ITOSU-RYU", category: "GIRLS INDIVIDUAL KUMITE 8-9 YEARS +30KG", medal: "🥇" },
      { name: "ITOSU RYU KARATE", club: "ITOSU-RYU", category: "GIRLS TEAM KUMITE BELOW 11 YEARS", medal: "🥇" },
      { name: "PERSATUAN KARATE KELANTAN BARU- TEAM A", club: "KARATE KELANTAN BARU", category: "GIRLS U14 TEAM KUMITE", medal: "🥇" },
      { name: "KAYALVILY KHARTE", club: "KIBOKAN SEL", category: "Girls 10-11 Kumite -35kg", medal: "🥇" },
      { name: "MAHAGANAPATHY YUVIKA", club: "HAYASHI-HA", category: "JUNIOR FEMALE INDIVIDUAL KUMITE +59KG", medal: "🥇" },
      { name: "ITOSU RYU KARATE", club: "ITOSU-RYU", category: "JUNIOR FEMALE TEAM KUMITE", medal: "🥇" },
      { name: "SHOTOKAN HAYAIDESU KARATE", club: "SHK", category: "JUNIOR MALE TEAM KUMITE", medal: "🥇" },
      { name: "VADIVELOO VRITTIKHA", club: "GOJU-KAI", category: "Junior Female Individual Kata", medal: "🥇" },
      { name: "RAJASEKARAN JAY SHEERA", club: "HAYASHI-HA", category: "Junior Female Individual Kumite -48 kg", medal: "🥇" },
      { name: "THASHAH BALASUNTHRAM", club: "KARATE KELANTAN BARU", category: "Junior Female Individual Kumite -53 kg", medal: "🥇" },
      { name: "NUR ALEESYA BINTI NUAR RAZLAN", club: "ITOSU-RYU", category: "Junior Female Individual Kumite -59 kg", medal: "🥇" },
      { name: "DHIINESHSANKARANATH RAVINDRANATH", club: "ITOSU-RYU", category: "Junior Male Individual Kata", medal: "🥇" },
      { name: "SENTHILNATHAN SANJAY", club: "PKDKULAI", category: "Junior Male Individual Kumite +76 kg", medal: "🥇" },
      { name: "JEGATHISWARAN NAVANITHAN", club: "GOJU-KAI", category: "Junior Male Individual Kumite -55 kg", medal: "🥇" },
      { name: "YUMEN DRAN KASVIN", club: "GOJU-KAI", category: "Junior Male Individual Kumite -61 kg", medal: "🥇" },
      { name: "DHIINESHSANKARANATH RAVINDRANATH", club: "ITOSU-RYU", category: "Junior Male Individual Kumite -68 kg", medal: "🥇" },
      { name: "ARJUN KHANNA KHANNA MUREN", club: "PKNK", category: "Junior Male Individual Kumite -76 kg", medal: "🥇" },
      { name: "IMAN BIN MUHAMMAD FADHIL", club: "PKNK", category: "MALE KUMITE U21 +75KG", medal: "🥇" },
      { name: "TRISHAANTH TRISHAANTH", club: "GOJU-KAI", category: "MALE KUMITE U21 18 - 21 YRS -55KG", medal: "🥇" },
      { name: "THINAGARAJ ANANDAN", club: "PKNK", category: "MALE KUMITE U21 18 - 21 YRS -60KG", medal: "🥇" },
      { name: "KRISHNAN VELLU", club: "PKNK", category: "MALE KUMITE U21 18 - 21 YRS -67KG", medal: "🥇" },
      { name: "MUHAMMAD AMMAR BIN SIRAJUDEEN", club: "PKNK", category: "MALE KUMITE U21 18 - 21 YRS -75KG", medal: "🥇" },
      { name: "QAIREEN NASUHA DZULKARNAIN", club: "KARATE KELANTAN BARU", category: "U14 FEMALE INDIVIDUAL KATA", medal: "🥇" },
      { name: "LARANYA VASUTHEVAN", club: "JKBA", category: "U14 FEMALE INDIVIDUAL KUMITE +52KG", medal: "🥇" },
      { name: "SHARAANI SANGAR", club: "SHK", category: "U14 FEMALE INDIVIDUAL KUMITE -42KG", medal: "🥇" },
      { name: "MAHA SYAHIRAH KUPPAN MOHAN", club: "KARATE KELANTAN BARU", category: "U14 FEMALE INDIVIDUAL KUMITE -47KG", medal: "🥇" },
      { name: "DARRSHAH BALAMBGAI BALAMURUGAN", club: "JKBA", category: "U14 FEMALE INDIVIDUAL KUMITE -52KG", medal: "🥇" },
      { name: "YATESH LAL PUWAN LAL", club: "ITOSU-RYU", category: "U14 MALE INDIVIDUAL KATA", medal: "🥇" },
      { name: "THIRUCHELVAN BARTHY", club: "ITOSU-RYU", category: "U14 MALE INDIVIDUAL KUMITE +55KG", medal: "🥇" },
      { name: "ARIF KHAIRULLAH MOHD KHAIRUL ROSLAN", club: "KAPJ", category: "U14 MALE INDIVIDUAL KUMITE -40KG G1", medal: "🥇" },
      { name: "NITEESH ATHISIVAM", club: "JKBA", category: "U14 MALE INDIVIDUAL KUMITE -40KG G2", medal: "🥇" },
      { name: "MUHAMMAD NAZRI SAFWAN ARRIYAN", club: "HAYASHI-HA", category: "U14 MALE INDIVIDUAL KUMITE -45KG", medal: "🥇" },
      { name: "VARMAN SUJESH", club: "GOJU-KAI", category: "U14 MALE INDIVIDUAL KUMITE -50KG", medal: "🥇" },
      { name: "VARSHAN JAMES SIVAM BALAKRISHNAN", club: "ITOSU-RYU", category: "U14 MALE INDIVIDUAL KUMITE -55KG", medal: "🥇" }
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
  const [customTournaments, setCustomTournaments] = useState<PastTournament[]>([]);
  const [dbTournaments, setDbTournaments] = useState<PastTournament[]>([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const list = await db.tournaments.list();
        const pastList: PastTournament[] = list
          .filter(t => t.status === 'Completed' && !t.deleted_at)
          .map(t => {
            const yearVal = t.date_iso ? new Date(t.date_iso).getFullYear() : 2026;
            return {
              id: t.id,
              name: t.name,
              year: yearVal,
              date: t.date_iso ? t.date_iso.split('T')[0] : t.date,
              venue: t.venue,
              city: t.city,
              discipline: (t.discipline ? t.discipline.split(',').map(s => s.trim()) : ['Kata', 'Kumite']) as Discipline[],
              medals: {
                gold: t.medals_gold ?? 0,
                silver: t.medals_silver ?? 0,
                bronze: t.medals_bronze ?? 0
              },
              totalParticipants: t.total_participants ?? 0,
              totalClubs: t.total_clubs ?? 0,
              posterGradient: t.banner_gradient || 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)',
              posterEmoji: t.poster_emoji || '🏆',
              pdfUrl: t.pdf_url || '#',
              photos: [
                { id: `p-${t.id}-1`, caption: 'Opening Ceremony', gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
                { id: `p-${t.id}-2`, caption: 'Kumite Selections', gradient: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' }
              ],
              champions: []
            };
          });
        setDbTournaments(pastList);
      } catch (e) {
        console.error('Failed to load past tournaments from db:', e);
      }
    };

    fetchTournaments();

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ts_custom_past_tournaments');
      if (stored) {
        try {
          setCustomTournaments(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  const allTournaments = useMemo(() => {
    const combined = [...dbTournaments, ...customTournaments, ...PAST_TOURNAMENTS];
    const unique: PastTournament[] = [];
    const seen = new Set<string>();
    for (const t of combined) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }
    return unique;
  }, [dbTournaments, customTournaments]);

  const years = useMemo(
    () => [...new Set(allTournaments.map((t) => t.year))].sort((a, b) => b - a),
    [allTournaments]
  );

  const filtered = useMemo(() => {
    return allTournaments.filter((t) => {
      const yearMatch = searchYear ? t.year === parseInt(searchYear, 10) : true;
      const disciplineMatch =
        filterDiscipline === 'All' || t.discipline.includes(filterDiscipline);
      return yearMatch && disciplineMatch;
    });
  }, [searchYear, filterDiscipline, allTournaments]);

  const totalMedals = useMemo(
    () =>
      allTournaments.reduce(
        (acc, t) => ({
          gold: acc.gold + t.medals.gold,
          silver: acc.silver + t.medals.silver,
          bronze: acc.bronze + t.medals.bronze,
        }),
        { gold: 0, silver: 0, bronze: 0 }
      ),
    [allTournaments]
  );

  // Group tournaments by year
  const groupedByYear = useMemo(() => {
    const groups: Record<number, PastTournament[]> = {};
    filtered.forEach((t) => {
      if (!groups[t.year]) {
        groups[t.year] = [];
      }
      groups[t.year].push(t);
    });
    return groups;
  }, [filtered]);

  // Keep track of which years are expanded
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  // By default, expand all years
  useEffect(() => {
    if (years.length > 0 && Object.keys(expandedYears).length === 0) {
      const initial: Record<number, boolean> = {};
      years.forEach((y) => {
        initial[y] = true;
      });
      setExpandedYears(initial);
    }
  }, [years, expandedYears]);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  return (
    <div className="pt-page">
      {/* Floating Home button */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
        <Link
          href="/"
          prefetch={false}
          className="flex items-center gap-1.5 w-fit px-3 py-1.5 border border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:bg-gray-900/80 rounded-lg text-xs font-bold transition text-gray-300 hover:text-white cursor-pointer"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

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
              <span className="pt-hero__stat-value">{allTournaments.length}</span>
              <span className="pt-hero__stat-label">Tournaments</span>
            </div>
            <div className="pt-hero__stat-divider" />
            <div className="pt-hero__stat">
              <span className="pt-hero__stat-value">
                {allTournaments.reduce((a, t) => a + t.totalParticipants, 0)}
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

      {/* Tournament list grouped by Year Folder */}
      <section className="max-w-[1100px] mx-auto px-6 space-y-8 pb-12" aria-label="Past tournaments">
        {filtered.length === 0 ? (
          <div className="pt-empty">
            <Star size={40} className="pt-empty__icon" />
            <p>No tournaments found for the selected filters.</p>
          </div>
        ) : (
          years.map((year) => {
            const tourns = groupedByYear[year] || [];
            if (tourns.length === 0) return null;
            const isExpanded = expandedYears[year] !== false;

            return (
              <div key={year} className="bg-neutral-900/40 border border-gray-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Year Header Folder bar */}
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between p-4 bg-gray-900/60 hover:bg-gray-900/80 transition font-bold text-sm border-b border-gray-850 text-white cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📁</span>
                    <span className="tracking-wider uppercase text-xs font-black text-amber-500">Year {year} Tournaments</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                      {tourns.length} Tournament{tourns.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Tournament list inside the folder */}
                {isExpanded && (
                  <div className="p-5 space-y-6 bg-transparent">
                    {tourns.map((t) => (
                      <PastTournamentCard key={t.id} tournament={t} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Nav to upcoming */}
      <div className="pt-page__footer">
        <Link href="/public/tournaments" className="tournaments-back__link">
          <ArrowRight size={14} />
          View Upcoming Tournaments
        </Link>
      </div>

      {/* Public Footer */}
      <footer className="max-w-4xl mx-auto py-8 text-center text-xs text-slate-500 border-t border-white/5 mt-6 space-y-1">
        <div className="font-bold text-slate-400">© 2026 KarateTech</div>
        <div>Developed by <span className="font-semibold text-slate-350">SP Sport Data Solution</span></div>
        <div className="text-[11px] text-slate-500">Professional Karate Tournament Management System</div>
        <div className="text-[11px] text-slate-550">All Rights Reserved.</div>
      </footer>
    </div>
  );
}
