import Branch from '../models/Branch.js';
import Restaurant from '../models/Restaurant.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../config/env.js';
import { loadLogo, renderQrPng, renderQrSvg } from '../utils/qrImage.js';

// The restaurant's logo (from Branding) is placed in the centre of every QR.
// Pass ?logo=0 to get a plain code.
async function logoFor(req) {
  if (req.query.logo === '0' || req.query.logo === 'false') return null;
  const restaurant = await Restaurant.findById(req.user.restaurantId).select('logoUrl');
  return loadLogo(restaurant?.logoUrl);
}

// GET /api/branches/:id/qr?format=png|svg&size=1024&dark=%23000000&logo=1
export async function branchQr(req, res) {
  const branch = await Branch.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!branch) throw new HttpError(404, 'Branch not found');

  const url = `${env.publicBaseUrl}/menu/${branch.slug}`;
  const format = req.query.format === 'svg' ? 'svg' : 'png';
  const size = Math.min(Math.max(parseInt(req.query.size || '1024', 10) || 1024, 128), 4096);
  const dark = /^#[0-9a-fA-F]{6}$/.test(req.query.dark || '') ? req.query.dark : '#1F2937';
  const logo = await logoFor(req);

  const filename = `qr-${branch.slug}.${format}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (format === 'svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(await renderQrSvg(url, { size, dark, logo }));
  }
  res.setHeader('Content-Type', 'image/png');
  res.send(await renderQrPng(url, { size, dark, logo }));
}

// GET /api/branches/:id/qr-preview  (small data URL for showing in the dashboard)
export async function branchQrPreview(req, res) {
  const branch = await Branch.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!branch) throw new HttpError(404, 'Branch not found');
  const url = `${env.publicBaseUrl}/menu/${branch.slug}`;
  const logo = await logoFor(req);
  const png = await renderQrPng(url, { size: 360, dark: '#1F2937', logo });
  res.json({ dataUrl: `data:image/png;base64,${png.toString('base64')}`, url });
}
