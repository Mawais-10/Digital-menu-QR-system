import QRCode from 'qrcode';
import sharp from 'sharp';

// Branded QR rendering: the restaurant logo sits on a white rounded plate in the
// centre of the code. Error correction is H (30% recoverable) and the plate covers
// ~6% of the area, which leaves a comfortable scanning margin.

const PLATE_RATIO = 0.26; // plate side as a fraction of the full QR side
const LOGO_RATIO = 0.20; // logo bounding box as a fraction of the full QR side
const LOGO_CACHE_MS = 10 * 60 * 1000;
const logoCache = new Map(); // url -> { at, png }

// Fetches the restaurant logo and normalises it to a 512px PNG (keeps transparency).
export async function loadLogo(url) {
  if (!url) return null;
  const hit = logoCache.get(url);
  if (hit && Date.now() - hit.at < LOGO_CACHE_MS) return hit.png;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    // Trim empty margins (transparent or flat colour) so the mark fills the plate
    let trimmed;
    try {
      trimmed = await sharp(raw).trim({ threshold: 12 }).toBuffer();
    } catch {
      trimmed = raw;
    }
    const png = await sharp(trimmed).resize(512, 512, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
    logoCache.set(url, { at: Date.now(), png });
    return png;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function baseOptions(dark) {
  return { errorCorrectionLevel: 'H', margin: 2, color: { dark, light: '#FFFFFF' } };
}

export async function renderQrPng(url, { size, dark, logo }) {
  const qr = await QRCode.toBuffer(url, { ...baseOptions(dark), type: 'png', width: size });
  if (!logo) return qr;

  const plate = Math.round(size * PLATE_RATIO);
  const box = Math.round(size * LOGO_RATIO);
  const radius = Math.round(plate * 0.18);
  const plateSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${plate}" height="${plate}"><rect width="${plate}" height="${plate}" rx="${radius}" fill="#FFFFFF"/></svg>`
  );
  const logoPng = await sharp(logo).resize(box, box, { fit: 'inside' }).png().toBuffer();
  const logoMeta = await sharp(logoPng).metadata();
  const centre = Math.round(size / 2);

  return sharp(qr)
    .composite([
      { input: plateSvg, left: centre - Math.round(plate / 2), top: centre - Math.round(plate / 2) },
      { input: logoPng, left: centre - Math.round(logoMeta.width / 2), top: centre - Math.round(logoMeta.height / 2) },
    ])
    .png()
    .toBuffer();
}

export async function renderQrSvg(url, { size, dark, logo }) {
  const svg = await QRCode.toString(url, { ...baseOptions(dark), type: 'svg', width: size });
  if (!logo) return svg;

  // qrcode's SVG uses a square viewBox in module units: "0 0 N N"
  const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  if (!vb) return svg;
  const n = parseFloat(vb[1]);
  const plate = n * PLATE_RATIO;
  const box = n * LOGO_RATIO;
  const meta = await sharp(logo).metadata();
  const scale = Math.min(box / meta.width, box / meta.height);
  const w = meta.width * scale;
  const h = meta.height * scale;
  const c = n / 2;
  const overlay =
    `<rect x="${(c - plate / 2).toFixed(3)}" y="${(c - plate / 2).toFixed(3)}" width="${plate.toFixed(3)}" height="${plate.toFixed(3)}" rx="${(plate * 0.18).toFixed(3)}" fill="#FFFFFF"/>` +
    `<image x="${(c - w / 2).toFixed(3)}" y="${(c - h / 2).toFixed(3)}" width="${w.toFixed(3)}" height="${h.toFixed(3)}" href="data:image/png;base64,${logo.toString('base64')}" preserveAspectRatio="xMidYMid meet"/>`;
  return svg.replace(/<\/svg>\s*$/, `${overlay}</svg>`);
}
