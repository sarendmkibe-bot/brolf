import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Uploaded photos live in server/uploads
export const UPLOAD_DIR = path.resolve(here, '../../../uploads');

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB, one photo
});

// Look at the first bytes of the file to see what it really is.
// The file name and the type the browser reports can be faked, the bytes cannot.
function detectType(buf) {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) {
      return 'png';
    }
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      return 'webp';
    }
  }
  return null;
}

// Seller or admin only. Login is checked before any file is read.
router.post(
  '/',
  requireAuth,
  requireRole('seller', 'admin'),
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'The photo is too large (maximum 5 MB)' });
        }
        return res.status(400).json({ error: 'Upload failed' });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Choose a photo to upload' });
      }
      const ext = detectType(req.file.buffer);
      if (!ext) {
        return res.status(400).json({ error: 'Only JPG, PNG or WebP photos are allowed' });
      }

      // A random name, so nothing the user sends ends up in the file path
      const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, name), req.file.buffer);

      res.status(201).json({ url: `/uploads/${name}` });
    } catch (err) {
      next(err);
    }
  }
);

export default router;