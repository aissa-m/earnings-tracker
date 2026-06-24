import { createClient } from "@supabase/supabase-js";

export type Person = "Eva" | "Issa";
export type WorkType = "Labeling" | "Reviewing";

export type Entry = {
  id: string;
  person: Person;
  work_type: WorkType;
  project: string;
  project_id: string | null;
  amount: number;
  unit: "DR" | "hours";
  date: string;
  created_at: string;
};

export type Payment = {
  id: string;
  amount: number;
  issa_amount: number;
  eva_amount: number;
  date: string;
  note: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  supports_labeling: boolean;
  supports_reviewing: boolean;
  labeling_rate: number | null;
  reviewing_rate: number | null;
  is_active: boolean;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check .env.local.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
