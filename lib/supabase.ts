import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Player = {
  id: number;
  name: string;
  birth_date?: string | null;
  position?: string | null;
  transfermarkt?: string | null;
  notes?: string | null;
  video?: string[] | null;
  created_at: string;
};

export type Transaction = {
  id: number;
  player_id: number;
  type: 'Ingreso' | 'Gasto';
  description: string | null;
  date: string;
  amount: number;
  usd_rate: number | null;
  currency: 'ARS' | 'USD';
  created_at: string;
  players?: Player | null;
};

export type FixedTransaction = {
  id: number;
  player_id: number;
  type: 'Ingreso' | 'Gasto';
  description: string | null;
  amount: number;
  currency: 'ARS' | 'USD';
  created_at: string;
};

export type DocumentItem = {
  id: number;
  player_id: number;
  name: string;
  url: string;
  supabase_path: string;
  created_at: string;
};
