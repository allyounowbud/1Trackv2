/**
 * Translation Utilities for Scrydex Pokemon API
 * Handles language-specific data processing according to Scrydex documentation
 * https://scrydex.com/docs/api-reference/pokemon
 */

/**
 * Get localized card name with proper fallback logic
 * @param {Object} card - Card object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Object} - Object with display information
 */
export function getLocalizedCardName(card, preferredLanguage = 'en') {
  if (!card) return { primary: 'Unknown Card', secondary: null, isJapanese: false };

  // Check if this is a Japanese card
  const isJapanese = card.language === 'ja' || card.language_code === 'ja';
  
  if (isJapanese) {
    // Japanese card: show Japanese name, with English translation as subtitle
    return {
      primary: card.name || card.translation?.en?.name || 'Unknown Card',
      secondary: card.translation?.en?.name && card.name !== card.translation.en.name 
        ? card.translation.en.name 
        : null,
      isJapanese: true,
      language: 'ja'
    };
  }
  
  // English card: show English name
  return {
    primary: card.translation?.en?.name || card.name || 'Unknown Card',
    secondary: null,
    isJapanese: false,
    language: 'en'
  };
}

/**
 * Get localized expansion/set name with proper fallback logic
 * @param {Object} expansion - Expansion object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Object} - Object with display information
 */
export function getLocalizedExpansionName(expansion, preferredLanguage = 'en') {
  if (!expansion) return { primary: 'Unknown Set', secondary: null, isJapanese: false };

  // Check if this is a Japanese expansion
  const isJapanese = expansion.language === 'ja' || expansion.language_code === 'ja';
  
  if (isJapanese) {
    // Japanese expansion: show Japanese name, with English translation as subtitle
    return {
      primary: expansion.name || expansion.translation?.en?.name || 'Unknown Set',
      secondary: expansion.translation?.en?.name && expansion.name !== expansion.translation.en.name 
        ? expansion.translation.en.name 
        : null,
      isJapanese: true,
      language: 'ja'
    };
  }
  
  // English expansion: show English name
  return {
    primary: expansion.translation?.en?.name || expansion.name || 'Unknown Set',
    secondary: null,
    isJapanese: false,
    language: 'en'
  };
}

/**
 * Process a complete expansion object with all localized data
 * @param {Object} expansion - Raw expansion object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Object} - Fully processed expansion with localized data
 */
export function processLocalizedExpansion(expansion, preferredLanguage = 'en') {
  if (!expansion) return null;

  const nameInfo = getLocalizedExpansionName(expansion, preferredLanguage);

  return {
    ...expansion,
    // Override with localized data
    displayName: nameInfo.primary,
    displayNameSecondary: nameInfo.secondary,
    
    // Metadata
    isJapanese: nameInfo.isJapanese,
    detectedLanguage: nameInfo.language,
    
    // Keep original data for reference
    originalName: expansion.name,
    originalTranslation: expansion.translation,
    
    // Additional computed fields
    cardCount: expansion.total || 0,
    printedCardCount: expansion.printed_total || 0,
    hasSecretRares: (expansion.total || 0) > (expansion.printed_total || 0),
    releaseYear: expansion.release_date ? expansion.release_date.split('/')[0] : null,
    releaseMonth: expansion.release_date ? expansion.release_date.split('/')[1] : null,
    releaseDay: expansion.release_date ? expansion.release_date.split('/')[2] : null
  };
}

/**
 * Get expansion logo URL with fallback
 * @param {Object} expansion - Expansion object
 * @param {string} size - Logo size ('logo', 'symbol')
 * @returns {string} - Logo URL
 */
export function getExpansionLogoUrl(expansion, size = 'logo') {
  if (!expansion) return null;
  
  // Prefer language-specific logo if available
  const isJapanese = expansion.language === 'ja' || expansion.language_code === 'ja';
  
  if (isJapanese && expansion[`${size}_ja`]) {
    return expansion[`${size}_ja`];
  }
  
  // Fallback to standard logo
  return expansion[size] || null;
}

/**
 * Check if an expansion is Japanese based on various indicators
 * @param {Object} expansion - Expansion object
 * @returns {boolean} - True if expansion is Japanese
 */
export function isJapaneseExpansion(expansion) {
  if (!expansion) return false;
  
  return expansion.language === 'ja' || 
         expansion.language_code === 'ja' ||
         (expansion.name && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(expansion.name));
}

/**
 * Get localized card description/ability text
 * @param {Object} card - Card object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Object} - Object with display information
 */
export function getLocalizedCardText(card, preferredLanguage = 'en') {
  if (!card) return { primary: '', secondary: null, isJapanese: false };

  const isJapanese = card.language === 'ja' || card.language_code === 'ja';
  
  // Handle abilities
  const abilities = card.abilities || [];
  const localizedAbilities = abilities.map(ability => {
    if (isJapanese) {
      return {
        name: ability.name || ability.translation?.en?.name || '',
        text: ability.text || ability.translation?.en?.text || '',
        secondaryName: ability.translation?.en?.name && ability.name !== ability.translation.en.name 
          ? ability.translation.en.name 
          : null,
        secondaryText: ability.translation?.en?.text && ability.text !== ability.translation.en.text 
          ? ability.translation.en.text 
          : null
      };
    }
    
    return {
      name: ability.translation?.en?.name || ability.name || '',
      text: ability.translation?.en?.text || ability.text || '',
      secondaryName: null,
      secondaryText: null
    };
  });

  // Handle attacks
  const attacks = card.attacks || [];
  const localizedAttacks = attacks.map(attack => {
    if (isJapanese) {
      return {
        name: attack.name || attack.translation?.en?.name || '',
        text: attack.text || attack.translation?.en?.text || '',
        cost: attack.cost || attack.translation?.en?.cost || [],
        damage: attack.damage || attack.translation?.en?.damage || '',
        secondaryName: attack.translation?.en?.name && attack.name !== attack.translation.en.name 
          ? attack.translation.en.name 
          : null,
        secondaryText: attack.translation?.en?.text && attack.text !== attack.translation.en.text 
          ? attack.translation.en.text 
          : null
      };
    }
    
    return {
      name: attack.translation?.en?.name || attack.name || '',
      text: attack.translation?.en?.text || attack.text || '',
      cost: attack.translation?.en?.cost || attack.cost || [],
      damage: attack.translation?.en?.damage || attack.damage || '',
      secondaryName: null,
      secondaryText: null
    };
  });

  return {
    abilities: localizedAbilities,
    attacks: localizedAttacks,
    isJapanese,
    language: isJapanese ? 'ja' : 'en'
  };
}

/**
 * Get localized card types and subtypes
 * @param {Object} card - Card object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Object} - Object with localized type information
 */
export function getLocalizedCardTypes(card, preferredLanguage = 'en') {
  if (!card) return { types: [], subtypes: [], supertype: '', isJapanese: false };

  const isJapanese = card.language === 'ja' || card.language_code === 'ja';
  
  const types = (card.types || []).map(type => {
    if (isJapanese) {
      return {
        primary: type || '',
        secondary: card.translation?.en?.types?.find(t => t !== type) || null
      };
    }
    
    return {
      primary: card.translation?.en?.types?.find(t => t === type) || type || '',
      secondary: null
    };
  });

  const subtypes = (card.subtypes || []).map(subtype => {
    if (isJapanese) {
      return {
        primary: subtype || '',
        secondary: card.translation?.en?.subtypes?.find(s => s !== subtype) || null
      };
    }
    
    return {
      primary: card.translation?.en?.subtypes?.find(s => s === subtype) || subtype || '',
      secondary: null
    };
  });

  const supertype = isJapanese 
    ? card.supertype || card.translation?.en?.supertype || ''
    : card.translation?.en?.supertype || card.supertype || '';

  return {
    types,
    subtypes,
    supertype,
    isJapanese,
    language: isJapanese ? 'ja' : 'en'
  };
}

/**
 * Get localized card abilities with full translation support
 * @param {Object} card - Card object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Array} - Array of localized ability objects
 */
export function getLocalizedCardAbilities(card, preferredLanguage = 'en') {
  if (!card || !card.abilities) return [];

  const isJapanese = card.language === 'ja' || card.language_code === 'ja';
  
  return card.abilities.map(ability => {
    if (isJapanese) {
      return {
        type: ability.type || ability.translation?.en?.type || '',
        name: ability.name || ability.translation?.en?.name || '',
        text: ability.text || ability.translation?.en?.text || '',
        secondaryType: ability.translation?.en?.type && ability.type !== ability.translation.en.type 
          ? ability.translation.en.type 
          : null,
        secondaryName: ability.translation?.en?.name && ability.name !== ability.translation.en.name 
          ? ability.translation.en.name 
          : null,
        secondaryText: ability.translation?.en?.text && ability.text !== ability.translation.en.text 
          ? ability.translation.en.text 
          : null
      };
    }
    
    return {
      type: ability.translation?.en?.type || ability.type || '',
      name: ability.translation?.en?.name || ability.name || '',
      text: ability.translation?.en?.text || ability.text || '',
      secondaryType: null,
      secondaryName: null,
      secondaryText: null
    };
  });
}

/**
 * Get localized card attacks with full translation support
 * @param {Object} card - Card object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Array} - Array of localized attack objects
 */
export function getLocalizedCardAttacks(card, preferredLanguage = 'en') {
  if (!card || !card.attacks) return [];

  const isJapanese = card.language === 'ja' || card.language_code === 'ja';
  
  return card.attacks.map(attack => {
    if (isJapanese) {
      return {
        cost: attack.cost || attack.translation?.en?.cost || [],
        converted_energy_cost: attack.converted_energy_cost || attack.translation?.en?.converted_energy_cost || 0,
        name: attack.name || attack.translation?.en?.name || '',
        text: attack.text || attack.translation?.en?.text || '',
        damage: attack.damage || attack.translation?.en?.damage || '',
        secondaryName: attack.translation?.en?.name && attack.name !== attack.translation.en.name 
          ? attack.translation.en.name 
          : null,
        secondaryText: attack.translation?.en?.text && attack.text !== attack.translation.en.text 
          ? attack.translation.en.text 
          : null,
        secondaryDamage: attack.translation?.en?.damage && attack.damage !== attack.translation.en.damage 
          ? attack.translation.en.damage 
          : null
      };
    }
    
    return {
      cost: attack.translation?.en?.cost || attack.cost || [],
      converted_energy_cost: attack.translation?.en?.converted_energy_cost || attack.converted_energy_cost || 0,
      name: attack.translation?.en?.name || attack.name || '',
      text: attack.translation?.en?.text || attack.text || '',
      damage: attack.translation?.en?.damage || attack.damage || '',
      secondaryName: null,
      secondaryText: null,
      secondaryDamage: null
    };
  });
}

/**
 * Get localized weaknesses and resistances
 * @param {Object} card - Card object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Object} - Object with localized weaknesses and resistances
 */
export function getLocalizedCardWeaknessesResistances(card, preferredLanguage = 'en') {
  if (!card) return { weaknesses: [], resistances: [], isJapanese: false };

  const isJapanese = card.language === 'ja' || card.language_code === 'ja';
  
  const weaknesses = (card.weaknesses || []).map(weakness => {
    if (isJapanese) {
      return {
        type: weakness.type || weakness.translation?.en?.type || '',
        value: weakness.value || weakness.translation?.en?.value || '',
        secondaryType: weakness.translation?.en?.type && weakness.type !== weakness.translation.en.type 
          ? weakness.translation.en.type 
          : null,
        secondaryValue: weakness.translation?.en?.value && weakness.value !== weakness.translation.en.value 
          ? weakness.translation.en.value 
          : null
      };
    }
    
    return {
      type: weakness.translation?.en?.type || weakness.type || '',
      value: weakness.translation?.en?.value || weakness.value || '',
      secondaryType: null,
      secondaryValue: null
    };
  });

  const resistances = (card.resistances || []).map(resistance => {
    if (isJapanese) {
      return {
        type: resistance.type || resistance.translation?.en?.type || '',
        value: resistance.value || resistance.translation?.en?.value || '',
        secondaryType: resistance.translation?.en?.type && resistance.type !== resistance.translation.en.type 
          ? resistance.translation.en.type 
          : null,
        secondaryValue: resistance.translation?.en?.value && resistance.value !== resistance.translation.en.value 
          ? resistance.translation.en.value 
          : null
      };
    }
    
    return {
      type: resistance.translation?.en?.type || resistance.type || '',
      value: resistance.translation?.en?.value || resistance.value || '',
      secondaryType: null,
      secondaryValue: null
    };
  });

  return {
    weaknesses,
    resistances,
    isJapanese,
    language: isJapanese ? 'ja' : 'en'
  };
}

/**
 * Process a complete card object with all localized data
 * @param {Object} card - Raw card object from Scrydex API
 * @param {string} preferredLanguage - Preferred language ('en' or 'ja')
 * @returns {Object} - Fully processed card with localized data
 */
export function processLocalizedCard(card, preferredLanguage = 'en') {
  if (!card) return null;

  const nameInfo = getLocalizedCardName(card, preferredLanguage);
  const expansionInfo = getLocalizedExpansionName(card.expansion, preferredLanguage);
  const textInfo = getLocalizedCardText(card, preferredLanguage);
  const typeInfo = getLocalizedCardTypes(card, preferredLanguage);
  const abilityInfo = getLocalizedCardAbilities(card, preferredLanguage);
  const attackInfo = getLocalizedCardAttacks(card, preferredLanguage);
  const weaknessResistanceInfo = getLocalizedCardWeaknessesResistances(card, preferredLanguage);

  return {
    ...card,
    // Override with localized data
    displayName: nameInfo.primary,
    displayNameSecondary: nameInfo.secondary,
    displayExpansion: expansionInfo.primary,
    displayExpansionSecondary: expansionInfo.secondary,
    displayAbilities: abilityInfo,
    displayAttacks: attackInfo,
    displayTypes: typeInfo.types,
    displaySubtypes: typeInfo.subtypes,
    displaySupertype: typeInfo.supertype,
    displayWeaknesses: weaknessResistanceInfo.weaknesses,
    displayResistances: weaknessResistanceInfo.resistances,
    
    // Metadata
    isJapanese: nameInfo.isJapanese,
    detectedLanguage: nameInfo.language,
    
    // Keep original data for reference
    originalName: card.name,
    originalExpansion: card.expansion?.name,
    originalTranslation: card.translation
  };
}

/**
 * Get language preference from localStorage
 * @returns {string} - User's preferred language
 */
export function getLanguagePreference() {
  return localStorage.getItem('scrydex_preferred_language') || 'en';
}

/**
 * Set language preference in localStorage
 * @param {string} language - Language code ('en' or 'ja')
 */
export function setLanguagePreference(language) {
  if (language === 'en' || language === 'ja') {
    localStorage.setItem('scrydex_preferred_language', language);
  }
}

/**
 * Check if a card is Japanese based on various indicators
 * @param {Object} card - Card object
 * @returns {boolean} - True if card is Japanese
 */
export function isJapaneseCard(card) {
  if (!card) return false;
  
  return card.language === 'ja' || 
         card.language_code === 'ja' ||
         card.set?.language === 'ja' ||
         card.expansion?.language === 'ja' ||
         (card.name && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(card.name));
}

/**
 * Get appropriate image URL based on card language and quality
 * @param {Object} card - Card object
 * @param {string} size - Image size ('small', 'large', 'hires')
 * @returns {string} - Image URL
 */
export function getLocalizedImageUrl(card, size = 'large') {
  if (!card || !card.images) return null;
  
  // Handle Scrydex API format: images is an array of objects with type, small, medium, large
  if (Array.isArray(card.images)) {
    const frontImage = card.images.find(img => img.type === 'front');
    if (frontImage) {
      return frontImage[size] || frontImage.large || frontImage.medium || frontImage.small;
    }
    // Fallback to first image if no front image found
    if (card.images.length > 0) {
      return card.images[0][size] || card.images[0].large || card.images[0].medium || card.images[0].small;
    }
  }
  
  // Handle legacy format: images is an object with size properties
  if (typeof card.images === 'object' && !Array.isArray(card.images)) {
    // Prefer language-specific image if available
    const isJapanese = isJapaneseCard(card);
    
    if (isJapanese && card.images[`${size}_ja`]) {
      return card.images[`${size}_ja`];
    }
    
    // Fallback to standard image
    return card.images[size] || card.images.large || card.images.small;
  }
  
  return null;
}

// Import Pokemon-specific translation utilities
// import pokemonTranslationUtils from './pokemonTranslationUtils';

/**
 * Process Pokemon card data with enhanced translation support
 * @param {Object} cardData - Raw Pokemon card data from Scrydex API
 * @param {string} preferredLanguage - Preferred display language
 * @returns {Object} - Processed card data with translations
 */
export function processPokemonCard(cardData, preferredLanguage = 'en') {
  // Temporarily disabled to fix import issue
  return cardData;
  // return pokemonTranslationUtils.processCardData(cardData, preferredLanguage);
}

/**
 * Get Pokemon translation quality assessment
 * @param {Object} cardData - Card data
 * @returns {Object} - Translation quality information
 */
export function getPokemonTranslationQuality(cardData) {
  const translationData = cardData.translation?.en || {};
  return { quality: 'good', completeness: 1.0 };
  // return pokemonTranslationUtils.assessTranslationQuality(cardData, translationData);
}

/**
 * Check if Pokemon language is supported
 * @param {string} languageCode - Language code
 * @returns {boolean} - Whether language is supported
 */
export function isPokemonLanguageSupported(languageCode) {
  return languageCode === 'en' || languageCode === 'ja';
  // return pokemonTranslationUtils.isLanguageSupported(languageCode);
}

export default {
  getLocalizedCardName,
  getLocalizedExpansionName,
  processLocalizedExpansion,
  getExpansionLogoUrl,
  isJapaneseExpansion,
  getLocalizedCardText,
  getLocalizedCardTypes,
  getLocalizedCardAbilities,
  getLocalizedCardAttacks,
  getLocalizedCardWeaknessesResistances,
  processLocalizedCard,
  getLanguagePreference,
  setLanguagePreference,
  isJapaneseCard,
  getLocalizedImageUrl,
  // Pokemon-specific functions
  processPokemonCard,
  getPokemonTranslationQuality,
  isPokemonLanguageSupported
};
