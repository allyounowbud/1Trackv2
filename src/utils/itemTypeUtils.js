/**
 * Utility functions for proper item type classification
 * This ensures items are correctly categorized for collection organization
 */

/**
 * Determines the correct item type based on the item data and card type selection
 * @param {Object} item - The item data
 * @param {string} cardType - The selected card type (raw, psa_10, bgs_9, etc.)
 * @param {string} source - The item source (api, manual, custom)
 * @returns {string} - The proper item type classification
 */
export const getItemTypeClassification = (item, cardType = 'raw', source = 'api') => {
  // Custom items should always be classified as "Custom"
  if (source === 'custom' || source === 'manual') {
    return 'Custom';
  }

  // Sealed products should always be classified as "Sealed Product"
  const isSealedProduct = 
    item.itemType === 'Sealed Product' ||
    item.itemType === 'Sealed' ||
    item.source === 'sealed' ||
    item.name?.toLowerCase().includes('box') ||
    item.name?.toLowerCase().includes('bundle') ||
    item.name?.toLowerCase().includes('collection') ||
    item.name?.toLowerCase().includes('tin') ||
    item.name?.toLowerCase().includes('pack') ||
    item.name?.toLowerCase().includes('booster') ||
    item.name?.toLowerCase().includes('display') ||
    item.name?.toLowerCase().includes('case') ||
    item.name?.toLowerCase().includes('ultra-premium') ||
    item.name?.toLowerCase().includes('elite trainer') ||
    item.name?.toLowerCase().includes('premium') ||
    item.name?.toLowerCase().includes('etb') ||
    item.name?.toLowerCase().includes('vmax') ||
    item.name?.toLowerCase().includes('ex') && (item.name?.toLowerCase().includes('box') || item.name?.toLowerCase().includes('collection'));

  if (isSealedProduct) {
    return 'Sealed Product';
  }

  // For singles/cards, classify based on card type
  if (cardType === 'raw') {
    return 'Ungraded';
  } else if (cardType.startsWith('psa_')) {
    return 'PSA';
  } else if (cardType.startsWith('bgs_') || cardType.startsWith('beckett_')) {
    return 'Beckett';
  } else if (cardType.startsWith('cgc_')) {
    return 'CGC';
  } else if (cardType.startsWith('sgc_')) {
    return 'SGC';
  }

  // Default to Ungraded for singles
  return 'Ungraded';
};

/**
 * Gets the grade from a card type string
 * @param {string} cardType - The card type (e.g., "psa_10", "bgs_9")
 * @returns {number|null} - The grade number or null for raw/ungraded
 */
export const getGradeFromCardType = (cardType) => {
  if (!cardType || cardType === 'raw') {
    return null;
  }
  
  const parts = cardType.split('_');
  return parts.length > 1 ? parseInt(parts[1]) : null;
};

/**
 * Gets the company from a card type string
 * @param {string} cardType - The card type (e.g., "psa_10", "bgs_9")
 * @returns {string} - The company name or "raw"
 */
export const getCompanyFromCardType = (cardType) => {
  if (!cardType || cardType === 'raw') {
    return 'raw';
  }
  
  const parts = cardType.split('_');
  return parts[0];
};

/**
 * Creates a proper card type string from company and grade
 * @param {string} company - The grading company (psa, bgs, cgc, etc.)
 * @param {number} grade - The grade number
 * @returns {string} - The card type string
 */
export const createCardType = (company, grade) => {
  if (!company || company === 'raw') {
    return 'raw';
  }
  
  return `${company}_${grade}`;
};

/**
 * Determines if an item should use graded or raw pricing
 * @param {Object} item - The item data
 * @param {string} cardType - The selected card type
 * @returns {boolean} - True if should use graded pricing
 */
export const shouldUseGradedPricing = (item, cardType) => {
  const company = getCompanyFromCardType(cardType);
  return company !== 'raw' && item.graded_price;
};

/**
 * Gets the appropriate market value based on card type
 * @param {Object} item - The item data
 * @param {string} cardType - The selected card type
 * @returns {number} - The market value
 */
export const getMarketValueForCardType = (item, cardType) => {
  if (shouldUseGradedPricing(item, cardType)) {
    return item.graded_price ? parseFloat(item.graded_price) : (item.raw_price ? parseFloat(item.raw_price) : item.marketValue || 0);
  } else {
    return item.raw_price ? parseFloat(item.raw_price) : (item.marketValue || 0);
  }
};

/**
 * Checks if an item is a sealed product
 * @param {Object} item - The item data
 * @returns {boolean} - True if the item is sealed
 */
export const isSealedProduct = (item) => {
  return item.itemType === 'Sealed Product' ||
         item.itemType === 'Sealed' ||
         item.source === 'sealed' ||
         item.name?.toLowerCase().includes('box') ||
         item.name?.toLowerCase().includes('bundle') ||
         item.name?.toLowerCase().includes('collection') ||
         item.name?.toLowerCase().includes('tin') ||
         item.name?.toLowerCase().includes('pack') ||
         item.name?.toLowerCase().includes('booster') ||
         item.name?.toLowerCase().includes('display') ||
         item.name?.toLowerCase().includes('case') ||
         item.name?.toLowerCase().includes('ultra-premium') ||
         item.name?.toLowerCase().includes('elite trainer') ||
         item.name?.toLowerCase().includes('premium') ||
         item.name?.toLowerCase().includes('etb') ||
         item.name?.toLowerCase().includes('vmax') ||
         item.name?.toLowerCase().includes('ex') && (item.name?.toLowerCase().includes('box') || item.name?.toLowerCase().includes('collection'));
};
