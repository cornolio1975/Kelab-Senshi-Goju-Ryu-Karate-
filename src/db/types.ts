export interface Country {
  code: string; // ISO Code e.g. MAS, SGP
  name: string;
  flag_emoji: string;
}

export interface Club {
  id: string;
  name: string;
  city?: string;
  state?: string;
  created_at?: string;
}

export interface Coach {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  club_id?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Mixed';
  min_age: number;
  max_age: number;
  min_weight: number;
  max_weight: number;
  capacity?: number;
  status: 'Open' | 'Closed' | 'Full';
  created_at?: string;
}

export interface Team {
  id: string;
  name: string;
  club_id: string;
  captain_id?: string;
  coach_id?: string;
  score: number;
  ranking?: number;
  created_at?: string;
}

export interface Participant {
  id: string;
  registration_no: string;
  photo_url?: string;
  full_name: string;
  gender: 'Male' | 'Female';
  dob: string; // YYYY-MM-DD
  nationality_code?: string;
  passport_ic: string;
  email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  club_id?: string;
  coach_id?: string;
  weight: number; // kg
  height: number; // cm
  status: 'Confirmed' | 'Pending' | 'Checked In' | 'Disqualified' | 'Cancelled';
  medical_status: 'Cleared' | 'Review Needed' | 'Action Required';
  payment_status: 'Paid' | 'Unpaid' | 'Pending';
  remarks?: string;
  created_at?: string;
  deleted_at?: string; // soft delete timestamp
}

export interface TeamMember {
  id: string;
  team_id: string;
  participant_id: string;
  joined_at?: string;
}

export interface ParticipantCategory {
  id: string;
  participant_id: string;
  category_id: string;
  manual_override: boolean;
  assigned_at?: string;
}

export interface Payment {
  id: string;
  participant_id: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Refunded' | 'Pending';
  payment_method?: string;
  transaction_id?: string;
  created_at?: string;
}

export interface MedicalRecord {
  id: string;
  participant_id: string;
  conditions?: string;
  allergies?: string;
  blood_type?: string;
  has_clearance: boolean;
  remarks?: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  participant_id: string;
  name: string; // e.g. "Passport Scan"
  doc_type: string; // "Identity" | "Medical" | "Waiver"
  file_url: string;
  uploaded_at?: string;
}

export interface ActivityLog {
  id: string;
  participant_id: string;
  operator_name: string;
  action: string;
  details?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_values?: any;
  new_values?: any;
  created_at?: string;
}

export interface Bout {
  id: string;
  category_id: string;
  bout_no: number;
  round_no: number;
  participant_a_id: string | null;
  participant_b_id: string | null;
  winner_id: string | null;
  score_a: number;
  score_b: number;
  status: 'Scheduled' | 'Running' | 'Completed' | 'Walkover';
  scheduled_time?: string;
  tatami?: string;
  created_at?: string;
  senshu_a?: boolean;
  senshu_b?: boolean;
  penalties_a?: string;
  penalties_b?: string;
  timer_seconds?: number;
  timer_active?: boolean;
}

export interface Official {
  id: string;
  name: string;
  role: 'Referee' | 'Judge' | 'Table Official' | 'Tatami Manager' | 'Coach';
  qualification: string;
  assigned_tatami?: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}


