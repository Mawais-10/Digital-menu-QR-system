import BranchItem from '../models/BranchItem.js';
import MenuItem from '../models/MenuItem.js';
import { HttpError } from '../middleware/error.js';

// One place for branch-level item state, used by both the brand manager (any of their branches)
// and the branch manager (their own branch only). The master MenuItem is never written here.

export function rowState(item, override) {
  return {
    isAvailable: override ? override.isAvailable !== false : true,
    isSoldOut: override ? override.isSoldOut === true : false,
    soldOutAt: override?.isSoldOut ? override.soldOutAt || null : null,
    customPrice: override?.customPrice ?? null,
    effectivePrice: override?.customPrice ?? item.basePrice,
    updatedAt: override?.updatedAt || null,
  };
}

// Every master item merged with this branch's overrides, in menu order
export async function branchRows(branch) {
  const [items, overrides] = await Promise.all([
    MenuItem.find({ restaurantId: branch.restaurantId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate('categoryId', 'nameEn nameAr sortOrder'),
    BranchItem.find({ branchId: branch._id }),
  ]);
  const byItem = new Map(overrides.map((o) => [o.itemId.toString(), o]));
  return items.map((item) => ({ item, ...rowState(item, byItem.get(item._id.toString())) }));
}

function asBool(value, field) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new HttpError(400, `${field} must be true or false`);
}

/**
 * Applies a partial change to one item at one branch.
 * Only the fields that were sent are written ($set per field, atomic upsert), so two people
 * changing different switches at the same moment never overwrite each other — and toggling
 * "sold out" can never re-enable an item that was switched off for the branch.
 */
export async function updateBranchItemState(branch, itemId, body, { userId, allowPrice }) {
  const item = await MenuItem.findOne({ _id: itemId, restaurantId: branch.restaurantId });
  if (!item) throw new HttpError(404, 'Menu item not found');

  const { isAvailable, isSoldOut, customPrice } = body || {};
  const set = {};
  if (isAvailable !== undefined) set.isAvailable = asBool(isAvailable, 'isAvailable');
  if (isSoldOut !== undefined) {
    set.isSoldOut = asBool(isSoldOut, 'isSoldOut');
    set.soldOutAt = set.isSoldOut ? new Date() : null;
  }
  if (customPrice !== undefined) {
    if (!allowPrice) throw new HttpError(403, 'Branch managers cannot change prices');
    if (customPrice !== null && (typeof customPrice !== 'number' || !Number.isFinite(customPrice) || customPrice < 0)) {
      throw new HttpError(400, 'Custom price must be a non-negative number or null');
    }
    set.customPrice = customPrice;
  }
  if (!Object.keys(set).length) throw new HttpError(400, 'Nothing to update');
  set.updatedBy = userId || null;

  const override = await BranchItem.findOneAndUpdate(
    { branchId: branch._id, itemId: item._id },
    { $set: set, $setOnInsert: { branchId: branch._id, itemId: item._id } },
    { new: true, upsert: true, runValidators: true }
  );
  // Return the full current state so the client can reconcile with changes made by others
  return { itemId: item._id, ...rowState(item, override) };
}
