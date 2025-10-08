# Sealed Products Expansion ID Fix

## Problem
Sealed products in the database were showing for the wrong expansions because they had incorrect `expansion_id` values that didn't match the actual expansion IDs in the `pokemon_expansions` table.

## Root Cause
When the sealed products were initially populated, the `expansion_id` field was set with incorrect values like:
- `swsh10`, `swsh5`, `sm3`, `sm7`, `swsh35`, `sm12`

These IDs didn't correspond to any actual expansions in the `pokemon_expansions` table, which uses IDs like:
- `sv3pt5`, `sv10`, `sv9`, `sv7`, etc.

## Solution
Created a mapping script that used the `episode_name` field (which contained correct set names like "Celebrations", "Silver Tempest", "Stellar Crown", etc.) to map sealed products to their correct expansion IDs.

## Mapping Applied
- "Celebrations" → `cel25c` (36 products)
- "Silver Tempest" → `swsh12` (14 products) 
- "Stellar Crown" → `sv7` (30 products)
- "Paldean Fates" → `sv4pt5` (17 products)
- "Scarlet & Violet" → `svp_ja` (36 products)

## Results
- ✅ **133 sealed products** updated with correct expansion_ids
- ✅ **All sealed products** now have valid expansion_ids that match actual expansions
- ✅ **Expansion-specific searches** now work correctly
- ✅ **Sealed products display** only for their correct expansions

## Verification
Confirmed that sealed products now appear correctly when viewing specific expansions:
- Stellar Crown (sv7): 30 sealed products
- Celebrations (cel25c): 36 sealed products  
- Paldean Fates (sv4pt5): 17 sealed products
- Silver Tempest (swsh12): 14 sealed products
- And many more...

## Impact
Users can now:
1. Select an expansion and see only the sealed products that belong to that set
2. Use the "Sealed" toggle to view sealed products for the correct expansion
3. Search for sealed products and get accurate results filtered by expansion

The sealed products database is now properly aligned with the pokemon_expansions table.

