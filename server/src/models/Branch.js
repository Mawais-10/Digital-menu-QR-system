import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true, default: '' },
    // Permanent public identifier — encoded in printed QR codes. NEVER changes after creation.
    slug: { type: String, required: true, unique: true, lowercase: true, immutable: true },
    address: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    // Location for "get directions": either captured GPS coordinates or a pasted maps link
    lat: { type: Number, default: null, min: -90, max: 90 },
    lng: { type: Number, default: null, min: -180, max: 180 },
    mapUrl: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Branch', branchSchema);
