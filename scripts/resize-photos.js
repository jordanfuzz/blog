#!/usr/bin/env node
/**
 * Resizes full-size photos in /photos to a maximum width of 1400px.
 * Photos already at or under 1400px wide are skipped.
 * Subdirectories (e.g. thumbnails/) are not touched.
 * Files are resized in place, preserving aspect ratio and file type.
 *
 * Usage: node resize-photos.js [--dry-run]
 *   --dry-run  Report oversized photos without modifying them
 */

import sharp from 'sharp';
import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PHOTOS_DIR = join(__dirname, '../photos');
const MAX_WIDTH = 1400;
const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const entries = await readdir(PHOTOS_DIR, { withFileTypes: true });
  const photos = entries
    .filter(e => e.isFile() && PHOTO_EXTENSIONS.has(extname(e.name).toLowerCase()))
    .map(e => e.name);

  let resized = 0;
  let skipped = 0;

  for (const file of photos) {
    const filePath = join(PHOTOS_DIR, file);
    const image = sharp(filePath);
    const { width } = await image.metadata();

    if (width <= MAX_WIDTH) {
      console.log(`  skip  ${file} (${width}px)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  over  ${file} (${width}px)`);
      resized++;
      continue;
    }

    process.stdout.write(`  resize  ${file} (${width}px → ${MAX_WIDTH}px) ... `);
    const buf = await image
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .toBuffer();
    await writeFile(filePath, buf);
    console.log('done');
    resized++;
  }

  const action = dryRun ? 'would resize' : 'resized';
  console.log(`\n${resized} ${action}, ${skipped} already within limit`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
