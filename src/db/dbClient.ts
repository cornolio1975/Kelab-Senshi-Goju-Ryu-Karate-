import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mockStore } from './mockStore';
import { 
  Country, Club, Coach, Category, Team, Participant, 
  TeamMember, ParticipantCategory, Payment, MedicalRecord, Document, ActivityLog, AuditLog, Bout, Official
} from './types';

// Read Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

export const basePath = process.env.NODE_ENV === 'production' ? '/Kelab-Senshi-Goju-Ryu-Karate-' : '';

// Global DB client interface
export const db = {
  isSupabase: (): boolean => !!supabase,

  // 1. Countries
  countries: {
    list: async (): Promise<Country[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('countries').select('*');
        if (error) throw error;
        return data || [];
      }
      return mockStore.countries.list();
    }
  },

  // 2. Clubs
  clubs: {
    list: async (): Promise<Club[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('clubs').select('*').order('name');
        if (error) throw error;
        return data || [];
      }
      return mockStore.clubs.list();
    },
    add: async (club: Omit<Club, 'id'>): Promise<Club> => {
      if (supabase) {
        const { data, error } = await supabase.from('clubs').insert([club]).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.clubs.add(club);
    },
    update: async (id: string, updates: Partial<Club>): Promise<Club> => {
      if (supabase) {
        const { data, error } = await supabase.from('clubs').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.clubs.update(id, updates);
    },
    delete: async (id: string): Promise<void> => {
      if (supabase) {
        const { error } = await supabase.from('clubs').delete().eq('id', id);
        if (error) throw error;
        return;
      }
      return mockStore.clubs.delete(id);
    }
  },

  // 3. Coaches
  coaches: {
    list: async (): Promise<Coach[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('coaches').select('*').order('name');
        if (error) throw error;
        return data || [];
      }
      return mockStore.coaches.list();
    },
    add: async (coach: Omit<Coach, 'id'>): Promise<Coach> => {
      if (supabase) {
        const { data, error } = await supabase.from('coaches').insert([coach]).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.coaches.add(coach);
    }
  },

  // 4. Categories
  categories: {
    list: async (): Promise<Category[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (error) throw error;
        return data || [];
      }
      return mockStore.categories.list();
    },
    update: async (id: string, updates: Partial<Category>): Promise<Category> => {
      if (supabase) {
        const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.categories.update(id, updates);
    },
    add: async (cat: Omit<Category, 'id'>): Promise<Category> => {
      if (supabase) {
        const { data, error } = await supabase.from('categories').insert([cat]).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.categories.add(cat);
    },
    merge: async (catIds: string[], mergedName: string): Promise<Category> => {
      if (supabase) {
        // Run SQL transaction equivalent or fall back to client operations for simplicity
        // For Supabase, we would call a custom RPC function:
        // const { data, error } = await supabase.rpc('merge_categories', { cat_ids: catIds, merged_name: mergedName });
        // Instead, let's implement the logic on client for dual compatibility:
        const list = await db.categories.list();
        const selected = list.filter(c => catIds.includes(c.id));
        if (selected.length < 2) throw new Error('Need at least 2 categories to merge');
        const minAge = Math.min(...selected.map(s => s.min_age));
        const maxAge = Math.max(...selected.map(s => s.max_age));
        const minWeight = Math.min(...selected.map(s => s.min_weight));
        const maxWeight = Math.max(...selected.map(s => s.max_weight));
        const gender = selected[0].gender;

        const mergedCat = await db.categories.add({
          name: mergedName,
          gender,
          min_age: minAge,
          max_age: maxAge,
          min_weight: minWeight,
          max_weight: maxWeight,
          capacity: 32,
          status: 'Open'
        });

        // Reassign mapping
        const { error: mappingErr } = await supabase
          .from('participant_categories')
          .update({ category_id: mergedCat.id })
          .in('category_id', catIds);
        if (mappingErr) throw mappingErr;

        // Close old categories
        const { error: closeErr } = await supabase
          .from('categories')
          .update({ status: 'Closed' })
          .in('id', catIds);
        if (closeErr) throw closeErr;

        return mergedCat;
      }
      return mockStore.categories.merge(catIds, mergedName);
    },
    split: async (catId: string, split1: Omit<Category, 'id' | 'status'>, split2: Omit<Category, 'id' | 'status'>): Promise<[Category, Category]> => {
      if (supabase) {
        const cat1 = await db.categories.add({ ...split1, status: 'Open' });
        const cat2 = await db.categories.add({ ...split2, status: 'Open' });

        // Redistribute participants based on age/weight
        const participants = await db.participants.list();
        const { data: mappings, error: mapErr } = await supabase
          .from('participant_categories')
          .select('*')
          .eq('category_id', catId);
        
        if (mapErr) throw mapErr;

        for (const m of (mappings || [])) {
          const p = participants.find(part => part.id === m.participant_id);
          if (p) {
            const age = mockStore.helpers.calculateAge(p.dob);
            const matchesCat1 = age >= cat1.min_age && age <= cat1.max_age && p.weight >= cat1.min_weight && p.weight <= cat1.max_weight;
            const targetCatId = matchesCat1 ? cat1.id : cat2.id;
            
            await supabase
              .from('participant_categories')
              .update({ category_id: targetCatId })
              .eq('id', m.id);
          }
        }

        // Close original category
        await supabase.from('categories').update({ status: 'Closed' }).eq('id', catId);
        return [cat1, cat2];
      }
      return mockStore.categories.split(catId, split1, split2);
    },
    delete: async (id: string): Promise<void> => {
      if (supabase) {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        return;
      }
      return mockStore.categories.delete(id);
    }
  },

  // 5. Teams
  teams: {
    list: async (): Promise<Team[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('teams').select('*').order('name');
        if (error) throw error;
        return data || [];
      }
      return mockStore.teams.list();
    },
    get: async (id: string): Promise<Team | undefined> => {
      if (supabase) {
        const { data, error } = await supabase.from('teams').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
      }
      return mockStore.teams.get(id);
    },
    add: async (team: Omit<Team, 'id' | 'score'>): Promise<Team> => {
      if (supabase) {
        const { data, error } = await supabase.from('teams').insert([team]).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.teams.add(team);
    },
    update: async (id: string, updates: Partial<Team>): Promise<Team> => {
      if (supabase) {
        const { data, error } = await supabase.from('teams').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.teams.update(id, updates);
    },
    members: async (teamId: string): Promise<Participant[]> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('team_members')
          .select('participant_id')
          .eq('team_id', teamId);
        if (error) throw error;
        
        const participantIds = (data || []).map(d => d.participant_id);
        if (participantIds.length === 0) return [];

        const { data: members, error: memError } = await supabase
          .from('participants')
          .select('*')
          .in('id', participantIds)
          .is('deleted_at', null);
        if (memError) throw memError;
        return members || [];
      }
      return mockStore.teams.members(teamId);
    },
    addMember: async (teamId: string, participantId: string): Promise<TeamMember> => {
      if (supabase) {
        const team = await db.teams.get(teamId);
        const participant = await db.participants.get(participantId);
        if (!team || !participant) throw new Error('Team or Participant not found');
        if (participant.club_id !== team.club_id) {
          throw new Error('Verification failed: Participant must belong to the same club as the team.');
        }

        const { data, error } = await supabase
          .from('team_members')
          .insert([{ team_id: teamId, participant_id: participantId }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      return mockStore.teams.addMember(teamId, participantId);
    },
    removeMember: async (teamId: string, participantId: string): Promise<void> => {
      if (supabase) {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('participant_id', participantId);
        if (error) throw error;
        return;
      }
      return mockStore.teams.removeMember(teamId, participantId);
    },
    delete: async (id: string): Promise<void> => {
      if (supabase) {
        const { error } = await supabase.from('teams').delete().eq('id', id);
        if (error) throw error;
        return;
      }
      // No-op for mock store (Supabase always connected in production)
      return;
    }
  },

  // 5b. Participant Categories Mappings
  participantCategories: {
    list: async (): Promise<ParticipantCategory[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('participant_categories').select('*');
        if (error) throw error;
        return data || [];
      }
      return mockStore.participantCategories.list();
    }
  },

  // 6. Participants
  participants: {
    list: async (): Promise<Participant[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('participants').select('*').is('deleted_at', null).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return mockStore.participants.list();
    },
    listDeleted: async (): Promise<Participant[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('participants').select('*').not('deleted_at', 'is', null).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return mockStore.participants.listDeleted();
    },
    get: async (id: string): Promise<Participant | undefined> => {
      if (supabase) {
        const { data, error } = await supabase.from('participants').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
      }
      return mockStore.participants.get(id);
    },
    add: async (participant: Omit<Participant, 'id' | 'registration_no' | 'created_at'>): Promise<Participant> => {
      if (supabase) {
        const regNo = `REG-2026-${Math.floor(100 + Math.random() * 900)}`;
        const { data, error } = await supabase
          .from('participants')
          .insert([{ ...participant, registration_no: regNo }])
          .select()
          .single();
        if (error) throw error;

        // Auto assign category in Supabase
        const p = data as Participant;
        const cat = await db.participants.autoAssignCategory(p);

        // Logs
        await db.activityLogs.log(p.id, 'System', 'Registration Created', `Participant ${p.full_name} registered successfully`);
        return p;
      }
      return mockStore.participants.add(participant);
    },
    update: async (id: string, updates: Partial<Participant>, operator = 'Admin'): Promise<Participant> => {
      if (supabase) {
        const original = await db.participants.get(id);
        const { data, error } = await supabase
          .from('participants')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        const p = data as Participant;

        // Auto re-assign category if criteria changed
        if (updates.dob || updates.weight || updates.gender) {
          await db.participants.autoAssignCategory(p);
        }

        await db.activityLogs.log(id, operator, 'Details Edited', 'Personal details updated');
        await db.audit.log(operator, 'UPDATE', 'participants', id, original, p);
        return p;
      }
      return mockStore.participants.update(id, updates, operator);
    },
    delete: async (id: string, operator = 'Admin'): Promise<void> => {
      if (supabase) {
        const original = await db.participants.get(id);
        const { error } = await supabase
          .from('participants')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;

        await db.activityLogs.log(id, operator, 'Soft Deleted', 'Participant soft-deleted from active list');
        await db.audit.log(operator, 'DELETE', 'participants', id, original, null);
        return;
      }
      return mockStore.participants.delete(id, operator);
    },
    restore: async (id: string, operator = 'Admin'): Promise<Participant> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('participants')
          .update({ deleted_at: null })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;

        await db.activityLogs.log(id, operator, 'Restored', 'Participant restored from bin');
        await db.audit.log(operator, 'INSERT', 'participants', id, null, data);
        return data;
      }
      return mockStore.participants.restore(id, operator);
    },
    autoAssignCategory: async (p: Participant): Promise<Category | null> => {
      if (supabase) {
        const categories = await db.categories.list();
        const age = mockStore.helpers.calculateAge(p.dob);
        const matched = categories.find(c => {
          return (
            c.gender === p.gender &&
            age >= c.min_age && age <= c.max_age &&
            p.weight >= c.min_weight && p.weight <= c.max_weight &&
            c.status !== 'Closed'
          );
        });

        if (matched) {
          // Remove old mapping
          await supabase.from('participant_categories').delete().eq('participant_id', p.id);
          // Insert new mapping
          await supabase.from('participant_categories').insert([{
            participant_id: p.id,
            category_id: matched.id,
            manual_override: false
          }]);
          return matched;
        }
        return null;
      }
      return mockStore.participants.autoAssignCategory(p);
    },
    assignCategoryManually: async (participantId: string, categoryId: string, operator = 'Admin'): Promise<void> => {
      if (supabase) {
        // Delete previous mappings
        await supabase.from('participant_categories').delete().eq('participant_id', participantId);
        // Insert custom mapping
        await supabase.from('participant_categories').insert([{
          participant_id: participantId,
          category_id: categoryId,
          manual_override: true
        }]);

        const cat = (await db.categories.list()).find(c => c.id === categoryId);
        await db.activityLogs.log(participantId, operator, 'Category Moved (Manual)', `Moved category manually to: ${cat ? cat.name : 'Custom Category'}`);
        return;
      }
      return mockStore.participants.assignCategoryManually(participantId, categoryId, operator);
    },
    getAssignedCategory: async (participantId: string): Promise<Category | undefined> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('participant_categories')
          .select('category_id')
          .eq('participant_id', participantId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return undefined;

        const categories = await db.categories.list();
        return categories.find(c => c.id === data.category_id);
      }
      return mockStore.participants.getAssignedCategory(participantId);
    }
  },

  // 7. Payments
  payments: {
    list: async (): Promise<Payment[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('payments').select('*');
        if (error) throw error;
        return data || [];
      }
      return mockStore.payments.list();
    },
    create: async (participantId: string, pay: Partial<Payment>): Promise<Payment> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('payments')
          .insert([{ participant_id: participantId, amount: pay.amount || 150, status: pay.status || 'Unpaid', payment_method: pay.payment_method }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      return mockStore.payments.create(participantId, pay);
    },
    update: async (id: string, updates: Partial<Payment>): Promise<Payment> => {
      if (supabase) {
        const { data, error } = await supabase.from('payments').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.payments.update(id, updates);
    }
  },

  // 8. Medical Records
  medical: {
    get: async (participantId: string): Promise<MedicalRecord | undefined> => {
      if (supabase) {
        const { data, error } = await supabase.from('medical_records').select('*').eq('participant_id', participantId).maybeSingle();
        if (error) throw error;
        return data || undefined;
      }
      return mockStore.medical.get(participantId);
    },
    create: async (participantId: string, med: Partial<MedicalRecord>): Promise<MedicalRecord> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('medical_records')
          .insert([{ participant_id: participantId, conditions: med.conditions || 'None', allergies: med.allergies || 'None', blood_type: med.blood_type || 'O+', has_clearance: med.has_clearance }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      return mockStore.medical.create(participantId, med);
    },
    update: async (id: string, updates: Partial<MedicalRecord>): Promise<MedicalRecord> => {
      if (supabase) {
        const { data, error } = await supabase.from('medical_records').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.medical.update(id, updates);
    }
  },

  // 9. Documents
  documents: {
    list: async (participantId: string): Promise<Document[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('documents').select('*').eq('participant_id', participantId);
        if (error) throw error;
        return data || [];
      }
      return mockStore.documents.list(participantId);
    },
    upload: async (participantId: string, name: string, docType: string, fileUrl: string): Promise<Document> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('documents')
          .insert([{ participant_id: participantId, name, doc_type: docType, file_url: fileUrl }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      return mockStore.documents.upload(participantId, name, docType, fileUrl);
    },
    delete: async (id: string): Promise<void> => {
      if (supabase) {
        const { error } = await supabase.from('documents').delete().eq('id', id);
        if (error) throw error;
        return;
      }
      return mockStore.documents.delete(id);
    }
  },

  // 10. Activity Logs
  activityLogs: {
    list: async (participantId: string): Promise<ActivityLog[]> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('participant_id', participantId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return mockStore.activityLogs.list(participantId);
    },
    log: async (participantId: string, operatorName: string, action: string, details: string): Promise<ActivityLog> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('activity_logs')
          .insert([{ participant_id: participantId, operator_name: operatorName, action, details }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      return mockStore.activityLogs.log(participantId, operatorName, action, details);
    }
  },

  // 11. Audit Logs
  audit: {
    list: async (): Promise<AuditLog[]> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
      return mockStore.audit.list();
    },
    log: async (operator: string, action: 'INSERT' | 'UPDATE' | 'DELETE', tableName: string, recordId: string, oldValues: any, newValues: any): Promise<AuditLog> => {
      if (supabase) {
        const { data, error } = await supabase
          .from('audit_logs')
          .insert([{ 
            user_email: operator, 
            action, 
            table_name: tableName, 
            record_id: recordId, 
            old_values: oldValues, 
            new_values: newValues 
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      return mockStore.audit.log(operator, action, tableName, recordId, oldValues, newValues);
    }
  },

  // 12. Bouts & Brackets
  bouts: {
    list: async (): Promise<Bout[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('bouts').select('*');
        if (error) throw error;
        return data || [];
      }
      return mockStore.bouts.list();
    },
    listForCategory: async (catId: string): Promise<Bout[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('bouts').select('*').eq('category_id', catId).order('bout_no');
        if (error) throw error;
        return data || [];
      }
      return mockStore.bouts.listForCategory(catId);
    },
    clearDraw: async (catId: string): Promise<void> => {
      if (supabase) {
        const { error } = await supabase.from('bouts').delete().eq('category_id', catId);
        if (error) throw error;
        return;
      }
      return mockStore.bouts.clearDraw(catId);
    },
    generateDraw: async (catId: string, drawType: 'Elimination' | 'Round-robin', hasThirdPlace: boolean): Promise<Bout[]> => {
      console.log('[dbClient.generateDraw] catId:', catId, 'drawType:', drawType, 'hasThirdPlace:', hasThirdPlace, 'isSupabase:', !!supabase);
      if (supabase) {
        // Fetch active mappings from Supabase
        const { data: mappings, error: mapErr } = await supabase
          .from('participant_categories')
          .select('participant_id')
          .eq('category_id', catId);
        if (mapErr) throw mapErr;

        console.log('[dbClient.generateDraw] Supabase mappings fetched count:', mappings?.length || 0);
        const participantIds = (mappings || []).map(m => m.participant_id);
        let athletes: Participant[] = [];
        if (participantIds.length > 0) {
          const { data: partData, error: partErr } = await supabase
            .from('participants')
            .select('*')
            .in('id', participantIds)
            .is('deleted_at', null)
            .neq('status', 'Cancelled');
          if (partErr) throw partErr;
          athletes = partData || [];
        }

        console.log('[dbClient.generateDraw] Supabase active athletes count:', athletes.length);
        const generated = mockStore.bouts.generateDraw(catId, drawType, hasThirdPlace, athletes);
        
        // Remove the 'id' field so Supabase can generate proper UUIDs
        const generatedWithoutId = generated.map(({ id, ...rest }) => rest);

        await supabase.from('bouts').delete().eq('category_id', catId);
        const { data, error } = await supabase.from('bouts').insert(generatedWithoutId).select();
        if (error) throw error;

        const savedBouts = data || [];
        // Sync local storage / mockStore cache
        mockStore.bouts.saveBouts(catId, savedBouts);
        return savedBouts;
      }
      return mockStore.bouts.generateDraw(catId, drawType, hasThirdPlace);
    },
    updateBoutResult: async (boutId: string, winnerId: string, scoreA: number, scoreB: number): Promise<Bout> => {
      if (supabase) {
        const localUpdated = mockStore.bouts.updateBoutResult(boutId, winnerId, scoreA, scoreB);
        const { data, error } = await supabase.from('bouts').update({
          winner_id: winnerId,
          score_a: scoreA,
          score_b: scoreB,
          status: 'Completed'
        }).eq('id', boutId).select().single();
        
        const list = mockStore.bouts.list();
        const bout = list.find(b => b.id === boutId);
        if (bout && bout.round_no !== 99 && bout.round_no < 5) {
          const nextRoundNo = bout.round_no + 1;
          const nextBoutNo = Math.ceil(bout.bout_no / 2);
          const nextBout = list.find(b => b.category_id === bout.category_id && b.round_no === nextRoundNo && b.bout_no === nextBoutNo);
          if (nextBout) {
            await supabase.from('bouts').update({
              participant_a_id: nextBout.participant_a_id,
              participant_b_id: nextBout.participant_b_id
            }).eq('id', nextBout.id);
          }
        }

        if (error) throw error;
        return data;
      }
      return mockStore.bouts.updateBoutResult(boutId, winnerId, scoreA, scoreB);
    },
    updateBoutState: async (id: string, updates: Partial<Bout>): Promise<Bout> => {
      if (supabase) {
        const { data, error } = await supabase.from('bouts').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.bouts.updateBoutState(id, updates);
    }
  },

  // 13. Officials
  officials: {
    list: async (): Promise<Official[]> => {
      if (supabase) {
        const { data, error } = await supabase.from('officials').select('*');
        if (error) throw error;
        return data || [];
      }
      return mockStore.officials.list();
    },
    add: async (off: Omit<Official, 'id'>): Promise<Official> => {
      if (supabase) {
        const { data, error } = await supabase.from('officials').insert([off]).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.officials.add(off);
    },
    update: async (id: string, updates: Partial<Official>): Promise<Official> => {
      if (supabase) {
        const { data, error } = await supabase.from('officials').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      return mockStore.officials.update(id, updates);
    },
    delete: async (id: string): Promise<void> => {
      if (supabase) {
        const { error } = await supabase.from('officials').delete().eq('id', id);
        if (error) throw error;
        return;
      }
      return mockStore.officials.delete(id);
    }
  }
};
