/**
 * Pokemon Translation Utilities
 * Handles Japanese/English translation logic based on Scrydex Pokemon API documentation
 * 
 * Features:
 * - Fallback logic for missing Japanese translations
 * - English translation extraction from nested structure
 * - Proper handling of Japanese card data structure
 * - Support for all Pokemon card fields (name, attacks, abilities, etc.)
 */

class PokemonTranslationUtils {
  constructor() {
    // Supported languages
    this.supportedLanguages = ['en', 'ja'];
    
    // Default language
    this.defaultLanguage = 'en';
  }

  /**
   * Process Pokemon card data with translation support
   * @param {Object} cardData - Raw card data from Scrydex API
   * @param {string} preferredLanguage - Preferred display language
   * @returns {Object} - Processed card data with translations
   */
  processCardData(cardData, preferredLanguage = 'en') {
    if (!cardData) return null;

    const {
      // Basic card information
      id,
      name,
      supertype,
      subtypes,
      types,
      hp,
      level,
      evolves_from,
      rules,
      ancient_trait,
      
      // Abilities and attacks
      abilities,
      attacks,
      
      // Combat information
      weaknesses,
      resistances,
      retreat_cost,
      converted_retreat_cost,
      
      // Card details
      number,
      printed_number,
      rarity,
      rarity_code,
      artist,
      national_pokedex_numbers,
      flavor_text,
      regulation_mark,
      
      // Language and expansion
      language,
      language_code,
      expansion,
      expansion_sort_order,
      
      // Variants and pricing
      variants,
      
      // Images
      images,
      
      // Translation data
      translation,
      
      // Keep any other fields
      ...otherFields
    } = cardData;

    // Determine the primary language of the card data
    const cardLanguage = language_code || language || 'en';
    
    // Get translation data
    const translationData = translation?.en || {};

    return {
      // Basic card info
      id,
      language: cardLanguage,
      preferredLanguage,
      
      // Name with fallback logic
      name: this.getTranslatedField(name, translationData.name, preferredLanguage),
      
      // Card type information
      supertype: this.getTranslatedField(supertype, translationData.supertype, preferredLanguage),
      subtypes: this.getTranslatedArray(subtypes, translationData.subtypes, preferredLanguage),
      types: this.getTranslatedArray(types, translationData.types, preferredLanguage),
      
      // Evolution and level information
      level,
      evolves_from: this.getTranslatedArray(evolves_from, translationData.evolves_from, preferredLanguage),
      
      // Rules and special traits
      rules: this.getTranslatedArray(rules, translationData.rules, preferredLanguage),
      ancient_trait: this.processAncientTrait(ancient_trait, translationData.ancient_trait, preferredLanguage),
      
      // Stats
      hp,
      converted_retreat_cost,
      
      // Combat information
      attacks: this.processAttacks(attacks, translationData.attacks, preferredLanguage),
      abilities: this.processAbilities(abilities, translationData.abilities, preferredLanguage),
      weaknesses: this.processWeaknesses(weaknesses, translationData.weaknesses, preferredLanguage),
      resistances: this.processResistances(resistances, translationData.resistances, preferredLanguage),
      retreat_cost: this.getTranslatedArray(retreat_cost, translationData.retreat_cost, preferredLanguage),
      
      // Card details
      number,
      printed_number,
      rarity: this.getTranslatedField(rarity, translationData.rarity, preferredLanguage),
      rarity_code,
      artist,
      national_pokedex_numbers,
      flavor_text: this.getTranslatedField(flavor_text, translationData.flavor_text, preferredLanguage),
      regulation_mark,
      
      // Images and expansion
      images,
      expansion: this.processExpansion(expansion, translationData.expansion, preferredLanguage),
      expansion_sort_order,
      variants: this.processVariants(variants, translationData.variants, preferredLanguage),
      
      // Translation metadata
      hasTranslation: !!translationData,
      translationQuality: this.assessTranslationQuality(cardData, translationData),
      
      // Keep other fields
      ...otherFields
    };
  }

  /**
   * Get translated field with fallback logic
   * @param {any} originalValue - Original field value
   * @param {any} translatedValue - Translated field value
   * @param {string} preferredLanguage - Preferred language
   * @returns {any} - Best available value
   */
  getTranslatedField(originalValue, translatedValue, preferredLanguage) {
    // If preferred language is English and we have translation, use it
    if (preferredLanguage === 'en' && translatedValue !== undefined) {
      return translatedValue;
    }
    
    // Otherwise, use original value (could be Japanese or English)
    return originalValue !== undefined ? originalValue : translatedValue;
  }

  /**
   * Get translated array with fallback logic
   * @param {Array} originalArray - Original array
   * @param {Array} translatedArray - Translated array
   * @param {string} preferredLanguage - Preferred language
   * @returns {Array} - Best available array
   */
  getTranslatedArray(originalArray, translatedArray, preferredLanguage) {
    // If preferred language is English and we have translation, use it
    if (preferredLanguage === 'en' && translatedArray && translatedArray.length > 0) {
      return translatedArray;
    }
    
    // Otherwise, use original array
    return originalArray || translatedArray || [];
  }

  /**
   * Process attacks with translation support
   * @param {Array} attacks - Original attacks array
   * @param {Array} translatedAttacks - Translated attacks array
   * @param {string} preferredLanguage - Preferred language
   * @returns {Array} - Processed attacks
   */
  processAttacks(attacks, translatedAttacks, preferredLanguage) {
    if (!attacks) return [];

    return attacks.map((attack, index) => {
      const translatedAttack = translatedAttacks?.[index];
      
      return {
        cost: this.getTranslatedArray(attack.cost, translatedAttack?.cost, preferredLanguage),
        converted_energy_cost: attack.converted_energy_cost,
        name: this.getTranslatedField(attack.name, translatedAttack?.name, preferredLanguage),
        text: this.getTranslatedField(attack.text, translatedAttack?.text, preferredLanguage),
        damage: attack.damage,
        // Keep other attack properties
        ...Object.fromEntries(
          Object.entries(attack).filter(([key]) => 
            !['cost', 'converted_energy_cost', 'name', 'text', 'damage'].includes(key)
          )
        )
      };
    });
  }

  /**
   * Process abilities with translation support
   * @param {Array} abilities - Original abilities array
   * @param {Array} translatedAbilities - Translated abilities array
   * @param {string} preferredLanguage - Preferred language
   * @returns {Array} - Processed abilities
   */
  processAbilities(abilities, translatedAbilities, preferredLanguage) {
    if (!abilities) return [];

    return abilities.map((ability, index) => {
      const translatedAbility = translatedAbilities?.[index];
      
      return {
        name: this.getTranslatedField(ability.name, translatedAbility?.name, preferredLanguage),
        text: this.getTranslatedField(ability.text, translatedAbility?.text, preferredLanguage),
        type: this.getTranslatedField(ability.type, translatedAbility?.type, preferredLanguage),
        // Keep other ability properties
        ...Object.fromEntries(
          Object.entries(ability).filter(([key]) => 
            !['name', 'text', 'type'].includes(key)
          )
        )
      };
    });
  }

  /**
   * Process weaknesses with translation support
   * @param {Array} weaknesses - Original weaknesses array
   * @param {Array} translatedWeaknesses - Translated weaknesses array
   * @param {string} preferredLanguage - Preferred language
   * @returns {Array} - Processed weaknesses
   */
  processWeaknesses(weaknesses, translatedWeaknesses, preferredLanguage) {
    if (!weaknesses) return [];

    return weaknesses.map((weakness, index) => {
      const translatedWeakness = translatedWeaknesses?.[index];
      
      return {
        type: this.getTranslatedField(weakness.type, translatedWeakness?.type, preferredLanguage),
        value: weakness.value,
        // Keep other weakness properties
        ...Object.fromEntries(
          Object.entries(weakness).filter(([key]) => 
            !['type', 'value'].includes(key)
          )
        )
      };
    });
  }

  /**
   * Process resistances with translation support
   * @param {Array} resistances - Original resistances array
   * @param {Array} translatedResistances - Translated resistances array
   * @param {string} preferredLanguage - Preferred language
   * @returns {Array} - Processed resistances
   */
  processResistances(resistances, translatedResistances, preferredLanguage) {
    if (!resistances) return [];

    return resistances.map((resistance, index) => {
      const translatedResistance = translatedResistances?.[index];
      
      return {
        type: this.getTranslatedField(resistance.type, translatedResistance?.type, preferredLanguage),
        value: resistance.value,
        // Keep other resistance properties
        ...Object.fromEntries(
          Object.entries(resistance).filter(([key]) => 
            !['type', 'value'].includes(key)
          )
        )
      };
    });
  }

  /**
   * Process ancient trait with translation support
   * @param {Object} ancientTrait - Original ancient trait
   * @param {Object} translatedAncientTrait - Translated ancient trait
   * @param {string} preferredLanguage - Preferred language
   * @returns {Object|null} - Processed ancient trait
   */
  processAncientTrait(ancientTrait, translatedAncientTrait, preferredLanguage) {
    if (!ancientTrait) return null;

    return {
      name: this.getTranslatedField(ancientTrait.name, translatedAncientTrait?.name, preferredLanguage),
      text: this.getTranslatedField(ancientTrait.text, translatedAncientTrait?.text, preferredLanguage),
      // Keep other ancient trait properties
      ...Object.fromEntries(
        Object.entries(ancientTrait).filter(([key]) => 
          !['name', 'text'].includes(key)
        )
      )
    };
  }

  /**
   * Process expansion with translation support
   * @param {Object} expansion - Original expansion data
   * @param {Object} translatedExpansion - Translated expansion data
   * @param {string} preferredLanguage - Preferred language
   * @returns {Object|null} - Processed expansion data
   */
  processExpansion(expansion, translatedExpansion, preferredLanguage) {
    if (!expansion) return null;

    return {
      id: expansion.id,
      name: this.getTranslatedField(expansion.name, translatedExpansion?.name, preferredLanguage),
      series: this.getTranslatedField(expansion.series, translatedExpansion?.series, preferredLanguage),
      total: expansion.total,
      printed_total: expansion.printed_total,
      language: expansion.language,
      language_code: expansion.language_code,
      release_date: expansion.release_date,
      is_online_only: expansion.is_online_only,
      // Keep other expansion properties
      ...Object.fromEntries(
        Object.entries(expansion).filter(([key]) => 
          !['id', 'name', 'series', 'total', 'printed_total', 'language', 'language_code', 'release_date', 'is_online_only'].includes(key)
        )
      )
    };
  }

  /**
   * Process variants with translation support
   * @param {Array} variants - Original variants array
   * @param {Array} translatedVariants - Translated variants array
   * @param {string} preferredLanguage - Preferred language
   * @returns {Array} - Processed variants
   */
  processVariants(variants, translatedVariants, preferredLanguage) {
    if (!variants) return [];

    return variants.map((variant, index) => {
      const translatedVariant = translatedVariants?.[index];
      
      return {
        name: this.getTranslatedField(variant.name, translatedVariant?.name, preferredLanguage),
        images: variant.images || [],
        prices: variant.prices || [],
        // Keep other variant properties
        ...Object.fromEntries(
          Object.entries(variant).filter(([key]) => 
            !['name', 'images', 'prices'].includes(key)
          )
        )
      };
    });
  }

  /**
   * Assess translation quality
   * @param {Object} cardData - Original card data
   * @param {Object} translationData - Translation data
   * @returns {Object} - Translation quality assessment
   */
  assessTranslationQuality(cardData, translationData) {
    if (!translationData) {
      return {
        hasTranslation: false,
        completeness: 0,
        missingFields: [],
        quality: 'none'
      };
    }

    // Define field importance levels based on Scrydex documentation
    const criticalFields = ['name', 'supertype', 'types', 'subtypes'];
    const importantFields = ['attacks', 'abilities', 'weaknesses', 'resistances', 'rarity', 'evolves_from'];
    const niceToHaveFields = ['rules', 'ancient_trait', 'flavor_text', 'expansion'];
    
    const missingCritical = criticalFields.filter(field => !translationData[field]);
    const missingImportant = importantFields.filter(field => !translationData[field]);
    const missingNiceToHave = niceToHaveFields.filter(field => !translationData[field]);
    
    // Calculate completeness based on critical and important fields
    const totalEssentialFields = criticalFields.length + importantFields.length;
    const missingEssentialFields = missingCritical.length + missingImportant.length;
    const completeness = Math.round(
      ((totalEssentialFields - missingEssentialFields) / totalEssentialFields) * 100
    );
    
    // Determine quality based on missing fields
    let quality = 'poor';
    if (missingCritical.length === 0 && missingImportant.length <= 1) {
      quality = 'excellent';
    } else if (missingCritical.length === 0 && missingImportant.length <= 2) {
      quality = 'good';
    } else if (missingCritical.length <= 1 && missingImportant.length <= 3) {
      quality = 'fair';
    }

    return {
      hasTranslation: true,
      completeness,
      missingFields: [...missingCritical, ...missingImportant, ...missingNiceToHave],
      missingCritical,
      missingImportant,
      missingNiceToHave,
      quality,
      totalFields: totalEssentialFields,
      translatedFields: totalEssentialFields - missingEssentialFields
    };
  }

  /**
   * Get language-specific display text
   * @param {string} languageCode - Language code
   * @returns {string} - Display name
   */
  getLanguageDisplayName(languageCode) {
    const names = {
      'en': 'English',
      'ja': 'Japanese'
    };
    return names[languageCode] || languageCode.toUpperCase();
  }

  /**
   * Check if language is supported
   * @param {string} languageCode - Language code
   * @returns {boolean} - Whether language is supported
   */
  isLanguageSupported(languageCode) {
    return this.supportedLanguages.includes(languageCode);
  }
}

// Export singleton instance
const pokemonTranslationUtils = new PokemonTranslationUtils();
export default pokemonTranslationUtils;
