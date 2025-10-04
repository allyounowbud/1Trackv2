import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MjM5NiwiZXhwIjoyMDc0MDU4Mzk2fQ.7OGDbbb_EeNTfd9EuqqGGh5hxZGbuH11cVMOnVdF3Gw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔧 Fixing card_prices table constraint...');
console.log('==========================================');

async function fixCardPricesConstraint() {
  try {
    console.log('📝 Adding unique constraint on card_id...');
    
    // Add unique constraint on card_id
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE card_prices ADD CONSTRAINT card_prices_card_id_unique UNIQUE (card_id);'
    });
    
    if (error) {
      console.log('⚠️ RPC method not available, trying direct SQL...');
      
      // If RPC doesn't work, we'll need to run this SQL manually in Supabase dashboard
      console.log('📋 Please run this SQL in your Supabase dashboard:');
      console.log('');
      console.log('ALTER TABLE card_prices ADD CONSTRAINT card_prices_card_id_unique UNIQUE (card_id);');
      console.log('');
      console.log('Then run the pricing extraction again.');
      return false;
    }
    
    console.log('✅ Unique constraint added successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to add constraint:', error.message);
    return false;
  }
}

async function main() {
  try {
    const success = await fixCardPricesConstraint();
    
    if (success) {
      console.log('');
      console.log('🎉 Database constraint fixed successfully!');
      console.log('✅ You can now run the pricing extraction again');
    } else {
      console.log('');
      console.log('⚠️ Please add the unique constraint manually in Supabase dashboard');
    }
    
  } catch (error) {
    console.error('❌ Constraint fix failed:', error.message);
    process.exit(1);
  }
}

main();
