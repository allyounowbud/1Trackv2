# OneTrack PWA Setup

This document explains how to set up OneTrack as a Progressive Web App (PWA).

## What is a PWA?

A Progressive Web App (PWA) is a web application that can be installed on a user's device and work offline. It provides a native app-like experience while being built with web technologies.

## Features Included

### ✅ PWA Manifest
- App name, description, and icons
- Theme colors matching the app design
- Standalone display mode
- App shortcuts for quick access

### ✅ Service Worker
- Offline functionality
- Caching strategies for static files and API calls
- Background sync for offline actions
- Push notification support

### ✅ Mobile Optimization
- Responsive design for all screen sizes
- Touch-friendly interface
- Safe area support for devices with notches
- Proper viewport handling

### ✅ Installation Support
- Install prompts for supported browsers
- App shortcuts on home screen
- Native app-like experience

## Setup Instructions

### 1. Generate Icons

The PWA requires various icon sizes. To generate them:

1. Open `public/generate-icons.html` in your browser
2. Download all the generated PNG icons
3. Place them in the `public/icons/` directory

Required icon sizes:
- 16x16, 32x32 (favicons)
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 (PWA icons)

### 2. Test PWA Features

1. **Install the app:**
   - Open the app in Chrome/Edge on mobile
   - Look for the "Install" button in the address bar
   - Or use the "Add to Home Screen" option

2. **Test offline functionality:**
   - Install the app
   - Turn off your internet connection
   - The app should still work for cached content

3. **Test service worker:**
   - Open Chrome DevTools
   - Go to Application > Service Workers
   - Verify the service worker is registered and running

### 3. Deploy with HTTPS

PWAs require HTTPS to work properly. Make sure your deployment uses HTTPS.

## PWA Configuration Files

### `public/manifest.json`
Defines the app metadata, icons, and behavior when installed.

### `public/sw.js`
Service worker that handles caching, offline functionality, and background tasks.

### `src/utils/pwa.js`
JavaScript utilities for PWA features like install prompts and online/offline detection.

### `index.html`
Contains PWA meta tags and manifest link.

## Browser Support

- **Chrome/Edge:** Full PWA support
- **Firefox:** Basic PWA support
- **Safari:** Limited PWA support (iOS 11.3+)
- **Mobile browsers:** Most modern mobile browsers support PWAs

## Testing Checklist

- [ ] App can be installed on mobile devices
- [ ] App works offline (cached content)
- [ ] Icons display correctly on home screen
- [ ] App opens in standalone mode (no browser UI)
- [ ] Service worker is registered and active
- [ ] Install prompt appears when appropriate
- [ ] App shortcuts work (if supported)

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure the app is served over HTTPS
- Verify the service worker file exists at `/sw.js`

### Icons Not Displaying
- Check that all required icon sizes are present
- Verify icon paths in `manifest.json`
- Ensure icons are in PNG format

### Install Prompt Not Appearing
- The prompt only appears on supported browsers
- User must interact with the app first
- App must meet PWA criteria (HTTPS, manifest, service worker)

## Performance Considerations

- Service worker caches static files for faster loading
- API responses are cached for offline use
- Background sync handles offline actions when connection is restored
- Push notifications can be used for price alerts (future feature)

## Future Enhancements

- Push notifications for price alerts
- Background sync for collection updates
- Advanced offline data management
- App shortcuts for quick actions
- Share target API for sharing collection data
