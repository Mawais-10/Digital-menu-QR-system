import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    descriptionEn: { type: String, trim: true, default: '' },
    descriptionAr: { type: String, trim: true, default: '' },
    imageUrl: { type: String, default: '' },
    basePrice: { type: Number, required: true, min: 0 },
    // Promo ribbon on the card, e.g. "NEW" / "خصم 20%"
    badgeText: { type: String, trim: true, default: '' },
    // Master-level default availability (per-branch overrides live in BranchItem)
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('MenuItem', menuItemSchema);
