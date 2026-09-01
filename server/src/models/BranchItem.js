import mongoose from 'mongoose';

// Per-branch override of a master menu item. Absence of a row means the item
// is available at the branch at its base price (new items default to visible).
const branchItemSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true, index: true },
    isAvailable: { type: Boolean, default: true },
    customPrice: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

branchItemSchema.index({ branchId: 1, itemId: 1 }, { unique: true });

export default mongoose.model('BranchItem', branchItemSchema);
