// Simple script to generate PNG icons from SVG
// This requires Node.js and sharp package
// Run: npm install sharp && node scripts/generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for PWA
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Simple SVG to PNG conversion using canvas (for development)
// In production, you'd want to use a proper image processing library

const generateIcons = () => {
  console.log('Generating PWA icons...');
  
  // Create a simple HTML file that can be opened in a browser to generate icons
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>OneTrack Icon Generator</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #111827; color: white; }
        .icon-preview { margin: 10px; display: inline-block; text-align: center; }
        canvas { border: 1px solid #333; margin: 5px; }
        .download-btn { 
            background: #6366f1; 
            color: white; 
            padding: 8px 16px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            margin: 5px;
        }
        .download-btn:hover { background: #5b5bd6; }
    </style>
</head>
<body>
    <h1>OneTrack PWA Icon Generator</h1>
    <p>Click the download buttons to save the icons to your computer.</p>
    <p>Then place them in the public/icons/ directory.</p>
    
    <div id="icons"></div>
    
    <script>
        const sizes = [${sizes.join(', ')}];
        const iconsContainer = document.getElementById('icons');
        
        // Create SVG content
        const svgContent = \`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
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
</svg>\`;
        
        sizes.forEach(size => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Create an image from the SVG
            const img = new Image();
            const svgBlob = new Blob([svgContent], {type: 'image/svg+xml'});
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = function() {
                ctx.drawImage(img, 0, 0, size, size);
                
                // Create download link
                canvas.toBlob(function(blob) {
                    const link = document.createElement('a');
                    link.download = \`icon-\${size}x\${size}.png\`;
                    link.href = URL.createObjectURL(blob);
                    link.textContent = \`Download \${size}x\${size}\`;
                    link.className = 'download-btn';
                    
                    const div = document.createElement('div');
                    div.className = 'icon-preview';
                    div.innerHTML = \`
                        <h3>\${size}x\${size}</h3>
                        <canvas width="\${size}" height="\${size}"></canvas>
                        <br>
                    \`;
                    div.querySelector('canvas').getContext('2d').drawImage(img, 0, 0, size, size);
                    div.appendChild(link);
                    iconsContainer.appendChild(div);
                });
                
                URL.revokeObjectURL(url);
            };
            
            img.src = url;
        });
    </script>
</body>
</html>`;

  // Write the HTML file
  const htmlPath = path.join(__dirname, '..', 'public', 'generate-icons.html');
  fs.writeFileSync(htmlPath, htmlContent);
  
  console.log('Icon generator HTML created at:', htmlPath);
  console.log('Open this file in your browser to generate and download the PNG icons.');
  console.log('Then place the downloaded icons in the public/icons/ directory.');
};

generateIcons();
