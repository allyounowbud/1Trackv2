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
  if (!itemName || !setName) return itemName;
  
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
  
  // If item has both name and set, try to clean the name
  if (item.name && item.set) {
    return getCleanItemName(item.name, item.set);
  }
  
  // If item has set_name instead of set, use that
  if (item.name && item.set_name) {
    return getCleanItemName(item.name, item.set_name);
  }
  
  // Fallback to original name
  return item.name || '';
};

/**
 * Gets the set name from an item object
 * @param {Object} item - Item object
 * @returns {string} - Set name
 */
export const getItemSetName = (item) => {
  if (!item) return '';
  return item.set || item.set_name || '';
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
  if (card.type !== 'product' && card.details?.cardNumber) {
    return `${cleanName} #${card.details.cardNumber}`;
  }
  
  // For sealed products or cards without numbers, return clean name
  return cleanName;
};
