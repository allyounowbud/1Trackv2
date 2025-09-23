// Create placeholder icons for PWA testing
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple SVG icon
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="80" fill="#111827"/>
  
  <!-- Main icon - stylized "1T" -->
  <g transform="translate(256, 256)">
    <!-- Circle background -->
    <circle cx="0" cy="0" r="180" fill="url(#gradient)"/>
    
    <!-- "1T" text -->
    <text x="0" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white">1T</text>
    
    <!-- Decorative elements -->
    <circle cx="-120" cy="-120" r="8" fill="white" opacity="0.3"/>
    <circle cx="120" cy="-120" r="6" fill="white" opacity="0.2"/>
    <circle cx="-120" cy="120" r="6" fill="white" opacity="0.2"/>
    <circle cx="120" cy="120" r="8" fill="white" opacity="0.3"/>
  </g>
</svg>`;
};

// Create placeholder icons directory
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icons for each size
sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Created ${filename}`);
});

// Create a simple favicon.ico placeholder
const faviconSvg = createSVGIcon(32);
const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
fs.writeFileSync(faviconPath, faviconSvg);

console.log('Placeholder icons created!');
console.log('Note: For production, convert these SVG files to PNG format.');
console.log('You can use the generate-icons.html file in your browser to create PNG versions.');
