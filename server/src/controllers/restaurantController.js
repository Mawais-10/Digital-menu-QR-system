import Restaurant from '../models/Restaurant.js';
import Branch from '../models/Branch.js';
import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import { HttpError } from '../middleware/error.js';
import { processImage, deleteImage } from '../middleware/upload.js';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export async function createRestaurant(req, res) {
  if (req.user.restaurantId) throw new HttpError(409, 'Restaurant already exists for this account');
  const { nameEn, nameAr, themeColor, defaultLanguage, taglineEn, taglineAr } = req.body || {};
  if (!nameEn?.trim() || !nameAr?.trim()) throw new HttpError(400, 'Restaurant name is required in both English and Arabic');
  if (themeColor && !HEX_COLOR_RE.test(themeColor)) throw new HttpError(400, 'Theme color must be a hex color');

  const restaurant = await Restaurant.create({
    nameEn: nameEn.trim(),
    nameAr: nameAr.trim(),
    themeColor: themeColor || '#F97316',
    defaultLanguage: defaultLanguage === 'ar' ? 'ar' : 'en',
    taglineEn: (taglineEn || '').trim(),
    taglineAr: (taglineAr || '').trim(),
    ownerId: req.user._id,
  });
  req.user.restaurantId = restaurant._id;
  await req.user.save();
  res.status(201).json({ restaurant, user: req.user.toSafeJSON() });
}

export async function getRestaurant(req, res) {
  const restaurant = await Restaurant.findById(req.user.restaurantId);
  if (!restaurant) throw new HttpError(404, 'Restaurant not found');
  res.json({ restaurant });
}

export async function updateRestaurant(req, res) {
  const restaurant = await Restaurant.findById(req.user.restaurantId);
  if (!restaurant) throw new HttpError(404, 'Restaurant not found');

  const { nameEn, nameAr, themeColor, defaultLanguage, taglineEn, taglineAr, currency } = req.body || {};
  if (nameEn !== undefined) {
    if (!nameEn.trim()) throw new HttpError(400, 'English name cannot be empty');
    restaurant.nameEn = nameEn.trim();
  }
  if (nameAr !== undefined) {
    if (!nameAr.trim()) throw new HttpError(400, 'Arabic name cannot be empty');
    restaurant.nameAr = nameAr.trim();
  }
  if (themeColor !== undefined) {
    if (!HEX_COLOR_RE.test(themeColor)) throw new HttpError(400, 'Theme color must be a hex color');
    restaurant.themeColor = themeColor;
  }
  if (defaultLanguage !== undefined) restaurant.defaultLanguage = defaultLanguage === 'ar' ? 'ar' : 'en';
  if (taglineEn !== undefined) restaurant.taglineEn = taglineEn.trim();
  if (taglineAr !== undefined) restaurant.taglineAr = taglineAr.trim();
  if (currency !== undefined && currency.trim()) restaurant.currency = currency.trim().toUpperCase();

  await restaurant.save();
  res.json({ restaurant });
}

export async function uploadLogo(req, res) {
  if (!req.file) throw new HttpError(400, 'No image provided');
  const restaurant = await Restaurant.findById(req.user.restaurantId);
  if (!restaurant) throw new HttpError(404, 'Restaurant not found');

  const oldLogo = restaurant.logoUrl;
  restaurant.logoUrl = await processImage(req.file.buffer, { maxWidth: 512, quality: 90 });
  await restaurant.save();
  deleteImage(oldLogo);
  res.json({ restaurant });
}

export async function stats(req, res) {
  const restaurantId = req.user.restaurantId;
  const [branches, items, categories] = await Promise.all([
    Branch.countDocuments({ restaurantId }),
    MenuItem.countDocuments({ restaurantId }),
    Category.countDocuments({ restaurantId }),
  ]);
  res.json({ branches, items, categories });
}
