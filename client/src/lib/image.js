// Menu photos are stored on Cloudinary as PNGs of up to 1200px, often over 1MB each.
// Showing them as stored makes a full menu tens of megabytes on a customer's phone, so
// pages ask Cloudinary for a resized copy in the best format the browser accepts
// (f_auto = WebP/AVIF with transparency kept, q_auto = visually lossless quality).

const UPLOAD = '/image/upload/';

// Standard widths keep the number of resized copies small and well cached on the CDN
export const CARD_WIDTHS = [320, 480, 640, 960];
export const DETAIL_WIDTHS = [480, 800, 1200];
export const THUMB_WIDTH = 160;
export const LOGO_WIDTH = 640;

// Resized copy of a Cloudinary photo; any other URL is returned unchanged
export function imgUrl(url, width) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const at = url.indexOf(UPLOAD);
  if (at < 0) return url;
  const rest = url.slice(at + UPLOAD.length);
  if (!/^v\d+\//.test(rest)) return url; // already carries a transformation
  return `${url.slice(0, at + UPLOAD.length)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

export function imgSrcSet(url, widths) {
  if (imgUrl(url, widths[0]) === url) return undefined;
  return widths.map((w) => `${imgUrl(url, w)} ${w}w`).join(', ');
}

// onError for an <img> showing a resized copy: fall back once to the stored file.
// Returns true when it switched, so callers can treat a second error as a real failure.
export function fallBackToOriginal(img, original) {
  if (!original || img.dataset.original === '1') return false;
  img.dataset.original = '1';
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  img.src = original;
  return true;
}
