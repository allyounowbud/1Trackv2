// Test page 34 to see if it has duplicates
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPage34() {
  try {
    console.log('🔍 Testing page 34 to see if it has duplicates...');
    
    // Test pages 32, 33, 34, 35 to see the transition
    const testPages = [32, 33, 34, 35];
    
    for (const page of testPages) {
      console.log(`\n📊 Testing page ${page}...`);
      
      try {
        // Get cards from API
        const { data: apiData } = await supabase.functions.invoke(`scrydex-api/all-cards?page=${page}&pageSize=250`, {
          method: 'GET'
        });
        
        if (!apiData.data || apiData.data.length === 0) {
          console.log(`❌ No cards returned from page ${page}`);
          continue;
        }
        
        const cardIds = apiData.data.map(card => card.id);
        console.log(`📦 API returned ${cardIds.length} cards`);
        console.log(`📝 Sample IDs: ${cardIds.slice(0, 3).join(', ')}`);
        
        // Check which ones exist in database
        const { data: existingCards } = await supabase
          .from('pokemon_cards')
          .select('id')
          .in('id', cardIds);
        
        const existingIds = existingCards?.map(card => card.id) || [];
        const newCards = cardIds.filter(id => !existingIds.includes(id));
        
        console.log(`✅ Found ${existingIds.length} existing cards`);
        console.log(`🆕 Found ${newCards.length} new cards`);
        
        if (existingIds.length === 250) {
          console.log(`🔄 Page ${page}: ALL DUPLICATES - already processed`);
        } else if (newCards.length === 250) {
          console.log(`🆕 Page ${page}: ALL NEW CARDS - not processed yet`);
        } else {
          console.log(`⚠️ Page ${page}: MIXED - some duplicates, some new`);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error testing page ${page}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testPage34();

