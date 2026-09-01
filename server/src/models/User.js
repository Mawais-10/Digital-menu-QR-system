import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    businessName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['owner', 'super_admin'], default: 'owner' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    email: this.email,
    businessName: this.businessName,
    phone: this.phone,
    role: this.role,
    restaurantId: this.restaurantId,
  };
};

export default mongoose.model('User', userSchema);
