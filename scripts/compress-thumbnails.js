#!/usr/bin/env node
/**
 * Compresses any thumbnails in /photos/thumbnails that exceed the size limit.
 * Iteratively reduces quality/width until the file is under the target size.
 * Original photos in /photos are never touched.
 *
 * Usage: node compress-thumbnails.js [--dry-run]
 *   --dry-run  Report oversized files without modifying them
 */

import sharp from 'sharp';
import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const THUMBS_DIR = join(__dirname, '../photos/thumbnails');
const SIZE_LIMIT = 70 * 1024; // 70KB in bytes
const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const dryRun = process.argv.includes('--dry-run');

async function compressToLimit(inputPath, ext) {
  if (ext === '.png') {
    // For PNG: try increasing compression level, then fall back to reducing width
    for (let compression = 8; compression <= 9; compression++) {
      const buf = await sharp(inputPath)
        .png({ compressionLevel: compression })
        .toBuffer();
      if (buf.length <= SIZE_LIMIT) return buf;
    }
    // Still too large — resize down iteratively
    const meta = await sharp(inputPath).metadata();
    let width = meta.width;
    while (width > 50) {
      width = Math.floor(width * 0.85);
      const buf = await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: false })
        .png({ compressionLevel: 9 })
        .toBuffer();
      if (buf.length <= SIZE_LIMIT) return buf;
    }
  } else {
    // For JPEG/WEBP: reduce quality iteratively, then also reduce width if needed
    for (let quality = 70; quality >= 20; quality -= 5) {
      const buf = await sharp(inputPath)
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (buf.length <= SIZE_LIMIT) return buf;
    }
    // Still too large — resize down iteratively at low quality
    const meta = await sharp(inputPath).metadata();
    let width = meta.width;
    while (width > 50) {
      width = Math.floor(width * 0.85);
      const buf = await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: false })
        .jpeg({ quality: 20, mozjpeg: true })
        .toBuffer();
      if (buf.length <= SIZE_LIMIT) return buf;
    }
  }
  return null; // Could not compress enough
}

async function main() {
  const files = await readdir(THUMBS_DIR);
  const thumbs = files.filter(f => PHOTO_EXTENSIONS.has(extname(f).toLowerCase()));

  let compressed = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of thumbs) {
    const filePath = join(THUMBS_DIR, file);
    const { size } = await stat(filePath);

    if (size <= SIZE_LIMIT) {
      console.log(`  ok    ${file} (${(size / 1024).toFixed(1)}KB)`);
      skipped++;
      continue;
    }

    const ext = extname(file).toLowerCase();
    const sizeBefore = (size / 1024).toFixed(1);

    if (dryRun) {
      console.log(`  over  ${file} (${sizeBefore}KB)`);
      failed++;
      continue;
    }

    process.stdout.write(`  fix   ${file} (${sizeBefore}KB) → `);
    const buf = await compressToLimit(filePath, ext);

    if (!buf) {
      console.log('could not compress to target size');
      failed++;
      continue;
    }

    await writeFile(filePath, buf);
    console.log(`${(buf.length / 1024).toFixed(1)}KB`);
    compressed++;
  }

  console.log(`\n${compressed} compressed, ${skipped} already within limit, ${failed} failed`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
