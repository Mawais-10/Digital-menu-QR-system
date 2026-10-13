import ExcelJS from 'exceljs';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import { processImage, deleteImage } from '../middleware/upload.js';
import { extractInCellImages } from '../utils/xlsxImages.js';

export const MAX_IMPORT_ROWS = 1000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LAYOUTS = ['grid', 'large', 'compact', 'list', 'hero', 'minimal'];
const LAYOUT_ALIASES = { standard: 'grid', featured: 'hero', elegant: 'minimal', full: 'large', 'full width': 'large', rows: 'list' };

// Accepted header spellings (normalised: lowercase, punctuation -> space)
const COLUMNS = {
  categoryEn: ['category', 'category en', 'category english', 'category name', 'category name en', 'english category'],
  categoryAr: ['category ar', 'category arabic', 'category name ar', 'category name arabic', 'arabic category'],
  layout: ['layout', 'card template', 'template', 'category layout', 'card layout'],
  nameEn: ['name', 'name en', 'name english', 'english name', 'item', 'item name', 'item name en', 'product', 'product name', 'dish'],
  nameAr: ['name ar', 'name arabic', 'arabic name', 'item name ar', 'item name arabic', 'product name ar', 'item ar', 'dish ar'],
  descriptionEn: ['description', 'description en', 'description english', 'desc', 'details', 'details en'],
  descriptionAr: ['description ar', 'description arabic', 'arabic description', 'desc ar', 'details ar'],
  price: ['price', 'base price', 'price omr', 'price sar', 'price aed', 'amount', 'cost'],
  image: ['image', 'photo', 'picture', 'image url', 'photo url', 'img', 'pic'],
  badge: ['badge', 'promo', 'promo badge', 'badge text', 'label', 'tag', 'offer'],
  active: ['active', 'is active', 'available', 'visible', 'status', 'show'],
};

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();

function cellText(cell) {
  let v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if (v.hyperlink) return String(v.text ?? v.hyperlink).trim();
    if (v.formula !== undefined || v.sharedFormula !== undefined) v = v.result;
    else if (v.error !== undefined) return ''; // in-cell pictures read back as #VALUE!
    else if (v instanceof Date) return v.toISOString();
  }
  if (v == null || typeof v === 'object') return '';
  return String(v).trim();
}

function parsePrice(text) {
  if (text === '') return null;
  // Tolerate "1.500 OMR" / "SAR 12" but reject text with no digits at all
  const cleaned = String(text).replace(/[^\d.-]/g, '');
  if (!/\d/.test(cleaned)) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseActive(text) {
  const t = norm(text);
  if (t === '') return true;
  if (['no', 'false', '0', 'hidden', 'inactive', 'off', 'n', 'unavailable'].includes(t)) return false;
  return true;
}

function parseLayout(text) {
  const t = norm(text);
  if (!t) return null;
  if (LAYOUTS.includes(t)) return t;
  return LAYOUT_ALIASES[t] || null;
}

function mapHeaders(headerRow) {
  const map = {};
  headerRow.eachCell((cell, col) => {
    const h = norm(cellText(cell));
    if (!h) return;
    for (const [key, aliases] of Object.entries(COLUMNS)) {
      if (map[key] === undefined && aliases.includes(h)) {
        map[key] = col;
        return;
      }
    }
  });
  return map;
}

function colLetterToNumber(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

// ---------- Parse ----------

export async function parseWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return { errors: [{ row: 0, message: 'Could not read this file. Save it as an Excel Workbook (.xlsx) and try again.' }], rows: [] };
  }
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) return { errors: [{ row: 0, message: 'The sheet is empty. Fill in at least one item row.' }], rows: [] };

  const cols = mapHeaders(ws.getRow(1));
  const missing = ['categoryEn', 'nameEn', 'nameAr', 'price'].filter((k) => !cols[k]);
  if (missing.length) {
    const labels = { categoryEn: 'Category (EN)', nameEn: 'Name (EN)', nameAr: 'Name (AR)', price: 'Price' };
    return {
      errors: [{ row: 1, message: `Missing column(s): ${missing.map((k) => labels[k]).join(', ')}. Use the template headers.` }],
      rows: [],
    };
  }

  // Pictures: in-cell (rich values) keyed by cell ref, floating drawings keyed by row
  const inCell = await extractInCellImages(buffer).catch(() => ({}));
  const floating = new Map(); // rowNumber -> { buffer, extension, col }
  for (const img of ws.getImages()) {
    const rowNum = Math.floor(img.range.tl.nativeRow) + 1;
    const colNum = Math.floor(img.range.tl.nativeCol) + 1;
    const media = wb.getImage(img.imageId);
    if (!media?.buffer) continue;
    const existing = floating.get(rowNum);
    // Prefer the picture sitting in the Image column when several share a row
    if (!existing || (cols.image && colNum === cols.image)) {
      floating.set(rowNum, { buffer: Buffer.from(media.buffer), extension: media.extension, col: colNum });
    }
  }
  const inCellByRow = new Map();
  for (const [ref, media] of Object.entries(inCell)) {
    const m = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!m) continue;
    const rowNum = Number(m[2]);
    const colNum = colLetterToNumber(m[1]);
    const existing = inCellByRow.get(rowNum);
    if (!existing || (cols.image && colNum === cols.image)) inCellByRow.set(rowNum, media);
  }

  const rows = [];
  const errors = [];
  let lastCategoryEn = '';
  let lastCategoryAr = '';
  let lastLayout = null;
  const get = (row, key) => (cols[key] ? cellText(row.getCell(cols[key])) : '');

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const nameEn = get(row, 'nameEn');
    const nameAr = get(row, 'nameAr');
    const priceText = get(row, 'price');
    let categoryEn = get(row, 'categoryEn');
    let categoryAr = get(row, 'categoryAr');
    let layout = parseLayout(get(row, 'layout'));

    const blank = !nameEn && !nameAr && !priceText && !categoryEn && !categoryAr;
    if (blank) continue;

    // A category written once at the top of a group applies to the rows beneath it
    if (!categoryEn) {
      categoryEn = lastCategoryEn;
      if (!categoryAr) categoryAr = lastCategoryAr;
      if (!layout) layout = lastLayout;
    } else {
      lastCategoryEn = categoryEn;
      lastCategoryAr = categoryAr;
      lastLayout = layout;
    }

    if (rows.length >= MAX_IMPORT_ROWS) {
      errors.push({ row: r, message: `Too many rows. The limit is ${MAX_IMPORT_ROWS} items per import.` });
      break;
    }

    const problems = [];
    if (!categoryEn) problems.push('Category (EN) is required');
    if (!nameEn) problems.push('Name (EN) is required');
    if (!nameAr) problems.push('Name (AR) is required');
    const price = parsePrice(priceText);
    if (price === null) problems.push('Price is required');
    else if (Number.isNaN(price) || price < 0) problems.push(`Price "${priceText}" is not a valid number`);

    const imageText = get(row, 'image');
    const image = inCellByRow.get(r) || floating.get(r) || null;
    let imageUrl = null;
    if (!image && imageText) {
      if (/^https?:\/\/\S+$/i.test(imageText)) imageUrl = imageText;
      else problems.push(`Image "${imageText.slice(0, 40)}" is not a picture or a web link. Place the photo in the cell or paste a URL`);
    }

    if (problems.length) {
      errors.push({ row: r, message: problems.join('; ') });
      continue;
    }

    rows.push({
      row: r,
      categoryEn,
      categoryAr,
      layout,
      nameEn,
      nameAr,
      descriptionEn: get(row, 'descriptionEn'),
      descriptionAr: get(row, 'descriptionAr'),
      price,
      badge: get(row, 'badge'),
      active: parseActive(get(row, 'active')),
      image,
      imageUrl,
    });
  }

  if (!rows.length && !errors.length) errors.push({ row: 0, message: 'No item rows found under the header row.' });
  return { rows, errors };
}

// ---------- Import ----------

async function fetchImage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`link returned ${res.status}`);
    const type = res.headers.get('content-type') || '';
    if (!/^image\//.test(type)) throw new Error('link is not an image');
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_IMAGE_BYTES) throw new Error('image is larger than 8MB');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) throw new Error('image is larger than 8MB');
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Writes parsed rows into the restaurant's menu.
 * Categories are matched by English name (case-insensitive) and created when new.
 * Items are matched by category + English name; existing ones are updated, others created.
 * Returns { errors } when validation against the database fails (nothing written),
 * otherwise { summary }.
 */
export async function runImport(restaurantId, rows) {
  const existingCats = await Category.find({ restaurantId }).sort({ sortOrder: 1, createdAt: 1 });
  const catByName = new Map(existingCats.map((c) => [norm(c.nameEn), c]));

  // Categories that must be created need an Arabic name from the sheet
  const errors = [];
  const newCatNames = new Set();
  for (const row of rows) {
    const key = norm(row.categoryEn);
    if (catByName.has(key) || newCatNames.has(key)) continue;
    if (!row.categoryAr) {
      errors.push({ row: row.row, message: `"${row.categoryEn}" is a new category. Add its Arabic name in Category (AR)` });
      continue;
    }
    newCatNames.add(key);
  }
  if (errors.length) return { errors };

  // Upload all pictures first (4 at a time); failures become warnings, not aborts
  const warnings = [];
  let imagesUploaded = 0;
  const uploaded = await mapLimit(rows, 4, async (row) => {
    try {
      let buffer = row.image?.buffer;
      if (!buffer && row.imageUrl) buffer = await fetchImage(row.imageUrl);
      if (!buffer) return null;
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('image is larger than 8MB');
      const url = await processImage(buffer);
      imagesUploaded++;
      return url;
    } catch (err) {
      warnings.push({ row: row.row, message: `Photo for "${row.nameEn}" was skipped: ${err.message}` });
      return null;
    }
  });

  // Create categories in first-appearance order, after the existing ones
  let nextCatOrder = existingCats.length ? existingCats[existingCats.length - 1].sortOrder + 1 : 0;
  let categoriesCreated = 0;
  for (const row of rows) {
    const key = norm(row.categoryEn);
    if (catByName.has(key)) continue;
    const cat = await Category.create({
      restaurantId,
      nameEn: row.categoryEn,
      nameAr: row.categoryAr,
      layout: row.layout || 'grid',
      sortOrder: nextCatOrder++,
    });
    catByName.set(key, cat);
    categoriesCreated++;
  }

  const existingItems = await MenuItem.find({ restaurantId });
  const itemByKey = new Map(existingItems.map((i) => [`${i.categoryId}|${norm(i.nameEn)}`, i]));
  const nextItemOrder = new Map();
  for (const i of existingItems) {
    const cur = nextItemOrder.get(String(i.categoryId)) ?? 0;
    nextItemOrder.set(String(i.categoryId), Math.max(cur, i.sortOrder + 1));
  }

  let itemsCreated = 0;
  let itemsUpdated = 0;
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const cat = catByName.get(norm(row.categoryEn));
    const key = `${cat._id}|${norm(row.nameEn)}`;
    const imageUrl = uploaded[idx];
    const fields = {
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      descriptionEn: row.descriptionEn,
      descriptionAr: row.descriptionAr,
      basePrice: row.price,
      badgeText: row.badge,
      isActive: row.active,
    };
    const existing = itemByKey.get(key);
    if (existing) {
      Object.assign(existing, fields);
      if (imageUrl) {
        if (existing.imageUrl !== imageUrl) deleteImage(existing.imageUrl);
        existing.imageUrl = imageUrl;
      }
      await existing.save();
      itemsUpdated++;
    } else {
      const order = nextItemOrder.get(String(cat._id)) ?? 0;
      nextItemOrder.set(String(cat._id), order + 1);
      const item = await MenuItem.create({
        ...fields,
        restaurantId,
        categoryId: cat._id,
        imageUrl: imageUrl || '',
        sortOrder: order,
      });
      itemByKey.set(key, item);
      itemsCreated++;
    }
  }

  return { summary: { rows: rows.length, categoriesCreated, itemsCreated, itemsUpdated, imagesUploaded, warnings } };
}

// ---------- Template ----------

export async function buildTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DINEZA';
  const ws = wb.addWorksheet('Menu', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Category (EN)', key: 'categoryEn', width: 20 },
    { header: 'Category (AR)', key: 'categoryAr', width: 20 },
    { header: 'Name (EN)', key: 'nameEn', width: 26 },
    { header: 'Name (AR)', key: 'nameAr', width: 26 },
    { header: 'Description (EN)', key: 'descriptionEn', width: 36 },
    { header: 'Description (AR)', key: 'descriptionAr', width: 36 },
    { header: 'Price', key: 'price', width: 10 },
    { header: 'Image', key: 'image', width: 22 },
    { header: 'Badge', key: 'badge', width: 12 },
    { header: 'Active', key: 'active', width: 9 },
    { header: 'Layout', key: 'layout', width: 12 },
  ];
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;

  const examples = [
    ['Sandwiches', 'ساندويشات', 'Chicken Shawarma', 'شاورما دجاج', 'Grilled chicken, garlic sauce, pickles', 'دجاج مشوي، ثوم، مخلل', 1.5, '', 'NEW', 'yes', 'grid'],
    ['', '', 'Beef Shawarma', 'شاورما لحم', '', '', 1.8, '', '', 'yes', ''],
    ['Drinks', 'مشروبات', 'Fresh Orange Juice', 'عصير برتقال طازج', '', '', 0.9, 'https://example.com/orange.jpg', '', 'yes', 'compact'],
  ];
  for (const ex of examples) {
    const row = ws.addRow(ex);
    row.height = 60;
    row.alignment = { vertical: 'middle' };
    row.getCell('nameAr').alignment = { readingOrder: 'rtl', vertical: 'middle' };
    row.getCell('descriptionAr').alignment = { readingOrder: 'rtl', vertical: 'middle', wrapText: true };
  }
  ws.getColumn('price').numFmt = '0.000';
  ws.getColumn('categoryAr').alignment = { readingOrder: 'rtl', vertical: 'middle' };

  const help = wb.addWorksheet('Instructions');
  help.getColumn(1).width = 110;
  [
    'HOW TO FILL THE MENU SHEET',
    '',
    '1. One row per item. Delete the three example rows before importing, or keep them to see how it works.',
    '2. Category (EN) and Category (AR): write the category once on the first item of a group. The rows below inherit it.',
    '   A category that does not exist yet is created automatically (its Arabic name is required the first time).',
    '3. Name (EN), Name (AR) and Price are required. Descriptions, Badge, Active and Layout are optional.',
    '4. Image, three ways:',
    '   a) Excel 365: click the Image cell, Insert > Pictures > Place in Cell. The photo travels inside this file.',
    '   b) Any Excel: Insert > Pictures > Place over Cells, then drag the photo so its top-left corner sits in that row.',
    '   c) Paste a web link (https://...) to a picture.',
    '   Leave the cell empty for no photo. Photos are compressed and resized automatically after upload.',
    '5. Active: yes/no (empty = yes). Hidden items stay in your menu but are not shown to customers.',
    '6. Layout (only used when the category is new): grid, large, compact, list, hero or minimal.',
    '7. Re-importing the same file is safe: items with the same category and English name are updated, not duplicated.',
    '',
    'Max 1000 items per import. Keep the file as .xlsx (Excel Workbook).',
  ].forEach((line, i) => {
    const row = help.addRow([line]);
    if (i === 0) row.font = { bold: true, size: 13 };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
