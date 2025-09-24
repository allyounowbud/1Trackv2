// Create placeholder icons for PWA testing
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Create a full square SVG icon for mobile app platforms
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Full square background - no rounded corners to prevent white edges when cropped -->
  <rect width="512" height="512" fill="#6366f1"/>
  
  <!-- "1T" text centered and sized for full square -->
  <text x="256" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="240" font-weight="bold" fill="white">1T</text>
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
