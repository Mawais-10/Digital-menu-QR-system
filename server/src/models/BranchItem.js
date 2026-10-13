import mongoose from 'mongoose';

// Per-branch override of a master menu item. Absence of a row means the item
// is available at the branch at its base price and is not sold out (new items default to visible).
//
// Two independent switches live here, and neither ever changes the other:
//  isAvailable — the branch carries the item at all (false = hidden from this branch's menu)
//  isSoldOut   — the branch carries it but has run out for now (shown, but cannot be ordered)
const branchItemSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true, index: true },
    isAvailable: { type: Boolean, default: true },
    isSoldOut: { type: Boolean, default: false },
    soldOutAt: { type: Date, default: null },
    customPrice: { type: Number, default: null, min: 0 },
    // Who last changed this branch's settings for the item (owner or branch manager)
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

branchItemSchema.index({ branchId: 1, itemId: 1 }, { unique: true });

export default mongoose.model('BranchItem', branchItemSchema);
