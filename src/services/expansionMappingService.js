/**
 * Expansion Mapping Service
 * Maps between our internal expansion IDs and TCGCSV group IDs
 * This allows us to use TCGCSV data while maintaining our existing expansion system
 */

class ExpansionMappingService {
  constructor() {
    this.mappings = new Map();
    this.reverseMappings = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the mapping service with known expansion mappings
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('🗺️ Initializing Expansion Mapping Service...');
      
      // Known mappings from our expansion IDs to TCGCSV group IDs
      // Based on actual TCGCSV API data from https://tcgcsv.com/tcgplayer/3/groups
      const knownMappings = {
        // Mega Evolution Era (2025)
        'me01': 24380,   // ME01: Mega Evolution
        'me02': 24448,   // ME02: Phantasmal Flames
        'mep': 24451,    // ME: Mega Evolution Promo
        'mee': 24461,    // MEE: Mega Evolution Energies
        
        // Scarlet & Violet Era (Latest)
        'sv10': 24269,   // SV10: Destined Rivals
        'sv09': 24073,   // SV09: Journey Together
        'sv08': 23651,   // SV08: Surging Sparks
        'sv07': 23537,   // SV07: Stellar Crown
        'sv06': 23473,   // SV06: Twilight Masquerade
        'sv05': 23381,   // SV05: Temporal Forces
        'sv04': 23286,   // SV04: Paradox Rift
        'sv03': 23143,   // SV03: Obsidian Flames
        'sv02': 23072,   // SV02: Paldea Evolved
        'sv01': 23001,   // SV01: Scarlet & Violet
        'pre': 23821,    // SV: Prismatic Evolutions
        'sfa': 23529,    // SV: Shrouded Fable
        'paf': 23353,    // SV: Paldean Fates
        'mew': 23237,    // SV: Scarlet & Violet 151
        'blk': 24325,    // SV: Black Bolt
        'wht': 24326,    // SV: White Flare
        
        // Sword & Shield Era
        'swsh12': 22868, // SWSH12: Silver Tempest
        'swsh11': 22811, // SWSH11: Lost Origin
        'swsh10': 22732, // SWSH10: Astral Radiance
        'swsh09': 22649, // SWSH09: Brilliant Stars
        'swsh08': 22561, // SWSH08: Fusion Strike
        'swsh07': 22462, // SWSH07: Evolving Skies
        'swsh06': 22390, // SWSH06: Chilling Reign
        'swsh05': 22318, // SWSH05: Battle Styles
        'swsh045': 22280, // SWSH04.5: Shining Fates
        'swsh04': 22197, // SWSH04: Vivid Voltage
        'swsh035': 22144, // SWSH03.5: Champion's Path
        'swsh03': 22066, // SWSH03: Darkness Ablaze
        'swsh02': 21993, // SWSH02: Rebel Clash
        'swsh01': 21901, // SWSH01: Sword & Shield
        
        // Sun & Moon Era
        'sm12': 21702,   // SM12: Cosmic Eclipse
        'sm11': 21618,   // SM11: Unified Minds
        'sm10': 21524,   // SM10: Unbroken Bonds
        'sm09': 21441,   // SM09: Team Up
        'sm08': 21376,   // SM08: Lost Thunder
        'sm075': 21296,  // SM07.5: Celestial Storm
        'sm07': 21233,   // SM07: Celestial Storm
        'sm06': 21148,   // SM06: Forbidden Light
        'sm05': 21069,   // SM05: Ultra Prism
        'sm04': 20984,   // SM04: Crimson Invasion
        'sm035': 20914,  // SM03.5: Shining Legends
        'sm03': 20858,   // SM03: Burning Shadows
        'sm02': 20758,   // SM02: Guardians Rising
        'sm01': 20671,   // SM01: Sun & Moon Base Set
        
        // XY Era
        'xy12': 20535,   // XY12: Evolutions
        'xy11': 20466,   // XY11: Steam Siege
        'xy10': 20387,   // XY10: Fates Collide
        'xy09': 20308,   // XY09: BREAKpoint
        'xy08': 20218,   // XY08: BREAKthrough
        'xy07': 20137,   // XY07: Ancient Origins
        'xy06': 20057,   // XY06: Roaring Skies
        'xy05': 19977,   // XY05: Primal Clash
        'xy04': 19898,   // XY04: Phantom Forces
        'xy03': 19812,   // XY03: Furious Fists
        'xy02': 19723,   // XY02: Flashfire
        'xy01': 19636,   // XY01: XY Base Set
        
        // Black & White Era
        'bw11': 7829,    // BW11: Legendary Treasures
        'bw10': 7612,    // BW10: Plasma Blast
        'bw09': 7552,    // BW09: Plasma Freeze
        'bw08': 7490,    // BW08: Plasma Storm
        'bw07': 7404,    // BW07: Boundaries Crossed
        'bw06': 7346,    // BW06: Dragons Exalted
        'bw05': 7282,    // BW05: Dark Explorers
        'bw04': 7224,    // BW04: Next Destinies
        'bw03': 7166,    // BW03: Noble Victories
        'bw02': 7106,    // BW02: Emerging Powers
        'bw01': 7052,    // BW01: Black & White
        
        // HeartGold & SoulSilver Era
        'hgss04': 6988,  // HGSS04: Triumphant
        'hgss03': 6931,  // HGSS03: Undaunted
        'hgss02': 6878,  // HGSS02: Unleashed
        'hgss01': 6816,  // HGSS01: HeartGold & SoulSilver
        'col': 7050,     // Call of Legends
        
        // Platinum Era
        'pl04': 6743,    // PL04: Arceus
        'pl03': 6685,    // PL03: Supreme Victors
        'pl02': 6625,    // PL02: Rising Rivals
        'pl01': 6567,    // PL01: Platinum
        
        // Diamond & Pearl Era
        'dp07': 6507,    // DP07: Stormfront
        'dp06': 6446,    // DP06: Legends Awakened
        'dp05': 6386,    // DP05: Majestic Dawn
        'dp04': 6324,    // DP04: Great Encounters
        'dp03': 6264,    // DP03: Secret Wonders
        'dp02': 6198,    // DP02: Mysterious Treasures
        'dp01': 6140,    // DP01: Diamond & Pearl
        
        // EX Era
        'pk': 1445,      // EX Power Keepers
        'df': 1443,      // EX Dragon Frontiers
        'cg': 1444,      // EX Crystal Guardians
        'hp': 1448,      // EX Holon Phantoms
        'lm': 1437,      // EX Legend Maker
        'ds': 1438,      // EX Delta Species
        'uf': 1435,      // EX Unseen Forces
        'em': 1449,      // EX Emerald
        'dx': 1436,      // EX Deoxys
        'trr': 1433,     // EX Team Rocket Returns
        'frlg': 1431,    // EX FireRed & LeafGreen
        'hl': 1430,      // EX Hidden Legends
        'ma': 1429,      // EX Team Magma vs Team Aqua
        'dr': 1428,      // EX Dragon
        'ss': 1427,      // EX Sandstorm
        'rs': 1426,      // EX Ruby & Sapphire
        
        // e-Card Era
        'sk': 647,       // Skyridge
        'aq': 649,       // Aquapolis
        'ex': 646,       // Expedition Base Set
        
        // Neo Era
        'n4': 1395,      // Neo Destiny
        'n3': 1397,      // Neo Revelation
        'n2': 1434,      // Neo Discovery
        'n1': 1396,      // Neo Genesis
        
        // Gym Era
        'g2': 1440,      // Gym Challenge
        'g1': 1441,      // Gym Heroes
        
        // Original Era
        'tr': 1373,      // Team Rocket
        'bs2': 605,      // Base Set 2
        'fo': 630,       // Fossil
        'ju': 635,       // Jungle
        'bs': 604,       // Base Set
        'bss': 1663,     // Base Set (Shadowless)
        
        // Special/Promo Sets
        'cl': 23323,     // Trading Card Game Classic
        'si': 648,       // Southern Islands
        'pr': 1418,      // WoTC Promo
        'mcd23': 23306,  // McDonald's Promos 2023
        'mcd24': 24163,  // McDonald's Promos 2024
        'tot23': 23561,  // Trick or Trade BOOster Bundle 2023
        'tot24': 23266,  // Trick or Trade BOOster Bundle 2024
        'ba24': 23520,   // Battle Academy 2024
        'mfb': 23330,    // My First Battle
      };

      // Build bidirectional mappings
      for (const [ourId, tcgcsvId] of Object.entries(knownMappings)) {
        this.mappings.set(ourId, tcgcsvId);
        this.reverseMappings.set(tcgcsvId, ourId);
      }

      this.isInitialized = true;
      console.log(`✅ Expansion Mapping Service initialized with ${this.mappings.size} mappings`);
      return true;
    } catch (error) {
      console.error('❌ Error initializing Expansion Mapping Service:', error);
      this.isInitialized = true; // Still mark as initialized to allow fallback
      return false;
    }
  }

  /**
   * Get TCGCSV group ID from our expansion ID
   * @param {string} expansionId - Our internal expansion ID
   * @returns {number|null} TCGCSV group ID or null if not found
   */
  getTcgcsvGroupId(expansionId) {
    if (!this.isInitialized) {
      console.warn('⚠️ Expansion Mapping Service not initialized');
      return null;
    }

    const groupId = this.mappings.get(expansionId);
    if (!groupId) {
      console.warn(`⚠️ No TCGCSV mapping found for expansion: ${expansionId}`);
    }
    return groupId || null;
  }

  /**
   * Get our expansion ID from TCGCSV group ID
   * @param {number} groupId - TCGCSV group ID
   * @returns {string|null} Our expansion ID or null if not found
   */
  getOurExpansionId(groupId) {
    if (!this.isInitialized) {
      console.warn('⚠️ Expansion Mapping Service not initialized');
      return null;
    }

    return this.reverseMappings.get(groupId) || null;
  }

  /**
   * Check if we have a mapping for an expansion
   * @param {string} expansionId - Our internal expansion ID
   * @returns {boolean} True if mapping exists
   */
  hasMapping(expansionId) {
    return this.mappings.has(expansionId);
  }

  /**
   * Get all known mappings
   * @returns {Map} All expansion mappings
   */
  getAllMappings() {
    return new Map(this.mappings);
  }

  /**
   * Add a new mapping
   * @param {string} expansionId - Our expansion ID
   * @param {number} groupId - TCGCSV group ID
   */
  addMapping(expansionId, groupId) {
    this.mappings.set(expansionId, groupId);
    this.reverseMappings.set(groupId, expansionId);
    console.log(`📝 Added mapping: ${expansionId} -> ${groupId}`);
  }

  /**
   * Remove a mapping
   * @param {string} expansionId - Our expansion ID
   */
  removeMapping(expansionId) {
    const groupId = this.mappings.get(expansionId);
    if (groupId) {
      this.mappings.delete(expansionId);
      this.reverseMappings.delete(groupId);
      console.log(`🗑️ Removed mapping: ${expansionId} -> ${groupId}`);
    }
  }

  /**
   * Get mapping statistics
   * @returns {Object} Mapping statistics
   */
  getStats() {
    return {
      totalMappings: this.mappings.size,
      isInitialized: this.isInitialized,
      sampleMappings: Array.from(this.mappings.entries()).slice(0, 5)
    };
  }
}

// Create and export singleton instance
const expansionMappingService = new ExpansionMappingService();
export default expansionMappingService;
