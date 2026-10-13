import mongoose from 'mongoose';

// Roles
//  owner          — the Brand Manager: owns the restaurant (brand), its master menu and every branch
//  super_admin    — platform staff
//  branch_manager — bound to ONE branch (branchId); may only change that branch's item availability
export const ROLES = ['owner', 'super_admin', 'branch_manager'];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Brand name for owners; branch managers carry a personal `name` instead
    businessName: {
      type: String,
      trim: true,
      default: '',
      required: [
        function requiredForOwners() {
          return this.role !== 'branch_manager';
        },
        'Business name is required',
      ],
    },
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ROLES, default: 'owner' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    // Only set for branch managers: the single branch this account may act on
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    // Deactivated accounts cannot sign in and lose any open session on their next request
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    email: this.email,
    businessName: this.businessName,
    name: this.name,
    phone: this.phone,
    role: this.role,
    restaurantId: this.restaurantId,
    branchId: this.branchId,
    isActive: this.isActive !== false,
  };
};

export default mongoose.model('User', userSchema);
