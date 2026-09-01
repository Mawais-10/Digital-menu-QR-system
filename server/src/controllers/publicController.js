import Branch from '../models/Branch.js';
import Restaurant from '../models/Restaurant.js';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import BranchItem from '../models/BranchItem.js';
import { HttpError } from '../middleware/error.js';
import { mapLink } from './branchController.js';

// GET /api/public/menu/:slug — everything the customer-facing menu page needs, in one call
export async function publicMenu(req, res) {
  const branch = await Branch.findOne({ slug: req.params.slug.toLowerCase() });
  if (!branch || branch.status !== 'active') throw new HttpError(404, 'Menu not found');

  const [restaurant, categories, items, overrides] = await Promise.all([
    Restaurant.findById(branch.restaurantId),
    Category.find({ restaurantId: branch.restaurantId }).sort({ sortOrder: 1, createdAt: 1 }),
    MenuItem.find({ restaurantId: branch.restaurantId, isActive: true }).sort({ sortOrder: 1, createdAt: 1 }),
    BranchItem.find({ branchId: branch._id }),
  ]);
  if (!restaurant) throw new HttpError(404, 'Menu not found');

  const byItem = new Map(overrides.map((o) => [o.itemId.toString(), o]));

  const visibleItems = items
    .filter((item) => {
      const o = byItem.get(item._id.toString());
      return o ? o.isAvailable : true; // no override row = available by default
    })
    .map((item) => {
      const o = byItem.get(item._id.toString());
      return {
        id: item._id,
        categoryId: item.categoryId,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        descriptionEn: item.descriptionEn,
        descriptionAr: item.descriptionAr,
        imageUrl: item.imageUrl,
        price: o?.customPrice ?? item.basePrice,
        badgeText: item.badgeText,
      };
    });

  const usedCategoryIds = new Set(visibleItems.map((i) => i.categoryId.toString()));

  res.json({
    restaurant: {
      nameEn: restaurant.nameEn,
      nameAr: restaurant.nameAr,
      logoUrl: restaurant.logoUrl,
      themeColor: restaurant.themeColor,
      defaultLanguage: restaurant.defaultLanguage,
      currency: restaurant.currency,
      taglineEn: restaurant.taglineEn,
      taglineAr: restaurant.taglineAr,
    },
    branch: {
      nameEn: branch.nameEn,
      nameAr: branch.nameAr,
      address: branch.address,
      phone: branch.phone,
      slug: branch.slug,
      mapLink: mapLink(branch),
    },
    categories: categories
      .filter((c) => usedCategoryIds.has(c._id.toString()))
      .map((c) => ({ id: c._id, nameEn: c.nameEn, nameAr: c.nameAr, layout: c.layout || 'grid' })),
    items: visibleItems,
  });
}
