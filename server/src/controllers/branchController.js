import Branch from '../models/Branch.js';
import BranchItem from '../models/BranchItem.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import { branchRows, updateBranchItemState } from '../services/branchAvailability.js';
import { HttpError } from '../middleware/error.js';
import { uniqueBranchSlug } from '../utils/slugify.js';
import { env } from '../config/env.js';

export function menuUrl(slug) {
  return `${env.publicBaseUrl}/menu/${slug}`;
}

// Universal Google Maps link — opens the native maps app on phones
export function mapLink(branch) {
  if (branch.mapUrl) return branch.mapUrl;
  if (branch.lat != null && branch.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
  }
  return '';
}

function parseLocation(body) {
  const out = {};
  if (body.mapUrl !== undefined) {
    const url = String(body.mapUrl).trim();
    if (url && !/^https?:\/\//i.test(url)) throw new HttpError(400, 'Map link must be a valid URL (https://...)');
    out.mapUrl = url;
  }
  for (const key of ['lat', 'lng']) {
    if (body[key] !== undefined) {
      if (body[key] === null || body[key] === '') {
        out[key] = null;
      } else {
        const n = Number(body[key]);
        if (Number.isNaN(n)) throw new HttpError(400, 'Invalid coordinates');
        out[key] = n;
      }
    }
  }
  return out;
}

async function ownedBranch(req) {
  const branch = await Branch.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!branch) throw new HttpError(404, 'Branch not found');
  return branch;
}

export async function listBranches(req, res) {
  const branches = await Branch.find({ restaurantId: req.user.restaurantId }).sort({ createdAt: 1 });
  res.json({ branches: branches.map((b) => ({ ...b.toObject(), menuUrl: menuUrl(b.slug) })) });
}

export async function createBranch(req, res) {
  const { nameEn, nameAr, address, phone } = req.body || {};
  if (!nameEn?.trim()) throw new HttpError(400, 'Branch name (English) is required');

  const restaurant = await Restaurant.findById(req.user.restaurantId);
  const slug = await uniqueBranchSlug(restaurant.nameEn, nameEn);

  const branch = await Branch.create({
    restaurantId: req.user.restaurantId,
    nameEn: nameEn.trim(),
    nameAr: (nameAr || '').trim(),
    slug,
    address: (address || '').trim(),
    phone: (phone || '').trim(),
    ...parseLocation(req.body || {}),
  });
  res.status(201).json({ branch: { ...branch.toObject(), menuUrl: menuUrl(branch.slug) } });
}

export async function getBranch(req, res) {
  const branch = await ownedBranch(req);
  res.json({ branch: { ...branch.toObject(), menuUrl: menuUrl(branch.slug) } });
}

export async function updateBranch(req, res) {
  const branch = await ownedBranch(req);
  const { nameEn, nameAr, address, phone, status, slug } = req.body || {};
  // Slug is permanent — printed QR codes depend on it
  if (slug !== undefined && slug !== branch.slug) {
    throw new HttpError(400, 'Branch slug is permanent and cannot be changed — printed QR codes depend on it');
  }
  if (nameEn !== undefined) {
    if (!nameEn.trim()) throw new HttpError(400, 'Branch name cannot be empty');
    branch.nameEn = nameEn.trim();
  }
  if (nameAr !== undefined) branch.nameAr = nameAr.trim();
  if (address !== undefined) branch.address = address.trim();
  if (phone !== undefined) branch.phone = phone.trim();
  Object.assign(branch, parseLocation(req.body || {}));
  if (status !== undefined) {
    if (!['active', 'inactive'].includes(status)) throw new HttpError(400, 'Invalid status');
    branch.status = status;
  }
  await branch.save();
  res.json({ branch: { ...branch.toObject(), menuUrl: menuUrl(branch.slug) } });
}

export async function deleteBranch(req, res) {
  const branch = await ownedBranch(req);
  await BranchItem.deleteMany({ branchId: branch._id });
  // A branch manager account only exists for its branch; remove it with the branch
  await User.deleteMany({ role: 'branch_manager', branchId: branch._id, restaurantId: req.user.restaurantId });
  await branch.deleteOne();
  res.json({ ok: true });
}

// Availability matrix: every master item merged with this branch's overrides
export async function listBranchItems(req, res) {
  const branch = await ownedBranch(req);
  const items = await branchRows(branch);
  res.json({ branch: { id: branch._id, nameEn: branch.nameEn, slug: branch.slug }, items });
}

// Brand manager: visibility, sold out and branch price for any of their branches
export async function updateBranchItem(req, res) {
  const branch = await ownedBranch(req);
  const result = await updateBranchItemState(branch, req.params.itemId, req.body, {
    userId: req.user._id,
    allowPrice: true,
  });
  res.json(result);
}
