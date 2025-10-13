# Global Header Implementation

## Summary
Successfully implemented a global header with search bar that appears on all pages except the settings page, matching the design shown in the image.

## What Was Implemented

### 1. **GlobalHeader Component** (`src/components/layout/GlobalHeader.jsx`)
- **Fixed position header** that stays at the top of the app
- **Game selector dropdown** with all TCG options (All, Pokémon, Lorcana, Magic, Gundam, Other)
- **Search bar** with placeholder text that changes based on selected game
- **Clear button** (X icon) that appears when there's text
- **Search button** with magnifying glass icon
- **Dark theme styling** matching the app's design system

### 2. **GlobalHeaderContext** (`src/contexts/GlobalHeaderContext.jsx`)
- **Context provider** for managing global header state
- **Search query state** shared across all pages
- **Selected game state** for the dropdown
- **Search handler function** that pages can register to handle searches

### 3. **ResponsiveLayout Integration** (`src/components/layout/ResponsiveLayout.jsx`)
- **Conditional rendering** - shows header on all pages except `/settings`
- **Proper spacing** - adds `pt-[50px]` to content when header is visible
- **Desktop and mobile support** - works on both layouts

### 4. **App.jsx Integration**
- **Added GlobalHeaderProvider** to wrap the entire app
- **Context available** to all pages and components

### 5. **Page Integration**

#### SearchApi.jsx
- **Removed custom header** - now uses global header
- **Connected to global context** - handles searches from global header
- **Maintains existing functionality** - all search features still work

#### PokemonPage.jsx
- **Connected to global context** - handles searches from global header
- **Maintains existing functionality** - all page features still work

## Features

### ✅ **Always Visible**
- Header appears on all pages except settings
- Fixed position at top of screen
- Consistent across desktop and mobile

### ✅ **Game Selection**
- Dropdown with all TCG options
- Visual icons for each game
- Proper navigation to game-specific pages
- "Coming Soon" badges for disabled games

### ✅ **Search Functionality**
- Dynamic placeholder text based on selected game
- Clear button when text is present
- Search button for form submission
- Integrated with page-specific search logic

### ✅ **Dark Theme**
- Matches app's dark theme design
- Proper contrast and colors
- Consistent with existing UI elements

### ✅ **Responsive Design**
- Works on both desktop and mobile
- Proper spacing and layout
- Touch-friendly interactions

## Technical Details

### GlobalHeader Component Structure
```jsx
<div className="fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-800">
  <div className="w-full pl-4 pr-0 h-[50px] flex items-center gap-1">
    {/* Game Selector */}
    <div className="relative game-dropdown">
      <button onClick={() => setShowGameDropdown(!showGameDropdown)}>
        {renderGameIcon(selectedGame?.icon, "w-4 h-4")}
        <ChevronDown className="text-gray-400" size={14} />
      </button>
      
      {/* Dropdown Menu */}
      {showGameDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          {/* Game options */}
        </div>
      )}
    </div>
    
    {/* Search Bar */}
    <form onSubmit={handleSearch}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={getSearchPlaceholder()}
      />
      {searchQuery && (
        <button onClick={() => setSearchQuery('')}>
          <X size={16} />
        </button>
      )}
      <button type="submit">
        <Search size={20} />
      </button>
    </form>
  </div>
</div>
```

### Context Integration
```jsx
// In pages that need to handle global search
const { setOnSearch } = useGlobalHeader();

useEffect(() => {
  setOnSearch(() => handleGlobalSearch);
}, [setOnSearch]);
```

### Conditional Rendering
```jsx
// In ResponsiveLayout
const shouldShowGlobalHeader = !location.pathname.startsWith('/settings');

return (
  <div>
    {shouldShowGlobalHeader && <GlobalHeader />}
    <div className={`content ${shouldShowGlobalHeader ? 'pt-[50px]' : ''}`}>
      {children}
    </div>
  </div>
);
```

## Benefits

### 1. **Consistency**
- Same search experience across all pages
- Unified game selection interface
- Consistent visual design

### 2. **User Experience**
- Always accessible search functionality
- Quick game switching
- Intuitive navigation

### 3. **Maintainability**
- Single source of truth for header
- Easy to update and modify
- Centralized search logic

### 4. **Performance**
- Context-based state management
- Efficient re-rendering
- Optimized component structure

## Files Modified
- `src/components/layout/GlobalHeader.jsx` - New global header component
- `src/contexts/GlobalHeaderContext.jsx` - New context for global state
- `src/components/layout/ResponsiveLayout.jsx` - Integrated global header
- `src/App.jsx` - Added GlobalHeaderProvider
- `src/pages/SearchApi.jsx` - Connected to global header, removed custom header
- `src/pages/PokemonPage.jsx` - Connected to global header

## Result
The app now has a consistent, always-visible search bar at the top that:
- ✅ Appears on all pages except settings
- ✅ Matches the design shown in the image
- ✅ Provides game selection and search functionality
- ✅ Integrates seamlessly with existing page logic
- ✅ Maintains dark theme consistency
- ✅ Works on both desktop and mobile
