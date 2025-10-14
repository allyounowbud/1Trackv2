import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4YmJubCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU4NDgyMzk2LCJleHAiOjIwNzQwNTgzOTZ9.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCollectionView() {
  try {
    console.log('🔄 Fixing collection view...');
    
    // Drop and recreate the collection_summary_clean view
    const dropViewSQL = 'DROP VIEW IF EXISTS collection_summary_clean;';
    const createViewSQL = `
      CREATE VIEW collection_summary_clean AS
      SELECT 
        -- Item identification
        COALESCE(
          CASE 
            WHEN o.item_id IS NULL THEN o.api_card_name
            ELSE i.item_name 
          END,
          'Unknown Item'
        ) as item_name,
        COALESCE(
          CASE 
            WHEN o.item_id IS NULL THEN o.api_card_set
            ELSE i.set_name 
          END,
          'Unknown Set'
        ) as set_name,
        COALESCE(
          CASE 
            WHEN o.item_id IS NULL THEN o.api_card_image_url
            ELSE i.image_url 
          END,
          '/icons/other.png'
        ) as image_url,
        
        -- NEW: Item classification fields
        o.item_type,
        o.card_condition,
        o.grading_company,
        o.grading_grade,
        
        -- Collection data
        o.order_group_id,
        SUM(o.quantity) as total_quantity,
        AVG(o.price_per_item_cents) as avg_price_cents,
        COALESCE(
          CASE 
            WHEN o.item_id IS NULL THEN o.api_card_market_value_cents
            ELSE i.market_value_cents 
          END,
          0
        ) as market_value_cents,
        MAX(o.purchase_date) as latest_order_date,
        COUNT(*) as order_count
        
      FROM orders o
      LEFT JOIN items i ON o.item_id = i.id
      WHERE o.user_id = auth.uid()
      GROUP BY 
        -- Group by item identification
        COALESCE(
          CASE 
            WHEN o.item_id IS NULL THEN o.api_card_name
            ELSE i.item_name 
          END,
          'Unknown Item'
        ),
        COALESCE(
          CASE 
            WHEN o.item_id IS NULL THEN o.api_card_set
            ELSE i.set_name 
          END,
          'Unknown Set'
        ),
        COALESCE(
          CASE 
            WHEN o.item_id IS NULL THEN o.api_card_image_url
            ELSE i.image_url 
          END,
          '/icons/other.png'
        ),
        
        -- Group by NEW classification fields
        o.item_type,
        o.card_condition,
        o.grading_company,
        o.grading_grade,
        
        -- Group by order group
        o.order_group_id;
    `;
    
    // Execute the SQL statements
    console.log('Dropping existing view...');
    await supabase.rpc('exec', { sql: dropViewSQL });
    
    console.log('Creating updated view...');
    await supabase.rpc('exec', { sql: createViewSQL });
    
    console.log('🎉 Collection view updated successfully!');
    
    // Test the view
    console.log('Testing the updated view...');
    const { data, error } = await supabase
      .from('collection_summary_clean')
      .select('item_name, item_type, card_condition')
      .limit(5);
    
    if (error) {
      console.error('Error testing view:', error);
    } else {
      console.log('✅ View test successful:', data);
    }
    
  } catch (error) {
    console.error('❌ Failed to fix collection view:', error);
  }
}

fixCollectionView();
