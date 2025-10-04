# Quick Fix for API Issues

## Set API Credentials in Browser Console

Open your browser console (F12) and run these commands:

```javascript
localStorage.setItem('scrydex_api_key', '3afbdca9aaae128736728a33c52b734abda3278545f9406c02c9c91ab0e728a7');
localStorage.setItem('scrydex_team_id', 'onetracking');
```

Then reload the page.

## URL Fix Needed

The `scrydexHybridService.js` is creating URLs with double `/v1/` paths. The paths should NOT include the leading `/v1/`.

The fix is to update the paths in `scrydexHybridService.js`:
- Change `/pokemon/v1/cards` to `/pokemon/cards`
- Change `/pokemon/v1/expansions` to `/pokemon/expansions`  
- Change `/v1/usage` to `/usage`

Or simpler: Add `/v1` to the base URL construction.


