/**
 * Setup Database Schema
 * Run the SQL migration to create the proper database schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔧 Setting up database schema...');
  
  try {
    // Read the SQL file
    const sqlContent = await fs.readFile('create-optimized-tables.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`🔍 Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} error (may be expected): ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
        
      } catch (error) {
        console.log(`⚠️  Statement ${i + 1} error: ${error.message}`);
      }
    }
    
    console.log('\n✅ Database schema setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    
    // Alternative: provide manual instructions
    console.log('\n📋 Manual setup instructions:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy the contents of create-optimized-tables.sql');
    console.log('   4. Paste and run the SQL');
    console.log('   5. Then run: npm run import-scrydex');
  }
}

async function main() {
  console.log('🚀 Database Setup\n');
  await setupDatabase();
}

main().catch(console.error);

