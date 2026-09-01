import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    // Card template used on the public menu:
    // grid = 2-col banner cards, large = full-width + circular price, compact = 3-col small,
    // list = horizontal rows, hero = full-bleed photo cards, minimal = elegant no-banner cards
    layout: { type: String, enum: ['grid', 'large', 'compact', 'list', 'hero', 'minimal'], default: 'grid' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
