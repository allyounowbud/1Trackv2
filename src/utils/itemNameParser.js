/**
 * Utility functions for parsing item names to extract set and item information
 */

// Common Pokemon TCG set names/patterns
const SET_PATTERNS = [
  // Modern sets
  'Prismatic Evolutions',
  'Scarlet & Violet 151',
  'Crown Zenith',
  'Paldean Fates',
  'Obsidian Flames',
  'Lost Origin',
  'Astral Radiance',
  'Brilliant Stars',
  'Fusion Strike',
  'Evolving Skies',
  'Chilling Reign',
  'Battle Styles',
  'Shining Fates',
  'Vivid Voltage',
  'Darkness Ablaze',
  'Rebel Clash',
  'Sword & Shield',
  'Sun & Moon',
  'XY',
  'Black & White',
  'HeartGold & SoulSilver',
  'Platinum',
  'Diamond & Pearl',
  'EX',
  'Neo',
  'Gym',
  'Team Rocket',
  'Fossil',
  'Jungle',
  'Base',
  
  // Number-based sets
  '151',
  'Base Set',
  'Base Set 2',
  'Gym Heroes',
  'Gym Challenge',
  'Neo Genesis',
  'Neo Discovery',
  'Neo Destiny',
  'Neo Revelation',
  'Expedition',
  'Aquapolis',
  'Skyridge',
  'Ruby & Sapphire',
  'Sandstorm',
  'Dragon',
  'Team Magma vs Team Aqua',
  'Hidden Legends',
  'FireRed & LeafGreen',
  'Team Rocket Returns',
  'Deoxys',
  'Emerald',
  'Unseen Forces',
  'Delta Species',
  'Legend Maker',
  'Holon Phantoms',
  'Crystal Guardians',
  'Dragon Frontiers',
  'Power Keepers',
  'Diamond & Pearl',
  'Mysterious Treasures',
  'Secret Wonders',
  'Great Encounters',
  'Majestic Dawn',
  'Legends Awakened',
  'Stormfront',
  'Platinum',
  'Rising Rivals',
  'Supreme Victors',
  'Arceus',
  'HeartGold SoulSilver',
  'Unleashed',
  'Undaunted',
  'Triumphant',
  'Call of Legends',
  'Black & White',
  'Emerging Powers',
  'Noble Victories',
  'Next Destinies',
  'Dark Explorers',
  'Dragons Exalted',
  'Boundaries Crossed',
  'Plasma Storm',
  'Plasma Freeze',
  'Plasma Blast',
  'Legendary Treasures',
  'XY',
  'Flashfire',
  'Furious Fists',
  'Phantom Forces',
  'Primal Clash',
  'Roaring Skies',
  'Ancient Origins',
  'BREAKthrough',
  'BREAKpoint',
  'Fates Collide',
  'Steam Siege',
  'Evolutions',
  'Sun & Moon',
  'Guardians Rising',
  'Burning Shadows',
  'Crimson Invasion',
  'Ultra Prism',
  'Forbidden Light',
  'Celestial Storm',
  'Lost Thunder',
  'Team Up',
  'Detective Pikachu',
  'Unbroken Bonds',
  'Unified Minds',
  'Hidden Fates',
  'Cosmic Eclipse',
  'Sword & Shield',
  'Rebel Clash',
  'Darkness Ablaze',
  'Champion\'s Path',
  'Vivid Voltage',
  'Shining Fates',
  'Battle Styles',
  'Chilling Reign',
  'Evolving Skies',
  'Celebrations',
  'Fusion Strike',
  'Brilliant Stars',
  'Astral Radiance',
  'Lost Origin',
  'Silver Tempest',
  'Crown Zenith',
  'Scarlet & Violet',
  'Paldea Evolved',
  'Obsidian Flames',
  '151',
  'Paldean Fates',
  'Temporal Forces',
  'Twilight Masquerade',
  'Shrouded Fable',
  'Prismatic Evolutions'
];

// Common item types/endings
const ITEM_TYPES = [
  'Booster Box',
  'Elite Trainer Box',
  'Booster Bundle',
  'Booster Pack',
  'Collection Box',
  'Premium Collection',
  'Tin',
  'Display',
  'Bundle',
  'Pack',
  'Box',
  'Collection',
  'Premium',
  'Special',
  'Limited',
  'Exclusive',
  'Promo',
  'Starter Deck',
  'Theme Deck',
  'Deck',
  'Card',
  'Single',
  'Holo',
  'Reverse Holo',
  'Full Art',
  'Secret Rare',
  'Rare',
  'Uncommon',
  'Common',
  'Energy',
  'Trainer',
  'Supporter',
  'Item',
  'Stadium',
  'Tool',
  'Pokemon',
  'GX',
  'EX',
  'V',
  'VMAX',
  'VSTAR',
  'BREAK',
  'Mega',
  'Prism Star',
  'Tag Team',
  'Rainbow',
  'Shiny',
  'Alternate Art',
  'Character Rare',
  'Illustration Rare',
  'Special Illustration Rare',
  'Ultra Rare',
  'Hyper Rare',
  'Amazing Rare',
  'Radiant',
  'Tera',
  'ex',
  'Prime',
  'Legend',
  'Lv.X',
  'Delta',
  'Crystal',
  'Shining',
  'Gold Star',
  'Cracked Ice',
  'Cosmos',
  'Holo',
  'Reverse',
  'Foil',
  'Non-Holo',
  'First Edition',
  'Shadowless',
  'Unlimited',
  'Wizards',
  'Nintendo',
  'Pokemon Company',
  'International',
  'Japanese',
  'English',
  'French',
  'German',
  'Italian',
  'Spanish',
  'Portuguese',
  'Korean',
  'Chinese',
  'Thai',
  'Indonesian',
  'Malay',
  'Vietnamese',
  'Dutch',
  'Russian',
  'Polish',
  'Czech',
  'Hungarian',
  'Romanian',
  'Bulgarian',
  'Croatian',
  'Slovak',
  'Slovenian',
  'Estonian',
  'Latvian',
  'Lithuanian',
  'Finnish',
  'Swedish',
  'Norwegian',
  'Danish',
  'Icelandic',
  'Greek',
  'Turkish',
  'Hebrew',
  'Arabic',
  'Persian',
  'Urdu',
  'Hindi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Marathi',
  'Odia',
  'Assamese',
  'Nepali',
  'Sinhala',
  'Burmese',
  'Khmer',
  'Lao',
  'Mongolian',
  'Tibetan',
  'Uyghur',
  'Kazakh',
  'Kyrgyz',
  'Tajik',
  'Turkmen',
  'Uzbek',
  'Azerbaijani',
  'Georgian',
  'Armenian',
  'Moldovan',
  'Belarusian',
  'Ukrainian',
  'Serbian',
  'Bosnian',
  'Macedonian',
  'Albanian',
  'Montenegrin'
];

/**
 * Parse an item name to extract set name and item name
 * @param {string} fullName - The full item name (e.g., "Prismatic Evolutions Elite Trainer Box")
 * @returns {object} - { setName: string, itemName: string, originalName: string }
 */
export function parseItemName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return {
      setName: 'Unknown Set',
      itemName: fullName || 'Unknown Item',
      originalName: fullName || ''
    };
  }

  const trimmedName = fullName.trim();
  
  // Try to find a set pattern at the beginning
  for (const setPattern of SET_PATTERNS) {
    if (trimmedName.toLowerCase().startsWith(setPattern.toLowerCase())) {
      const remainingName = trimmedName.substring(setPattern.length).trim();
      
      // If there's remaining text, that's likely the item name
      if (remainingName) {
        return {
          setName: setPattern,
          itemName: remainingName,
          originalName: trimmedName
        };
      }
    }
  }

  // Try to find item types at the end
  for (const itemType of ITEM_TYPES) {
    if (trimmedName.toLowerCase().endsWith(itemType.toLowerCase())) {
      const setName = trimmedName.substring(0, trimmedName.length - itemType.length).trim();
      
      if (setName) {
        return {
          setName: setName,
          itemName: itemType,
          originalName: trimmedName
        };
      }
    }
  }

  // If no pattern matches, try to split on common separators
  const separators = [' - ', ' | ', ' / ', ' \\ ', ' • ', ' · '];
  for (const separator of separators) {
    if (trimmedName.includes(separator)) {
      const parts = trimmedName.split(separator);
      if (parts.length >= 2) {
        return {
          setName: parts[0].trim(),
          itemName: parts.slice(1).join(separator).trim(),
          originalName: trimmedName
        };
      }
    }
  }

  // If all else fails, try to split on the last space
  const lastSpaceIndex = trimmedName.lastIndexOf(' ');
  if (lastSpaceIndex > 0) {
    const potentialSetName = trimmedName.substring(0, lastSpaceIndex).trim();
    const potentialItemName = trimmedName.substring(lastSpaceIndex + 1).trim();
    
    // If the last word looks like an item type, use it
    if (ITEM_TYPES.some(type => type.toLowerCase().includes(potentialItemName.toLowerCase()))) {
      return {
        setName: potentialSetName,
        itemName: potentialItemName,
        originalName: trimmedName
      };
    }
  }

  // Default fallback - treat the whole thing as the item name
  return {
    setName: 'Unknown Set',
    itemName: trimmedName,
    originalName: trimmedName
  };
}

/**
 * Get a clean item name for display (without set name)
 * @param {string} fullName - The full item name
 * @returns {string} - Clean item name
 */
export function getCleanItemName(fullName) {
  const parsed = parseItemName(fullName);
  return parsed.itemName;
}

/**
 * Get the set name from a full item name
 * @param {string} fullName - The full item name
 * @returns {string} - Set name
 */
export function getSetName(fullName) {
  const parsed = parseItemName(fullName);
  return parsed.setName;
}

/**
 * Check if an item name contains a set name
 * @param {string} fullName - The full item name
 * @returns {boolean} - True if set name was found
 */
export function hasSetName(fullName) {
  const parsed = parseItemName(fullName);
  return parsed.setName !== 'Unknown Set';
}


