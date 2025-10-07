// Test script to verify the test sync works with 10 cards
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = 'https://hcpubmtohdnlmcjixbnl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcHVibXRvaGRubG1jaml4Ym5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODIzOTYsImV4cCI6MjA3NDA1ODM5Nn0.Lh0ndJZe34B_2EoIBR0VDTG8GJ7dzB4M5OnIICz_PkA'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testSync10Cards() {
  console.log('🧪 Testing sync with 10 cards...\n')

  try {
    // Test the sync function with test-sync action
    const { data, error } = await supabase.functions.invoke('scrydex-sync?action=test-sync', {
      method: 'GET'
    })
    
    if (error) {
      console.error('❌ Test sync error:', error)
    } else {
      console.log('✅ Test sync response:', data)
      
      // Check if cards were actually stored
      const { data: cards, error: cardsError } = await supabase
        .from('pokemon_cards')
        .select('id, name, supertype, hp, rarity_code, expansion_sort_order')
        .limit(10)
      
      if (cardsError) {
        console.error('❌ Failed to fetch cards:', cardsError)
      } else {
        console.log(`\n📦 Found ${cards.length} cards in database:`)
        cards.forEach(card => {
          console.log(`  - ${card.name} (${card.id}) - HP: ${card.hp}, Rarity: ${card.rarity_code}`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSync10Cards()
