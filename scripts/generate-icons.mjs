// Generate PNG PWA icons and OG image from SVG
import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// FU Corp icon as SVG — shield with "FU" text
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF6B00"/>
      <stop offset="100%" stop-color="#CC5500"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <rect width="512" height="256" rx="108" fill="url(#shine)"/>
  <text x="256" y="310" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-weight="900" font-size="220" fill="#000" letter-spacing="-10">FU</text>
</svg>`;

// OG Image (1200x630) — dark branded card
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#040408"/>
      <stop offset="50%" stop-color="#0A0A12"/>
      <stop offset="100%" stop-color="#040408"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF6B00"/>
      <stop offset="100%" stop-color="#06D6E0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Top accent line -->
  <rect x="100" y="0" width="1000" height="3" fill="url(#accent)" rx="2"/>
  <!-- Grid lines -->
  <line x1="0" y1="0" x2="1200" y2="630" stroke="rgba(6,214,224,0.03)" stroke-width="1"/>
  <line x1="1200" y1="0" x2="0" y2="630" stroke="rgba(6,214,224,0.03)" stroke-width="1"/>
  <!-- Icon -->
  <rect x="100" y="180" width="100" height="100" rx="22" fill="#FF6B00"/>
  <text x="150" y="248" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-weight="900" font-size="44" fill="#000">FU</text>
  <!-- Title -->
  <text x="100" y="350" font-family="Inter,system-ui,sans-serif" font-weight="700" font-size="52" fill="#E8E8F0" letter-spacing="-2">FU Corp Command Center</text>
  <!-- Subtitle -->
  <text x="100" y="400" font-family="Inter,system-ui,sans-serif" font-weight="400" font-size="24" fill="#58586A">Enterprise CRM for FU Corporation</text>
  <!-- Bottom accent -->
  <rect x="100" y="460" width="200" height="3" fill="#FF6B00" rx="2"/>
  <!-- Domain -->
  <text x="100" y="540" font-family="Inter,system-ui,sans-serif" font-weight="500" font-size="18" fill="#58586A">fu-corp-crm.vercel.app</text>
</svg>`;

async function generate() {
  // 192x192 PNG icon
  await sharp(Buffer.from(iconSvg)).resize(192, 192).png().toFile(join(publicDir, "icon-192.png"));
  console.log("Generated icon-192.png");

  // 512x512 PNG icon
  await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile(join(publicDir, "icon-512.png"));
  console.log("Generated icon-512.png");

  // OG image 1200x630
  await sharp(Buffer.from(ogSvg)).resize(1200, 630).png().toFile(join(publicDir, "og-image.png"));
  console.log("Generated og-image.png");
}

generate().catch(console.error);
