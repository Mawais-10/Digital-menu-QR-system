import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import BranchItem from '../models/BranchItem.js';
import { HttpError } from '../middleware/error.js';
import { processImage, deleteImage } from '../middleware/upload.js';

// ---------- Categories ----------

export async function listCategories(req, res) {
  const categories = await Category.find({ restaurantId: req.user.restaurantId }).sort({ sortOrder: 1, createdAt: 1 });
  res.json({ categories });
}

const LAYOUTS = ['grid', 'large', 'compact', 'list', 'hero', 'minimal'];

export async function createCategory(req, res) {
  const { nameEn, nameAr, layout } = req.body || {};
  if (!nameEn?.trim() || !nameAr?.trim()) throw new HttpError(400, 'Category name is required in both English and Arabic');
  const last = await Category.findOne({ restaurantId: req.user.restaurantId }).sort({ sortOrder: -1 });
  const category = await Category.create({
    restaurantId: req.user.restaurantId,
    nameEn: nameEn.trim(),
    nameAr: nameAr.trim(),
    layout: LAYOUTS.includes(layout) ? layout : 'grid',
    sortOrder: last ? last.sortOrder + 1 : 0,
  });
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const category = await Category.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!category) throw new HttpError(404, 'Category not found');
  const { nameEn, nameAr, layout } = req.body || {};
  if (nameEn !== undefined) {
    if (!nameEn.trim()) throw new HttpError(400, 'English name cannot be empty');
    category.nameEn = nameEn.trim();
  }
  if (nameAr !== undefined) {
    if (!nameAr.trim()) throw new HttpError(400, 'Arabic name cannot be empty');
    category.nameAr = nameAr.trim();
  }
  if (layout !== undefined) {
    if (!LAYOUTS.includes(layout)) throw new HttpError(400, 'Invalid layout');
    category.layout = layout;
  }
  await category.save();
  res.json({ category });
}

export async function deleteCategory(req, res) {
  const category = await Category.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!category) throw new HttpError(404, 'Category not found');
  const itemCount = await MenuItem.countDocuments({ categoryId: category._id });
  if (itemCount > 0) throw new HttpError(400, `This category still has ${itemCount} item(s). Move or delete them first.`);
  await category.deleteOne();
  res.json({ ok: true });
}

export async function reorderCategories(req, res) {
  const { order } = req.body || {};
  if (!Array.isArray(order)) throw new HttpError(400, 'order must be an array of category ids');
  await Promise.all(
    order.map((id, index) =>
      Category.updateOne({ _id: id, restaurantId: req.user.restaurantId }, { sortOrder: index })
    )
  );
  const categories = await Category.find({ restaurantId: req.user.restaurantId }).sort({ sortOrder: 1 });
  res.json({ categories });
}

// ---------- Menu items ----------

function parseItemBody(body) {
  const out = {};
  const strings = ['nameEn', 'nameAr', 'descriptionEn', 'descriptionAr', 'badgeText', 'categoryId'];
  for (const key of strings) if (body[key] !== undefined) out[key] = String(body[key]).trim();
  if (body.basePrice !== undefined) {
    const price = Number(body.basePrice);
    if (Number.isNaN(price) || price < 0) throw new HttpError(400, 'Price must be a non-negative number');
    out.basePrice = price;
  }
  if (body.isActive !== undefined) out.isActive = body.isActive === true || body.isActive === 'true';
  return out;
}

export async function listItems(req, res) {
  const filter = { restaurantId: req.user.restaurantId };
  if (req.query.category) filter.categoryId = req.query.category;
  const items = await MenuItem.find(filter).sort({ sortOrder: 1, createdAt: 1 });
  res.json({ items });
}

export async function createItem(req, res) {
  const data = parseItemBody(req.body || {});
  if (!data.nameEn || !data.nameAr) throw new HttpError(400, 'Item name is required in both English and Arabic');
  if (data.basePrice === undefined) throw new HttpError(400, 'Price is required');
  if (!data.categoryId) throw new HttpError(400, 'Category is required');

  const category = await Category.findOne({ _id: data.categoryId, restaurantId: req.user.restaurantId });
  if (!category) throw new HttpError(400, 'Category not found');

  if (req.file) data.imageUrl = await processImage(req.file.buffer);

  const last = await MenuItem.findOne({ restaurantId: req.user.restaurantId, categoryId: data.categoryId }).sort({ sortOrder: -1 });
  const item = await MenuItem.create({
    ...data,
    restaurantId: req.user.restaurantId,
    sortOrder: last ? last.sortOrder + 1 : 0,
  });
  res.status(201).json({ item });
}

export async function updateItem(req, res) {
  const item = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!item) throw new HttpError(404, 'Menu item not found');

  const data = parseItemBody(req.body || {});
  if (data.nameEn === '') throw new HttpError(400, 'English name cannot be empty');
  if (data.nameAr === '') throw new HttpError(400, 'Arabic name cannot be empty');
  if (data.categoryId) {
    const category = await Category.findOne({ _id: data.categoryId, restaurantId: req.user.restaurantId });
    if (!category) throw new HttpError(400, 'Category not found');
  }
  if (req.file) {
    deleteImage(item.imageUrl);
    data.imageUrl = await processImage(req.file.buffer);
  }

  Object.assign(item, data);
  await item.save();
  res.json({ item });
}

export async function deleteItem(req, res) {
  const item = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
  if (!item) throw new HttpError(404, 'Menu item not found');
  deleteImage(item.imageUrl);
  await BranchItem.deleteMany({ itemId: item._id });
  await item.deleteOne();
  res.json({ ok: true });
}
