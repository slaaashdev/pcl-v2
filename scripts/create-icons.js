const fs = require('fs');
const path = require('path');

// Simple function to create a colored PNG icon using Canvas (if available)
// Fallback to creating a simple placeholder

const iconSizes = [16, 32, 48, 128];
const iconDir = path.join(__dirname, '..', 'extension', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Create simple SVG-based icons
function createSVGIcon(size) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3B82F6" rx="4"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        fill="white" font-family="Arial, sans-serif" font-weight="bold"
        font-size="${Math.floor(size * 0.3)}">PCL</text>
</svg>`;
}

// Create SVG icons first
iconSizes.forEach(size => {
    const svgContent = createSVGIcon(size);
    const svgPath = path.join(iconDir, `icon${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`Created ${svgPath}`);
});

console.log('SVG icons created. You can convert these to PNG using online tools or ImageMagick.');
console.log('For now, creating simple data URL PNG placeholders...');

// Create minimal PNG data as base64 (1x1 blue pixel, scaled)
const blueDot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBAIAAGF3JUkAAAAASUVORK5CYII=';

// This creates tiny placeholder PNGs - these will work but are not pretty
iconSizes.forEach(size => {
    const pngPath = path.join(iconDir, `icon${size}.png`);
    // Create a simple canvas-like approach or use a simple placeholder
    // For now, copy the same base64 data (it's a 1x1 transparent pixel)
    const buffer = Buffer.from(blueDot, 'base64');
    fs.writeFileSync(pngPath, buffer);
    console.log(`Created placeholder ${pngPath}`);
});

console.log('\nIcons created! These are minimal placeholders.');
console.log('For better icons, convert the SVG files to PNG using:');
console.log('1. Online converter: https://convertio.co/svg-png/');
console.log('2. Or use: npm install sharp (then convert with sharp)');