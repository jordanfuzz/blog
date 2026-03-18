#!/usr/bin/env node
/**
 * Generates thumbnails for any photos in /photos that don't already have one.
 * Thumbnails are written to /photos/thumbnails/{name}-thumb.jpg at 400px wide.
 *
 * Usage: node generate-thumbnails.js [--force]
 *   --force  Regenerate all thumbnails, even existing ones
 */

import sharp from 'sharp';
import { readdir, access } from 'fs/promises';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PHOTOS_DIR = join(__dirname, '../photos');
const THUMBS_DIR = join(__dirname, '../photos/thumbnails');
const THUMB_WIDTH = 400;
const JPEG_QUALITY = 75;
const PNG_COMPRESSION = 8; // 0-9, higher = smaller file but slower
const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const force = process.argv.includes('--force');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function generateThumbnail(inputPath, outputPath, ext) {
  const resized = sharp(inputPath).resize(THUMB_WIDTH, null, { withoutEnlargement: true });

  if (ext === '.png') {
    await resized.png({ compressionLevel: PNG_COMPRESSION }).toFile(outputPath);
  } else {
    await resized.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outputPath);
  }
}

async function main() {
  const files = await readdir(PHOTOS_DIR);
  const photos = files.filter(f => PHOTO_EXTENSIONS.has(extname(f).toLowerCase()));

  let generated = 0;
  let skipped = 0;

  for (const photo of photos) {
    const ext = extname(photo).toLowerCase();
    const name = basename(photo, extname(photo));
    const thumbExt = ext === '.png' ? '.png' : '.jpg';
    const inputPath = join(PHOTOS_DIR, photo);
    const outputPath = join(THUMBS_DIR, `${name}-thumb${thumbExt}`);

    if (!force && await exists(outputPath)) {
      console.log(`  skip  ${photo}`);
      skipped++;
      continue;
    }

    process.stdout.write(`  gen   ${photo} → thumbnails/${name}-thumb${thumbExt} ... `);
    await generateThumbnail(inputPath, outputPath, ext);
    console.log('done');
    generated++;
  }

  console.log(`\n${generated} generated, ${skipped} skipped`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
