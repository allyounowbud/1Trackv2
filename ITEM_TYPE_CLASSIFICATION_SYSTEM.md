# Item Type Classification System

## Overview
This document outlines the proper item type classification system implemented to ensure items are correctly categorized for collection organization.

## Classification Rules

### 1. **Singles (Individual Cards)**
- **Ungraded**: Raw cards without any grading company certification
- **PSA**: Cards graded by Professional Sports Authenticator (PSA)
- **Beckett**: Cards graded by Beckett Grading Services (BGS)
- **CGC**: Cards graded by Certified Guaranty Company (CGC)
- **SGC**: Cards graded by Sportscard Guaranty Corporation (SGC)

### 2. **Sealed Products**
- Always classified as **"Sealed Product"**
- Includes: boxes, bundles, collections, tins, packs, boosters, displays, cases
- Detection based on item name keywords or explicit `itemType`

### 3. **Custom Items**
- Always classified as **"Custom"**
- Includes manually added items and custom collectibles
- Source: `manual` or `custom`

## Implementation Details

### Utility Functions (`src/utils/itemTypeUtils.js`)

#### `getItemTypeClassification(item, cardType, source)`
- **Parameters:**
  - `item`: Item data object
  - `cardType`: Selected card type (e.g., 'raw', 'psa_10', 'bgs_9')
  - `source`: Item source ('api', 'manual', 'custom')
- **Returns:** Proper item type classification string

#### `getGradeFromCardType(cardType)`
- Extracts grade number from card type string
- Returns `null` for raw/ungraded items

#### `getCompanyFromCardType(cardType)`
- Extracts company name from card type string
- Returns `'raw'` for ungraded items

### Card Type Format
- **Raw**: `'raw'`
- **Graded**: `'{company}_{grade}'` (e.g., 'psa_10', 'bgs_9', 'cgc_8')

## Updated Components

### 1. **CartBottomMenu.jsx**
- Passes `itemCardTypes` to order creation
- Handles card type selection with proper grade tracking
- Uses utility functions for type classification

### 2. **SearchApi.jsx**
- Uses `getItemTypeClassification()` when creating items
- Properly classifies API-sourced items based on card type selection

### 3. **AddToCollectionModal.jsx**
- Classifies items based on source and card type
- Handles both API and manual item sources

### 4. **CustomItemModal.jsx**
- Forces custom items to be classified as "Custom"
- Ensures manual items are properly categorized

### 5. **Collection.jsx**
- AddItemForm uses proper type classification
- Handles sealed products, singles, and custom items

### 6. **MultiItemOrderModal.jsx**
- Classifies items based on source and type
- Maintains consistency across bulk operations

## Database Impact

### Items Table (`item_type` column)
- **Before**: Mostly "Card" for everything
- **After**: Proper classification:
  - `"Ungraded"` for raw cards
  - `"PSA"`, `"Beckett"`, `"CGC"`, `"SGC"` for graded cards
  - `"Sealed Product"` for sealed items
  - `"Custom"` for custom items

### Benefits
1. **Better Organization**: Items can be filtered and grouped by type
2. **Accurate Reporting**: Collection statistics reflect proper categorization
3. **Consistent Data**: All item creation paths use the same classification logic
4. **Future-Proof**: Easy to add new grading companies or item types

## Testing Checklist

- [ ] Single cards default to "Ungraded"
- [ ] PSA graded cards show as "PSA"
- [ ] Beckett graded cards show as "Beckett"
- [ ] CGC graded cards show as "CGC"
- [ ] Sealed products show as "Sealed Product"
- [ ] Custom items show as "Custom"
- [ ] Multi-select orders maintain proper classification
- [ ] Collection view groups items correctly by type

## Migration Notes

Existing items in the database will retain their current `item_type` values. New items added after this implementation will use the proper classification system. Consider running a data migration script to update existing items if needed.

