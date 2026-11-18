import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAllAssets() {
  console.log('Generating all high-resolution icons from new official image...');

  const files = fs.readdirSync('.');
  const imgFileName = files.find(f => f.includes('ChatGPT') && f.endsWith('.png'));
  if (!imgFileName) {
    throw new Error('New image file not found');
  }

  const publicDir = path.resolve('public');
  const assetsDir = path.resolve('src/assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const inputBuffer = fs.readFileSync(imgFileName);

  // 1. 1024x1024 Master PNGs
  const master1024 = await sharp(inputBuffer)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'library-bg.png'), master1024);
  fs.writeFileSync(path.join(publicDir, '1000445683.png'), master1024);
  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), master1024);
  fs.writeFileSync(path.join(assetsDir, '1000445683.png'), master1024);

  // 2. 512x512
  const icon512 = await sharp(inputBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

  // 3. Maskable 512x512
  const maskable512 = await sharp(inputBuffer)
    .resize(410, 410, { fit: 'contain' })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png({ quality: 100 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'maskable-icon-512.png'), maskable512);

  // 4. 192x192
  const icon192 = await sharp(inputBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

  // 5. 180x180 (Apple Touch Icon)
  const icon180 = await sharp(inputBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ quality: 100 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon180);

  // 6. Favicon 32x32
  const favicon32 = await sharp(inputBuffer)
    .resize(32, 32, { fit: 'contain' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon32);

  // 7. Multi-scale assets
  const img1x = await sharp(inputBuffer).resize(340, 340, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(path.join(assetsDir, '1000445683@1x.png'), img1x);

  const img2x = await sharp(inputBuffer).resize(680, 680, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(path.join(assetsDir, '1000445683@2x.png'), img2x);

  const img3x = await sharp(inputBuffer).resize(1024, 1024, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(path.join(assetsDir, '1000445683@3x.png'), img3x);

  // 8. Vector SVG wrapper for SVG consumers
  const base64 = icon512.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${base64}" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'app-icon.svg'), svg.trim(), 'utf-8');

  console.log('All icons and image assets updated successfully from new image!');
}

generateAllAssets().catch(console.error);
