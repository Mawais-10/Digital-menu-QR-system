import QRCode from 'qrcode';
import Branch from '../models/Branch.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../config/env.js';

// GET /api/branches/:id/qr?format=png|svg&size=1024&dark=%23000000
export async function branchQr(req, res) {
  const branch = await Branch.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!branch) throw new HttpError(404, 'Branch not found');

  const url = `${env.publicBaseUrl}/menu/${branch.slug}`;
  const format = req.query.format === 'svg' ? 'svg' : 'png';
  const size = Math.min(Math.max(parseInt(req.query.size || '1024', 10) || 1024, 128), 4096);
  const dark = /^#[0-9a-fA-F]{6}$/.test(req.query.dark || '') ? req.query.dark : '#1F2937';

  const options = {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark, light: '#FFFFFF' },
  };

  const filename = `qr-${branch.slug}.${format}`;
  if (format === 'svg') {
    const svg = await QRCode.toString(url, { ...options, type: 'svg', width: size });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(svg);
  }
  const buffer = await QRCode.toBuffer(url, { ...options, type: 'png', width: size });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

// GET /api/branches/:id/qr-preview  (small data URL for showing in the dashboard)
export async function branchQrPreview(req, res) {
  const branch = await Branch.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!branch) throw new HttpError(404, 'Branch not found');
  const url = `${env.publicBaseUrl}/menu/${branch.slug}`;
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 360,
    color: { dark: '#1F2937', light: '#FFFFFF' },
  });
  res.json({ dataUrl, url });
}
