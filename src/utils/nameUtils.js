/**
 * Utility functions for cleaning and formatting item names
 */

/**
 * Removes set name from item name if it appears at the beginning
 * @param {string} itemName - The full item name
 * @param {string} setName - The set name to remove
 * @returns {string} - Cleaned item name without redundant set name
 */
export const getCleanItemName = (itemName, setName) => {
  // Ensure both parameters are strings
  if (!itemName || typeof itemName !== 'string') return itemName || '';
  if (!setName || typeof setName !== 'string') return itemName;
  
  // Check if the item name starts with the set name
  if (itemName.toLowerCase().startsWith(setName.toLowerCase())) {
    // Remove the set name and any following space/hyphen
    const remaining = itemName.substring(setName.length).trim();
    // Remove leading space, hyphen, or colon
    return remaining.replace(/^[\s\-:]+/, '').trim();
  }
  
  return itemName;
};

/**
 * Gets the display name for an item, using clean name if set name is available
 * @param {Object} item - Item object with name and set properties
 * @returns {string} - Clean display name
 */
export const getItemDisplayName = (item) => {
  if (!item) return '';
  
  // Ensure item.name is a string
  const itemName = typeof item.name === 'string' ? item.name : '';
  if (!itemName) return '';
  
  // If item has both name and set, try to clean the name
  if (itemName && item.set && typeof item.set === 'string') {
    return getCleanItemName(itemName, item.set);
  }
  
  // If item has set_name instead of set, use that
  if (itemName && item.set_name && typeof item.set_name === 'string') {
    return getCleanItemName(itemName, item.set_name);
  }
  
  // Fallback to original name
  return itemName;
};

/**
 * Gets the set name from an item object
 * @param {Object} item - Item object
 * @returns {string} - Set name
 */
export const getItemSetName = (item) => {
  if (!item) return '';
  
  // Ensure we return a string
  const setName = item.set || item.set_name || '';
  return typeof setName === 'string' ? setName : '';
};

/**
 * Gets the display name for a card with number suffix
 * @param {Object} card - Card object
 * @returns {string} - Display name with card number if available
 */
export const getCardDisplayName = (card) => {
  if (!card) return '';
  
  // Get the clean name
  const cleanName = getItemDisplayName(card);
  
  // Check if it's a single card (not a sealed product) and has a card number
  if (card.type !== 'product' && card.details?.cardNumber && typeof card.details.cardNumber === 'string') {
    return `${cleanName} #${card.details.cardNumber}`;
  }
  
  // Also check for cardNumber directly on the card object
  if (card.type !== 'product' && card.cardNumber && typeof card.cardNumber === 'string') {
    return `${cleanName} #${card.cardNumber}`;
  }
  
  // For sealed products or cards without numbers, return clean name
  return cleanName;
};
