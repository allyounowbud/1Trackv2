#!/usr/bin/env node

/**
 * Add Sample Data Script
 * Adds some sample Pokemon cards and expansions to test the system
 */

console.log('🎮 Adding Sample Pokemon Data...');
console.log('================================');

const sampleExpansions = [
  {
    id: 'base-set',
    name: 'Base Set',
    series: 'Base',
    code: 'BS',
    total: 102,
    printed_total: 102,
    language: 'en',
    language_code: 'en',
    release_date: '1999-01-09',
    is_online_only: false,
    logo_url: 'https://images.pokemontcg.io/base1/logo.png',
    symbol_url: 'https://images.pokemontcg.io/base1/symbol.png'
  },
  {
    id: 'jungle',
    name: 'Jungle',
    series: 'Base',
    code: 'JU',
    total: 64,
    printed_total: 64,
    language: 'en',
    language_code: 'en',
    release_date: '1999-06-16',
    is_online_only: false,
    logo_url: 'https://images.pokemontcg.io/jungle/logo.png',
    symbol_url: 'https://images.pokemontcg.io/jungle/symbol.png'
  },
  {
    id: 'fossil',
    name: 'Fossil',
    series: 'Base',
    code: 'FO',
    total: 62,
    printed_total: 62,
    language: 'en',
    language_code: 'en',
    release_date: '1999-10-10',
    is_online_only: false,
    logo_url: 'https://images.pokemontcg.io/fossil/logo.png',
    symbol_url: 'https://images.pokemontcg.io/fossil/symbol.png'
  }
];

const sampleCards = [
  {
    id: 'base-set-4',
    name: 'Charizard',
    supertype: 'Pokémon',
    types: ['Fire'],
    subtypes: ['Stage 2'],
    hp: 120,
    number: '4',
    rarity: 'Rare Holo',
    expansion_id: 'base-set',
    expansion_name: 'Base Set',
    image_url: 'https://images.pokemontcg.io/base1/4.png',
    image_url_large: 'https://images.pokemontcg.io/base1/4_hires.png',
    abilities: null,
    attacks: [
      {
        name: 'Fire Spin',
        cost: ['Fire', 'Fire', 'Fire', 'Fire'],
        convertedEnergyCost: 4,
        damage: '100',
        text: 'Discard 2 Energy cards attached to Charizard in order to use this attack.'
      }
    ],
    weaknesses: [{ type: 'Water', value: '×2' }],
    resistances: [{ type: 'Fighting', value: '-30' }],
    retreat_cost: ['Colorless', 'Colorless', 'Colorless'],
    converted_retreat_cost: 3,
    artist: 'Mitsuhiro Arita',
    flavor_text: 'Spits fire that is hot enough to melt boulders. Known to cause forest fires unintentionally.',
    regulation_mark: null,
    language: 'en',
    language_code: 'en',
    national_pokedex_numbers: [6],
    legalities: { unlimited: 'Legal' }
  },
  {
    id: 'base-set-25',
    name: 'Pikachu',
    supertype: 'Pokémon',
    types: ['Lightning'],
    subtypes: ['Basic'],
    hp: 40,
    number: '25',
    rarity: 'Common',
    expansion_id: 'base-set',
    expansion_name: 'Base Set',
    image_url: 'https://images.pokemontcg.io/base1/25.png',
    image_url_large: 'https://images.pokemontcg.io/base1/25_hires.png',
    abilities: null,
    attacks: [
      {
        name: 'Gnaw',
        cost: ['Colorless'],
        convertedEnergyCost: 1,
        damage: '10',
        text: ''
      },
      {
        name: 'Thunder Jolt',
        cost: ['Lightning', 'Lightning'],
        convertedEnergyCost: 2,
        damage: '30',
        text: 'Flip a coin. If tails, Pikachu does 10 damage to itself.'
      }
    ],
    weaknesses: [{ type: 'Fighting', value: '×2' }],
    resistances: null,
    retreat_cost: ['Colorless'],
    converted_retreat_cost: 1,
    artist: 'Mitsuhiro Arita',
    flavor_text: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.',
    regulation_mark: null,
    language: 'en',
    language_code: 'en',
    national_pokedex_numbers: [25],
    legalities: { unlimited: 'Legal' }
  },
  {
    id: 'base-set-58',
    name: 'Blastoise',
    supertype: 'Pokémon',
    types: ['Water'],
    subtypes: ['Stage 2'],
    hp: 100,
    number: '58',
    rarity: 'Rare Holo',
    expansion_id: 'base-set',
    expansion_name: 'Base Set',
    image_url: 'https://images.pokemontcg.io/base1/58.png',
    image_url_large: 'https://images.pokemontcg.io/base1/58_hires.png',
    abilities: null,
    attacks: [
      {
        name: 'Rain Dance',
        cost: ['Water'],
        convertedEnergyCost: 1,
        damage: '',
        text: 'As often as you like during your turn (before your attack), you may attach 1 Water Energy card to 1 of your Water Pokémon. (This doesn\'t use up your 1 Energy card attachment for the turn.)'
      },
      {
        name: 'Hydro Pump',
        cost: ['Water', 'Water', 'Water', 'Water'],
        convertedEnergyCost: 4,
        damage: '40+',
        text: 'Does 40 damage plus 10 more damage for each Water Energy attached to Blastoise but not used to pay for this attack\'s Energy cost. You can\'t add more than 20 damage in this way.'
      }
    ],
    weaknesses: [{ type: 'Lightning', value: '×2' }],
    resistances: null,
    retreat_cost: ['Colorless', 'Colorless', 'Colorless'],
    converted_retreat_cost: 3,
    artist: 'Mitsuhiro Arita',
    flavor_text: 'A brutal Pokémon with pressurized water jets on its shell. They are used for high speed tackles.',
    regulation_mark: null,
    language: 'en',
    language_code: 'en',
    national_pokedex_numbers: [9],
    legalities: { unlimited: 'Legal' }
  }
];

const samplePrices = [
  {
    card_id: 'base-set-4',
    market_price_usd: 150.00,
    market_price_eur: 135.00,
    market_price_gbp: 120.00,
    tcgplayer_price_usd: 145.00,
    tcgplayer_price_eur: 130.00,
    tcgplayer_price_gbp: 115.00,
    cardmarket_price_eur: 140.00,
    cardmarket_price_usd: 155.00,
    cardmarket_price_gbp: 125.00
  },
  {
    card_id: 'base-set-25',
    market_price_usd: 5.00,
    market_price_eur: 4.50,
    market_price_gbp: 4.00,
    tcgplayer_price_usd: 4.75,
    tcgplayer_price_eur: 4.25,
    tcgplayer_price_gbp: 3.75,
    cardmarket_price_eur: 4.80,
    cardmarket_price_usd: 5.25,
    cardmarket_price_gbp: 4.20
  },
  {
    card_id: 'base-set-58',
    market_price_usd: 80.00,
    market_price_eur: 72.00,
    market_price_gbp: 64.00,
    tcgplayer_price_usd: 78.00,
    tcgplayer_price_eur: 70.00,
    tcgplayer_price_gbp: 62.00,
    cardmarket_price_eur: 75.00,
    cardmarket_price_usd: 85.00,
    cardmarket_price_gbp: 68.00
  }
];

console.log('📋 SQL to add sample data:');
console.log('==========================');

console.log('-- Add sample expansions');
sampleExpansions.forEach(expansion => {
  console.log(`INSERT INTO pokemon_expansions (id, name, series, code, total, printed_total, language, language_code, release_date, is_online_only, logo_url, symbol_url, created_at, updated_at) VALUES ('${expansion.id}', '${expansion.name}', '${expansion.series}', '${expansion.code}', ${expansion.total}, ${expansion.printed_total}, '${expansion.language}', '${expansion.language_code}', '${expansion.release_date}', ${expansion.is_online_only}, '${expansion.logo_url}', '${expansion.symbol_url}', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;`);
});

console.log('\n-- Add sample cards');
sampleCards.forEach(card => {
  const types = `{${card.types.map(t => `"${t}"`).join(',')}}`;
  const subtypes = card.subtypes ? `{${card.subtypes.map(t => `"${t}"`).join(',')}}` : '{}';
  const retreatCost = card.retreat_cost ? `{${card.retreat_cost.map(t => `"${t}"`).join(',')}}` : '{}';
  const nationalPokedexNumbers = `{${card.national_pokedex_numbers.join(',')}}`;
  
  console.log(`INSERT INTO pokemon_cards (id, name, supertype, types, subtypes, hp, number, rarity, expansion_id, expansion_name, image_url, image_url_large, abilities, attacks, weaknesses, resistances, retreat_cost, converted_retreat_cost, artist, flavor_text, regulation_mark, language, language_code, national_pokedex_numbers, legalities, created_at, updated_at) VALUES ('${card.id}', '${card.name}', '${card.supertype}', '${types}', '${subtypes}', ${card.hp}, '${card.number}', '${card.rarity}', '${card.expansion_id}', '${card.expansion_name}', '${card.image_url}', '${card.image_url_large}', '${JSON.stringify(card.abilities)}', '${JSON.stringify(card.attacks)}', '${JSON.stringify(card.weaknesses)}', '${JSON.stringify(card.resistances)}', '${retreatCost}', ${card.converted_retreat_cost}, '${card.artist}', '${card.flavor_text}', '${card.regulation_mark}', '${card.language}', '${card.language_code}', '${nationalPokedexNumbers}', '${JSON.stringify(card.legalities)}', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;`);
});

console.log('\n-- Add sample prices');
samplePrices.forEach(price => {
  console.log(`INSERT INTO card_prices (card_id, market_price_usd, market_price_eur, market_price_gbp, tcgplayer_price_usd, tcgplayer_price_eur, tcgplayer_price_gbp, cardmarket_price_eur, cardmarket_price_usd, cardmarket_price_gbp, last_updated, created_at) VALUES ('${price.card_id}', ${price.market_price_usd}, ${price.market_price_eur}, ${price.market_price_gbp}, ${price.tcgplayer_price_usd}, ${price.tcgplayer_price_eur}, ${price.tcgplayer_price_gbp}, ${price.cardmarket_price_eur}, ${price.cardmarket_price_usd}, ${price.cardmarket_price_gbp}, NOW(), NOW()) ON CONFLICT (card_id) DO NOTHING;`);
});

console.log('\n-- Update sync status');
console.log(`UPDATE sync_status SET total_cards = ${sampleCards.length}, total_expansions = ${sampleExpansions.length}, last_full_sync = NOW(), updated_at = NOW() WHERE id = 1;`);

console.log('\n💡 Instructions:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the SQL above');
console.log('4. Click "Run" to execute');
console.log('');
console.log('🎯 After running the SQL:');
console.log('1. You\'ll have 3 sample expansions and 3 sample cards');
console.log('2. Your search page will show real data');
console.log('3. You can test the search functionality');
console.log('4. The sync status will show the correct counts');
console.log('');
console.log('✅ This will give you a working Pokemon card database to test with!');
