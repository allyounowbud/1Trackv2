# Discord OAuth Development Setup

## Issue
When testing Discord OAuth in development (localhost), the redirect takes you to the production app instead of your local dev server.

## Solutions

### Option 1: Add localhost to Discord OAuth Settings (Recommended)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** section
4. In the **Redirects** section, add: `http://localhost:5173/login`
5. Save the changes

### Option 2: Use Environment Variable (Already implemented)

The code now supports an environment variable for custom redirect URLs:

1. Create a `.env.local` file in your project root:
```bash
# OAuth Redirect URL for development
VITE_OAUTH_REDIRECT_URL=http://localhost:5173/login
```

2. Restart your development server:
```bash
npm run dev
```

## Testing

After implementing either solution:
1. Start your dev server: `npm run dev`
2. Go to `http://localhost:5173/login`
3. Click "Continue with Discord"
4. You should be redirected back to your localhost dev server after Discord authentication

## Current Implementation

The `AuthContext.jsx` now checks for the `VITE_OAUTH_REDIRECT_URL` environment variable first, then falls back to `window.location.origin` if not set. This allows you to override the redirect URL for development without changing the production code.
