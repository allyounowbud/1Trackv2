import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4YmJubCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU4NDgyMzk2LCJleHAiOjIwNzQwNTgzOTZ9.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCollectionViews() {
  try {
    console.log('🔄 Updating collection views to include new fields...');
    
    // Read the SQL file
    const sql = fs.readFileSync('update-collection-view-with-new-fields.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 100) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' });
        if (error) {
          console.error('Error executing statement:', error);
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('🎉 Collection views updated successfully!');
    
  } catch (error) {
    console.error('❌ Failed to update collection views:', error);
  }
}

updateCollectionViews();
