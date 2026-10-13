import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// Excel 365 "Insert > Pictures > Place in Cell" stores the picture as a *rich value*
// rather than a floating drawing. exceljs only exposes floating drawings, so this
// walks the rich-value chain by hand:
//   sheet cell  vm="N"  →  xl/metadata.xml valueMetadata[N-1] → rc.v
//   → futureMetadata(XLRICHVALUE)[v] → rvb.i → xl/richData/rdrichvalue.xml rv[i]
//   → rv.v[idx of _rvRel:LocalImageIdentifier] → richValueRel.xml rel[k] → r:id
//   → richValueRel.xml.rels → ../media/imageX.png
// Returns { 'H2': { buffer, extension }, ... } keyed by cell reference.

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

function resolvePath(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').filter(Boolean);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

// Depth-first search for the first element whose tag name matches (namespace-agnostic)
function findTag(node, local) {
  if (!node || typeof node !== 'object') return null;
  for (const [k, v] of Object.entries(node)) {
    if (k === local || k.endsWith(`:${local}`)) return v;
    if (typeof v === 'object') {
      const hit = findTag(v, local);
      if (hit != null) return hit;
    }
  }
  return null;
}

export async function extractInCellImages(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const text = async (p) => (zip.file(p) ? zip.file(p).async('string') : null);

  const wbXml = await text('xl/workbook.xml');
  const wbRels = await text('xl/_rels/workbook.xml.rels');
  if (!wbXml || !wbRels) return {};

  const firstSheet = arr(findTag(parser.parse(wbXml), 'sheet'))[0];
  const rid = firstSheet?.['@_r:id'];
  const sheetRel = arr(findTag(parser.parse(wbRels), 'Relationship')).find((r) => r['@_Id'] === rid);
  if (!sheetRel) return {};
  const sheetXml = await text(resolvePath('xl/', sheetRel['@_Target']));
  if (!sheetXml || !/\bvm="\d+"/.test(sheetXml)) return {};

  const [metaXml, rvXml, rvStructXml, rvRelXml, rvRelRelsXml] = await Promise.all([
    text('xl/metadata.xml'),
    text('xl/richData/rdrichvalue.xml'),
    text('xl/richData/rdrichvaluestructure.xml'),
    text('xl/richData/richValueRel.xml'),
    text('xl/richData/_rels/richValueRel.xml.rels'),
  ]);
  if (!metaXml || !rvXml || !rvRelXml || !rvRelRelsXml) return {};

  const meta = parser.parse(metaXml);
  const valueBks = arr(findTag(meta, 'valueMetadata')?.bk);
  const futureAll = arr(findTag(meta, 'futureMetadata'));
  const future = futureAll.find((f) => f['@_name'] === 'XLRICHVALUE') || futureAll[0];
  const futureBks = arr(future?.bk);

  const rvs = arr(findTag(parser.parse(rvXml), 'rv'));
  const structs = rvStructXml ? arr(findTag(parser.parse(rvStructXml), 's')) : [];
  const rels = arr(findTag(parser.parse(rvRelXml), 'rel'));
  const relTargets = Object.fromEntries(
    arr(findTag(parser.parse(rvRelRelsXml), 'Relationship')).map((r) => [r['@_Id'], r['@_Target']])
  );

  // Rich value index → media path
  const mediaForRv = (rvIndex) => {
    const rv = rvs[rvIndex];
    if (!rv) return null;
    const vals = arr(rv.v).map((v) => (typeof v === 'object' ? v['#text'] : v));
    const struct = structs[Number(rv['@_s'] ?? 0)];
    let keyIdx = 0;
    if (struct) {
      const keys = arr(struct.k);
      const i = keys.findIndex((k) => k['@_n'] === '_rvRel:LocalImageIdentifier');
      if (i >= 0) keyIdx = i;
    }
    const relIdx = Number(vals[keyIdx]);
    const rel = rels[relIdx];
    const target = rel && relTargets[rel['@_r:id']];
    return target ? resolvePath('xl/richData/', target) : null;
  };

  const out = {};
  const cellRe = /<c\b([^>]*)\/?>/g;
  let m;
  while ((m = cellRe.exec(sheetXml))) {
    const attrs = m[1];
    const vm = /\bvm="(\d+)"/.exec(attrs);
    const ref = /\br="([A-Z]+\d+)"/.exec(attrs);
    if (!vm || !ref) continue;
    const valueBk = valueBks[Number(vm[1]) - 1];
    const rc = arr(valueBk?.rc)[0];
    if (!rc) continue;
    const futureBk = futureBks[Number(rc['@_v'])];
    const rvb = findTag(futureBk, 'rvb');
    if (!rvb) continue;
    const mediaPath = mediaForRv(Number(rvb['@_i']));
    const file = mediaPath && zip.file(mediaPath);
    if (!file) continue;
    out[ref[1]] = {
      buffer: await file.async('nodebuffer'),
      extension: (mediaPath.split('.').pop() || 'png').toLowerCase(),
    };
  }
  return out;
}
