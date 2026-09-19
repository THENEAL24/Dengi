// Рендерит PNG-иконки из SVG-исходников. Запуск: node scripts/generate-icons.mjs
import sharp from 'sharp';
import path from 'node:path';

const iconsDir = path.resolve(import.meta.dirname, '../public/icons');

const jobs = [
  { src: 'icon-source.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon-source.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon-source.svg', out: 'apple-touch-icon.png', size: 180 },
  { src: 'icon-maskable-source.svg', out: 'icon-maskable-512.png', size: 512 },
];

for (const { src, out, size } of jobs) {
  await sharp(path.join(iconsDir, src))
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, out));
  console.log(`${out} ${size}x${size}`);
}
