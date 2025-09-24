const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = [16, 32, 48, 128];
const iconDir = path.join(__dirname, '..', 'extension', 'icons');

async function createPNGIcons() {
    // Ensure icons directory exists
    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
    }

    for (const size of iconSizes) {
        try {
            // Create a simple blue square with PCL text using SVG buffer
            const svgBuffer = Buffer.from(`
                <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                    <rect width="${size}" height="${size}" fill="#3B82F6" rx="4"/>
                    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
                          fill="white" font-family="Arial, sans-serif" font-weight="bold"
                          font-size="${Math.floor(size * 0.3)}">PCL</text>
                </svg>
            `);

            // Convert SVG to PNG
            const pngPath = path.join(iconDir, `icon${size}.png`);
            await sharp(svgBuffer)
                .png()
                .toFile(pngPath);

            console.log(`✅ Created ${pngPath} (${size}x${size})`);
        } catch (error) {
            console.error(`❌ Failed to create icon${size}.png:`, error.message);
        }
    }

    console.log('\n🎉 All PNG icons created successfully!');
}

createPNGIcons().catch(console.error);