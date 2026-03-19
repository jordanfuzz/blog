#!/usr/bin/env node
/**
 * Compresses full-size photos in /photos in place.
 * JPEGs are re-encoded at quality 80 with mozjpeg.
 * PNGs are re-encoded at max compression/effort (lossless).
 * Subdirectories (e.g. thumbnails/) are not touched.
 *
 * Usage: node compress-photos.js [--dry-run]
 *   --dry-run  Report file sizes without modifying anything
 */

import sharp from 'sharp';
import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PHOTOS_DIR = join(__dirname, '../photos');
const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const dryRun = process.argv.includes('--dry-run');

async function compress(filePath, ext) {
  const image = sharp(filePath);
  if (ext === '.png') {
    return image.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  } else {
    return image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  }
}

async function main() {
  const entries = await readdir(PHOTOS_DIR, { withFileTypes: true });
  const photos = entries
    .filter(e => e.isFile() && PHOTO_EXTENSIONS.has(extname(e.name).toLowerCase()))
    .map(e => e.name);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of photos) {
    const filePath = join(PHOTOS_DIR, file);
    const ext = extname(file).toLowerCase();
    const { size: sizeBefore } = await stat(filePath);
    totalBefore += sizeBefore;

    if (dryRun) {
      console.log(`  ${file} (${(sizeBefore / 1024).toFixed(1)}KB)`);
      totalAfter += sizeBefore;
      continue;
    }

    process.stdout.write(`  ${file} (${(sizeBefore / 1024).toFixed(1)}KB → `);
    const buf = await compress(filePath, ext);
    await writeFile(filePath, buf);
    totalAfter += buf.length;
    console.log(`${(buf.length / 1024).toFixed(1)}KB)`);
  }

  const savedMB = ((totalBefore - totalAfter) / (1024 * 1024)).toFixed(1);
  const beforeMB = (totalBefore / (1024 * 1024)).toFixed(1);
  const afterMB = (totalAfter / (1024 * 1024)).toFixed(1);
  console.log(`\nTotal: ${beforeMB}MB → ${afterMB}MB (saved ${savedMB}MB)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
