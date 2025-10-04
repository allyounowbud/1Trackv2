import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
