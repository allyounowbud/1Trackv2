# TCGCSV Expansion Mapping Guide

## Problem Statement

TCGCSV uses different identifiers for Pokemon expansions than Scrydex:
- **Scrydex**: Uses expansion IDs like `me1`, `sv08`, `swsh12`
- **TCGCSV**: Uses group IDs like `24380`, `23651`, `22868`

We need a reliable way to link these two systems together.

## Solution: Database-Driven Mapping

Instead of maintaining hardcoded mappings in JavaScript, we store TCGCSV group IDs directly in the `pokemon_expansions` table. This approach provides:

✅ **Persistence**: Mappings survive code changes and deployments  
✅ **Flexibility**: Easy to update mappings via SQL or admin interface  
✅ **Accuracy**: Mappings stay with the expansion data  
✅ **Scalability**: No need to update code for new expansions  

---

## Implementation

### 1. Database Schema Change

Added a new column to `pokemon_expansions`:

```sql
ALTER TABLE pokemon_expansions 
ADD COLUMN tcgcsv_group_id INTEGER;

CREATE INDEX idx_pokemon_expansions_tcgcsv_group_id 
ON pokemon_expansions(tcgcsv_group_id);
```

### 2. Service Layer Changes

**PokemonGameService** now:
1. Looks up `tcgcsv_group_id` from database
2. Uses TCGCSV if group ID exists
3. Falls back to database if not

```javascript
async getTcgcsvGroupIdFromDatabase(expansionId) {
  const { data } = await supabase
    .from('pokemon_expansions')
    .select('tcgcsv_group_id, name, code')
    .eq('id', expansionId)
    .single();

  return data?.tcgcsv_group_id || null;
}
```

---

## How to Use

### Running the Migration

Execute the SQL migration to add mappings:

```bash
# Run via Supabase CLI
supabase db push add-tcgcsv-group-id-to-expansions.sql

# Or run directly in Supabase SQL Editor
# Copy contents of add-tcgcsv-group-id-to-expansions.sql
```

### Verifying Mappings

Check which expansions have TCGCSV mappings:

```sql
-- See all mapped expansions
SELECT id, name, code, tcgcsv_group_id 
FROM pokemon_expansions 
WHERE tcgcsv_group_id IS NOT NULL
ORDER BY release_date DESC;

-- See unmapped expansions
SELECT id, name, code, release_date
FROM pokemon_expansions 
WHERE tcgcsv_group_id IS NULL
ORDER BY release_date DESC;
```

### Adding New Mappings

When new expansions are added, map them manually:

```sql
-- Example: Mapping a new expansion
UPDATE pokemon_expansions 
SET tcgcsv_group_id = 24500  -- TCGCSV group ID
WHERE id = 'sv11'             -- Your expansion ID
   OR code = 'SVX';           -- Or by code
```

---

## Finding TCGCSV Group IDs

### Method 1: Browse TCGCSV Groups API

```bash
curl https://tcgcsv.com/tcgplayer/3/groups | jq '.results[] | {groupId, name, abbreviation}'
```

Example output:
```json
{
  "groupId": 24380,
  "name": "ME01: Mega Evolution",
  "abbreviation": "MEG"
}
```

### Method 2: Use TCGplayer URL

If you know the TCGplayer page for an expansion:
```
https://www.tcgplayer.com/search/pokemon/mega-evolution
                                            ↑
                                    This is the slug
```

Then search TCGCSV groups by name.

### Method 3: Automated Discovery Script

```javascript
// Fetch all TCGCSV groups
const response = await fetch('https://tcgcsv.com/tcgplayer/3/groups');
const data = await response.json();

// Search by name
const megaEvolution = data.results.find(g => 
  g.name.includes('Mega Evolution')
);
console.log(megaEvolution.groupId); // 24380
```

---

## Pre-Populated Mappings

The migration script includes mappings for **127 expansions**:

| Era | Expansions | Example |
|-----|------------|---------|
| **Mega Evolution** | ME01-ME02, MEP, MEE | 24380, 24448 |
| **Scarlet & Violet** | SV01-SV10, PRE, SFA, PAF, MEW | 23001-24269 |
| **Sword & Shield** | SWSH01-SWSH12 | 21901-22868 |
| **Sun & Moon** | SM01-SM12 | 20671-21702 |
| **XY** | XY01-XY12 | 19636-20535 |
| **Black & White** | BW01-BW11 | 7052-7829 |
| **Classic** | Base, Jungle, Fossil, etc. | 604-1663 |

---

## Expansion Mapping Table

### Most Recent Expansions

| Expansion Name | Your ID | Code | TCGCSV Group ID |
|----------------|---------|------|-----------------|
| ME01: Mega Evolution | me1 | MEG | 24380 |
| ME02: Phantasmal Flames | me2 | PFL | 24448 |
| SV10: Destined Rivals | sv10 | DRI | 24269 |
| SV09: Journey Together | sv09 | JTG | 24073 |
| SV08: Surging Sparks | sv08 | SSP | 23651 |
| SV07: Stellar Crown | sv07 | SCR | 23537 |
| SV06: Twilight Masquerade | sv06 | TWM | 23473 |
| SV05: Temporal Forces | sv05 | TEF | 23381 |
| Prismatic Evolutions | pre | PRE | 23821 |
| Scarlet & Violet 151 | mew | MEW | 23237 |

### Sword & Shield Era

| Expansion Name | Your ID | Code | TCGCSV Group ID |
|----------------|---------|------|-----------------|
| SWSH12: Silver Tempest | swsh12 | SWSH12 | 22868 |
| SWSH11: Lost Origin | swsh11 | SWSH11 | 22811 |
| SWSH10: Astral Radiance | swsh10 | SWSH10 | 22732 |
| SWSH09: Brilliant Stars | swsh09 | SWSH9 | 22649 |
| SWSH08: Fusion Strike | swsh08 | SWSH8 | 22561 |
| SWSH07: Evolving Skies | swsh07 | SWSH7 | 22462 |
| Shining Fates | swsh45 | SWSH45 | 22280 |

---

## Testing the Integration

### Test 1: Check Database Mapping

```sql
SELECT id, name, tcgcsv_group_id 
FROM pokemon_expansions 
WHERE id = 'me1';
```

Expected: `tcgcsv_group_id = 24380`

### Test 2: Fetch Sealed Products

```javascript
const result = await pokemonGameService.getSealedProductsByExpansion('me1', {
  page: 1,
  pageSize: 10
});

console.log(`Found ${result.total} sealed products`);
```

Expected output:
```
✅ Found TCGCSV group ID 24380 for expansion me1 (ME01: Mega Evolution)
📦 Fetching sealed products from TCGCSV for expansion me1 (group 24380)
✅ Found 9 sealed products from TCGCSV for expansion me1
```

### Test 3: View Sealed Products

Navigate to: `/pokemon/expansions/me1` and toggle to "SEALED" view

Expected: See products like:
- Mega Evolution Elite Trainer Box [Mega Gardevoir]
- Mega Evolution Booster Box
- Mega Evolution Enhanced Booster Box
- Single Pack Blisters

---

## Troubleshooting

### Issue: No sealed products found

**Check 1**: Verify mapping exists
```sql
SELECT tcgcsv_group_id FROM pokemon_expansions WHERE id = 'your_expansion_id';
```

**Check 2**: Verify TCGCSV has products
```bash
curl https://tcgcsv.com/tcgplayer/3/24380/products | jq '.totalItems'
```

**Check 3**: Check console logs
Look for messages like:
- `⚠️ No TCGCSV group ID set for expansion...`
- `📦 Fetching sealed products from TCGCSV...`

### Issue: Wrong products displayed

**Possible causes**:
1. Incorrect group ID mapping
2. TCGCSV has updated their group IDs

**Solution**: Re-verify the group ID from TCGCSV API

### Issue: Expansion not in database

**Solution**: The expansion needs to be synced from Scrydex first
```sql
-- Check if expansion exists
SELECT * FROM pokemon_expansions WHERE id = 'me1';

-- If not, sync from Scrydex or add manually
```

---

## Benefits Over Hardcoded Mappings

### ✅ Before (Hardcoded in JavaScript)

```javascript
const knownMappings = {
  'me01': 24380,
  'sv08': 23651,
  // ...100+ more lines
};
```

**Problems**:
- ❌ Code change required for new expansions
- ❌ Mappings lost if service is replaced
- ❌ No audit trail of changes
- ❌ Can't update without deployment

### ✅ After (Database-Driven)

```sql
UPDATE pokemon_expansions 
SET tcgcsv_group_id = 24500 
WHERE id = 'sv11';
```

**Benefits**:
- ✅ Update via SQL (no code changes)
- ✅ Persists with expansion data
- ✅ Database audit logs track changes
- ✅ Update anytime without deployment
- ✅ Admin interface can manage mappings

---

## Future Enhancements

### 1. Admin Interface for Mapping

Create a UI where admins can:
- View all expansions and their TCGCSV mappings
- Search TCGCSV groups by name
- Update mappings with a click
- See which expansions need mapping

### 2. Automatic Discovery

```javascript
async function autoDiscoverMapping(expansionName, expansionCode) {
  // Fetch all TCGCSV groups
  const groups = await tcgcsvService.getGroups();
  
  // Find best match by name or code
  const match = groups.find(g => 
    g.name.includes(expansionName) ||
    g.abbreviation === expansionCode
  );
  
  if (match) {
    // Auto-suggest to admin
    return match.groupId;
  }
}
```

### 3. Bulk Import Tool

```javascript
// Import all unmapped expansions
async function bulkMapExpansions() {
  const unmapped = await getUnmappedExpansions();
  const tcgcsvGroups = await tcgcsvService.getGroups();
  
  for (const expansion of unmapped) {
    const match = findBestMatch(expansion, tcgcsvGroups);
    if (match.confidence > 0.9) {
      await updateExpansionMapping(expansion.id, match.groupId);
    }
  }
}
```

---

## Summary

This database-driven approach provides a **flexible, scalable, and maintainable** solution for linking Scrydex and TCGCSV expansion identifiers. The integration is complete and ready for production use! 🎯

For questions or issues, check:
- TCGCSV API: https://tcgcsv.com/
- TCGCSV Groups: https://tcgcsv.com/tcgplayer/3/groups
- This documentation: `TCGCSV_EXPANSION_MAPPING_GUIDE.md`
