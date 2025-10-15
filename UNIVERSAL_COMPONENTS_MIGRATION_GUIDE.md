# Universal Components Migration Guide

This guide explains how to migrate existing pages to use the new universal components for consistent styling and behavior across the entire application.

## Overview

We've created a set of universal components that standardize the UI across all pages:

- **UniversalCard** - Standardized item cards with variants for different page types
- **UniversalBulkMenu** - Consistent bulk actions menu
- **UniversalOrderBook** - Unified order management interface
- **UniversalSearchBar** - Standardized search functionality
- **UniversalGrid** - Responsive grid layouts

## Components Created

### 1. UniversalCard (`src/components/ui/UniversalCard.jsx`)

**Purpose**: Replaces all page-specific card implementations with a single, consistent component.

**Variants**:
- `collection` - For collection page items (shows profit/loss, sealed status)
- `pokemon` - For Pokemon cards (3:4 aspect ratio, card number)
- `search` - For search results (standard card layout)

**Key Features**:
- Automatic image handling with SafeImage fallback
- Selection state management
- Cart quantity indicators
- Consistent profit/loss calculations
- Responsive text sizing

### 2. UniversalBulkMenu (`src/components/ui/UniversalBulkMenu.jsx`)

**Purpose**: Standardizes bulk actions across all pages.

**Features**:
- Configurable action buttons
- Variant-specific styling
- Custom action support
- Consistent button layouts

### 3. UniversalOrderBook (`src/components/ui/UniversalOrderBook.jsx`)

**Purpose**: Unified order management interface.

**Features**:
- Edit mode with form validation
- Mark as sold functionality
- Delete orders
- Quantity locking for partially sold orders
- Responsive layout

### 4. UniversalSearchBar (`src/components/ui/UniversalSearchBar.jsx`)

**Purpose**: Consistent search experience across all pages.

**Features**:
- Variant-specific styling
- Clear button
- Results count display
- Responsive design

### 5. UniversalGrid (`src/components/ui/UniversalGrid.jsx`)

**Purpose**: Standardized grid layouts with responsive behavior.

**Features**:
- Automatic responsive columns
- Variant-specific layouts
- Selection hints
- Bulk menu spacing

## Migration Steps

### Step 1: Update Imports

Replace existing component imports with universal components:

```javascript
// Before
import ItemCard from '../components/cards/ItemCard';

// After
import { UniversalCard, UniversalGrid, UniversalBulkMenu } from '../components/ui';
```

### Step 2: Replace Card Implementations

**Before (Collection.jsx)**:
```javascript
<div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden">
  <div className="aspect-[1/1] bg-gray-100 flex items-center justify-center p-4">
    {/* Card content */}
  </div>
</div>
```

**After**:
```javascript
<UniversalCard
  item={item}
  variant="collection"
  isSelected={selectedItems.has(item.id)}
  showSelection={isBulkSelectionMode}
  onClick={() => handleItemClick(item)}
  onLongPress={() => handleLongPress(item.id)}
/>
```

### Step 3: Replace Grid Layouts

**Before**:
```javascript
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
  {/* Grid items */}
</div>
```

**After**:
```javascript
<UniversalGrid
  variant="collection"
  showSelectionHint={!isBulkSelectionMode}
  hasBulkMenu={showBulkMenu}
>
  {/* Grid items */}
</UniversalGrid>
```

### Step 4: Replace Bulk Menus

**Before**: Custom bulk menu implementation

**After**:
```javascript
<UniversalBulkMenu
  isVisible={showBulkMenu}
  selectedCount={selectedItems.size}
  variant="collection"
  onAddToCart={handleAddToCart}
  onViewOrderBook={handleViewOrderBook}
  onOverridePrice={handleOverridePrice}
  onDelete={handleDelete}
  onCancel={handleCancel}
/>
```

### Step 5: Replace Search Bars

**Before**:
```javascript
<div className="relative">
  <input
    type="text"
    placeholder="Search..."
    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg"
  />
</div>
```

**After**:
```javascript
<UniversalSearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search your items..."
  variant="collection"
  showResultsCount={true}
  resultsCount={filteredItems.length}
  onClear={handleSearchClear}
/>
```

## Page-Specific Migration

### Collection Page (`src/pages/Collection.jsx`)

**Changes needed**:
1. Replace card grid with `UniversalGrid`
2. Replace individual cards with `UniversalCard` (variant="collection")
3. Replace bulk menu with `UniversalBulkMenu`
4. Replace search bar with `UniversalSearchBar`
5. Replace order book modal with `UniversalOrderBook`

**Benefits**:
- Consistent styling with other pages
- Reduced code duplication
- Easier maintenance
- Better responsive behavior

### Pokemon Page (`src/pages/PokemonPage.jsx`)

**Changes needed**:
1. Replace expansion grid with `UniversalGrid` (variant="pokemon")
2. Replace card items with `UniversalCard` (variant="pokemon")
3. Replace bulk menu with `UniversalBulkMenu`
4. Add search functionality with `UniversalSearchBar`

**Benefits**:
- 3:4 aspect ratio for Pokemon cards
- Consistent selection behavior
- Unified bulk actions

### Search Page (`src/pages/SearchApi.jsx`)

**Changes needed**:
1. Replace search results grid with `UniversalGrid` (variant="search")
2. Replace result cards with `UniversalCard` (variant="search")
3. Replace bulk menu with `UniversalBulkMenu`
4. Enhance search bar with `UniversalSearchBar`

**Benefits**:
- Consistent search experience
- Better result display
- Unified cart functionality

## Testing Strategy

### Phase 1: Component Testing
1. Test each universal component in isolation
2. Verify all variants work correctly
3. Test responsive behavior
4. Validate accessibility

### Phase 2: Page Integration
1. Migrate one page at a time
2. Test all functionality on migrated page
3. Compare with original implementation
4. Fix any issues before proceeding

### Phase 3: Cross-Page Testing
1. Test navigation between pages
2. Verify consistent behavior
3. Test edge cases
4. Performance testing

## Rollback Plan

If issues arise during migration:

1. **Component Level**: Keep original components alongside universal ones
2. **Page Level**: Use feature flags to switch between implementations
3. **Full Rollback**: Revert to original code using git

## Benefits After Migration

### For Developers
- **Reduced Code Duplication**: Single implementation for common UI patterns
- **Easier Maintenance**: Changes to universal components affect all pages
- **Consistent API**: Same props and behavior across components
- **Better Testing**: Test components once, use everywhere

### For Users
- **Consistent Experience**: Same interactions across all pages
- **Better Performance**: Optimized, tested components
- **Improved Accessibility**: Built-in accessibility features
- **Responsive Design**: Works well on all device sizes

## Next Steps

1. **Review Components**: Test universal components thoroughly
2. **Choose Migration Order**: Start with least complex page
3. **Update One Page**: Migrate Collection page first as proof of concept
4. **Validate Results**: Ensure functionality is preserved
5. **Continue Migration**: Move to other pages systematically
6. **Clean Up**: Remove old component code once migration is complete

## Component API Reference

See the individual component files for detailed prop documentation:
- `src/components/ui/UniversalCard.jsx`
- `src/components/ui/UniversalBulkMenu.jsx`
- `src/components/ui/UniversalOrderBook.jsx`
- `src/components/ui/UniversalSearchBar.jsx`
- `src/components/ui/UniversalGrid.jsx`

## Example Implementation

See `src/examples/UniversalComponentsExample.jsx` for a complete example of how to use all universal components together.
