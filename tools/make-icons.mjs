// Renders the PNG icons from the SVG sources. Run: node tools/make-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../extension/icons');
const render = async (src, size, art, out) => {
  const pad = Math.round((size - art) / 2);
  const img = await sharp(path.join(dir, src), { density: 72 * art / 32 * 4 }).resize(art, art).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: img, left: pad, top: pad }]).png().toFile(path.join(dir, out));
};
await render('icon-small.svg', 16, 16, 'icon16.png');
await render('icon-small.svg', 32, 32, 'icon32.png');
await render('icon.svg', 48, 46, 'icon48.png');
await render('icon.svg', 128, 96, 'icon128.png'); // Web Store guideline: 96px art + 16px padding
console.log('icons written to', dir);
