import Restaurant from '../models/Restaurant.js';
import { HttpError } from '../middleware/error.js';
import { branchRows, updateBranchItemState } from '../services/branchAvailability.js';
import { menuUrl } from './branchController.js';

// Branch-manager endpoints. `req.branch` is resolved from the signed-in account by
// requireBranchManager — no route here accepts a branch id from the request.

const MANAGER_FIELDS = ['isAvailable', 'isSoldOut'];

// GET /api/my-branch
export async function myBranch(req, res) {
  const branch = req.branch;
  const restaurant = await Restaurant.findById(branch.restaurantId).select('nameEn nameAr logoUrl currency themeColor');
  res.json({
    branch: {
      id: branch._id,
      nameEn: branch.nameEn,
      nameAr: branch.nameAr,
      slug: branch.slug,
      status: branch.status,
      menuUrl: menuUrl(branch.slug),
    },
    // Read-only brand details for display; managing them stays with the brand manager
    restaurant: restaurant
      ? {
          nameEn: restaurant.nameEn,
          nameAr: restaurant.nameAr,
          logoUrl: restaurant.logoUrl,
          currency: restaurant.currency,
          themeColor: restaurant.themeColor,
        }
      : null,
  });
}

// GET /api/my-branch/items — the branch's menu with its own availability, no editing fields
export async function myBranchItems(req, res) {
  const rows = await branchRows(req.branch);
  res.json({
    items: rows.map(({ item, isAvailable, isSoldOut, soldOutAt, effectivePrice, updatedAt }) => ({
      item: {
        _id: item._id,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        imageUrl: item.imageUrl,
        isActive: item.isActive,
        categoryId: item.categoryId,
      },
      isAvailable,
      isSoldOut,
      soldOutAt,
      price: effectivePrice,
      updatedAt,
    })),
  });
}

// PATCH /api/my-branch/items/:itemId  { isAvailable?, isSoldOut? }
export async function updateMyBranchItem(req, res) {
  const body = req.body || {};
  const extra = Object.keys(body).filter((k) => !MANAGER_FIELDS.includes(k));
  if (extra.length) {
    throw new HttpError(403, `Branch managers can only change availability and sold-out status (not: ${extra.join(', ')})`);
  }
  const result = await updateBranchItemState(req.branch, req.params.itemId, body, {
    userId: req.user._id,
    allowPrice: false,
  });
  res.json({
    itemId: result.itemId,
    isAvailable: result.isAvailable,
    isSoldOut: result.isSoldOut,
    soldOutAt: result.soldOutAt,
    price: result.effectivePrice,
    updatedAt: result.updatedAt,
  });
}
