#!/usr/bin/env node

/**
 * Create the sync_status table manually
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSyncStatusTable() {
  console.log('🔧 Creating sync_status table...');
  
  try {
    // Create the sync_status table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS sync_status (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(255) UNIQUE NOT NULL,
          last_sync TIMESTAMP WITH TIME ZONE,
          record_count INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_sync_status_table_name ON sync_status(table_name);
        
        -- Create trigger for updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        DROP TRIGGER IF EXISTS update_sync_status_updated_at ON sync_status;
        CREATE TRIGGER update_sync_status_updated_at
          BEFORE UPDATE ON sync_status
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });

    if (error) {
      console.error('❌ Error creating sync_status table:', error);
      return false;
    }

    console.log('✅ sync_status table created successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error creating sync_status table:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating sync_status table...');
  
  const success = await createSyncStatusTable();
  
  if (success) {
    console.log('🎉 sync_status table created successfully!');
    console.log('💡 You can now run: npm run sync-scrydex');
  } else {
    console.log('❌ Failed to create sync_status table');
    process.exit(1);
  }
}

main();


