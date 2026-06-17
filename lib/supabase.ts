import { createClient } from "@supabase/supabase-js";

export type Entry = {
  id: string;
  person: "Eva" | "Issa";
  work_type: "Labeling" | "Reviewing";
  project: "Localized" | "DenseFusion" | "Textualization";
  amount: number;
  unit: "DR" | "hours";
  date: string;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check .env.local.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
