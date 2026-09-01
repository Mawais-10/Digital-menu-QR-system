import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    logoUrl: { type: String, default: '' },
    themeColor: { type: String, default: '#F97316' },
    defaultLanguage: { type: String, enum: ['en', 'ar'], default: 'en' },
    currency: { type: String, default: 'OMR' },
    taglineEn: { type: String, trim: true, default: '' },
    taglineAr: { type: String, trim: true, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Restaurant', restaurantSchema);
