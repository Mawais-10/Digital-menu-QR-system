import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Upload to Cloudinary, resized + auto-optimized. Returns the delivery URL.
export function processImage(buffer, { maxWidth = 1200 } = {}) {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    const err = new Error('Image storage is not configured — set the CLOUDINARY_* environment variables on the server');
    err.status = 500;
    return Promise.reject(err);
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'qr-menu',
        resource_type: 'image',
        transformation: [{ width: maxWidth, height: maxWidth, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(new Error(`Image upload failed: ${error.message}`));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Best-effort removal of a previously uploaded Cloudinary image
export function deleteImage(url) {
  if (!url || !url.includes('res.cloudinary.com')) return;
  const match = url.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(qr-menu\/[^/.]+)/);
  if (!match) return;
  cloudinary.uploader.destroy(match[1]).catch(() => {});
}
