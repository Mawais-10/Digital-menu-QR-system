import QRCode from 'qrcode';
import sharp from 'sharp';

// Branded QR rendering, modelled on printed café QR boards:
//  - a faint, enlarged copy of the logo sits behind the whole code (watermark)
//  - the sharp logo sits in the centre with only its own footprint cleared
// Error correction is H (30% recoverable); the cleared centre stays well under that and
// the watermark is light enough that the modules keep full contrast, so codes still scan.

const LOGO_RATIO = 0.22; // centre logo bounding box as a fraction of the QR side
const PAD_RATIO = 0.045; // module-free gap around the centre logo
const WATERMARK_RATIO = 0.72; // watermark bounding box as a fraction of the QR side
const WATERMARK_STRENGTH = 0.11; // 0 = invisible, 1 = full colour
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
    // Trim empty margins (transparent or flat colour) so the mark fills its box
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

function baseOptions(dark, light = '#FFFFFF') {
  return { errorCorrectionLevel: 'H', margin: 2, color: { dark, light } };
}

// Faint version of the logo on white: flatten, then pull every pixel most of the way to white.
async function faintLogo(logo, box) {
  const k = WATERMARK_STRENGTH;
  return sharp(logo)
    .resize(box, box, { fit: 'inside' })
    .flatten({ background: '#FFFFFF' })
    .linear([k, k, k], [255 * (1 - k), 255 * (1 - k), 255 * (1 - k)])
    .png()
    .toBuffer();
}

export async function renderQrPng(url, { size, dark, logo }) {
  if (!logo) return QRCode.toBuffer(url, { ...baseOptions(dark), type: 'png', width: size });

  // Modules on a transparent background, so the watermark can sit underneath
  const modules = await QRCode.toBuffer(url, { ...baseOptions(dark, '#FFFFFF00'), type: 'png', width: size });
  const centre = Math.round(size / 2);

  const wm = await faintLogo(logo, Math.round(size * WATERMARK_RATIO));
  const { width: ww, height: wh } = await sharp(wm).metadata();

  const box = Math.round(size * LOGO_RATIO);
  const pad = Math.round(size * PAD_RATIO);
  const logoPng = await sharp(logo).resize(box, box, { fit: 'inside' }).png().toBuffer();
  const { width: lw, height: lh } = await sharp(logoPng).metadata();
  const cw = lw + pad * 2;
  const ch = lh + pad * 2;
  const holeSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}"><rect width="${cw}" height="${ch}" fill="#000"/></svg>`
  );
  // Remove the modules inside the logo footprint; the watermark underneath stays untouched
  const modulesWithHole = await sharp(modules)
    .composite([{ input: holeSvg, blend: 'dest-out', left: centre - Math.round(cw / 2), top: centre - Math.round(ch / 2) }])
    .png()
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 3, background: '#FFFFFF' } })
    .composite([
      { input: wm, left: centre - Math.round(ww / 2), top: centre - Math.round(wh / 2) },
      { input: modulesWithHole, left: 0, top: 0 },
      { input: logoPng, left: centre - Math.round(lw / 2), top: centre - Math.round(lh / 2) },
    ])
    .png()
    .toBuffer();
}

export async function renderQrSvg(url, { size, dark, logo }) {
  if (!logo) return QRCode.toString(url, { ...baseOptions(dark), type: 'svg', width: size });

  // Transparent light colour: qrcode then emits only the dark-module path
  const svg = await QRCode.toString(url, { ...baseOptions(dark, '#FFFFFF00'), type: 'svg', width: size });
  const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  const open = /<svg[^>]*>/.exec(svg);
  if (!vb || !open) return svg;
  const n = parseFloat(vb[1]);
  const c = n / 2;
  const meta = await sharp(logo).metadata();
  const fit = (boxSide) => {
    const s = Math.min(boxSide / meta.width, boxSide / meta.height);
    return { w: meta.width * s, h: meta.height * s };
  };
  const logo64 = logo.toString('base64');

  const wmBox = fit(n * WATERMARK_RATIO);
  const lg = fit(n * LOGO_RATIO);
  const pad = n * PAD_RATIO;
  const f = (x) => x.toFixed(3);

  const under =
    `<rect width="${n}" height="${n}" fill="#FFFFFF"/>` +
    `<image x="${f(c - wmBox.w / 2)}" y="${f(c - wmBox.h / 2)}" width="${f(wmBox.w)}" height="${f(wmBox.h)}" opacity="${WATERMARK_STRENGTH}" href="data:image/png;base64,${logo64}" preserveAspectRatio="xMidYMid meet"/>`;
  const mask =
    `<defs><mask id="qr-hole"><rect width="${n}" height="${n}" fill="#fff"/>` +
    `<rect x="${f(c - lg.w / 2 - pad)}" y="${f(c - lg.h / 2 - pad)}" width="${f(lg.w + pad * 2)}" height="${f(lg.h + pad * 2)}" fill="#000"/></mask></defs>`;
  const over =
    `<image x="${f(c - lg.w / 2)}" y="${f(c - lg.h / 2)}" width="${f(lg.w)}" height="${f(lg.h)}" href="data:image/png;base64,${logo64}" preserveAspectRatio="xMidYMid meet"/>`;

  const openEnd = open.index + open[0].length;
  const body = svg.slice(openEnd).replace(/<\/svg>\s*$/, '');
  return `${svg.slice(0, openEnd)}${mask}${under}<g mask="url(#qr-hole)">${body}</g>${over}</svg>`;
}
