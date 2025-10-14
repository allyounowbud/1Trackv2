const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkItemsTable() {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select('id, name, set_name, source, created_at')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Items in items table:');
    items.forEach(item => {
      console.log(`- ${item.name} (${item.set_name}) - Source: ${item.source || 'null'} - Created: ${item.created_at}`);
    });
    
    const apiItems = items.filter(item => item.source === 'api');
    const customItems = items.filter(item => item.source !== 'api');
    
    console.log(`\nTotal items: ${items.length}`);
    console.log(`API-sourced items: ${apiItems.length}`);
    console.log(`Custom items: ${customItems.length}`);
    
    if (apiItems.length > 0) {
      console.log('\nAPI-sourced items that should be removed:');
      apiItems.forEach(item => {
        console.log(`- ${item.name} (${item.set_name})`);
      });
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkItemsTable();
