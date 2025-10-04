import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔧 Adding variants column to pokemon_cards table...');
console.log('==================================================');

async function addVariantsColumn() {
  try {
    console.log('📝 Adding variants column...');
    
    // Add the variants column to store the full variants data
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS variants JSONB;'
    });
    
    if (error) {
      console.log('⚠️ RPC method not available, trying direct SQL...');
      
      // If RPC doesn't work, we'll need to run this SQL manually in Supabase dashboard
      console.log('📋 Please run this SQL in your Supabase dashboard:');
      console.log('');
      console.log('ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS variants JSONB;');
      console.log('');
      console.log('Then run this script again.');
      return false;
    }
    
    console.log('✅ Variants column added successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to add variants column:', error.message);
    return false;
  }
}

async function main() {
  try {
    const success = await addVariantsColumn();
    
    if (success) {
      console.log('');
      console.log('🎉 Database schema updated successfully!');
      console.log('✅ You can now run the fetch script again to store variants data');
    } else {
      console.log('');
      console.log('⚠️ Please add the variants column manually in Supabase dashboard');
    }
    
  } catch (error) {
    console.error('❌ Schema update failed:', error.message);
    process.exit(1);
  }
}

main();
