import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = jwt.verify(token, env.jwtAccessSecret);
    // Re-read the account on every request so role changes and deactivation apply immediately
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    if (user.isActive === false) {
      return res.status(401).json({ message: 'This account has been deactivated', code: 'ACCOUNT_DISABLED' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired', code: 'TOKEN_EXPIRED' });
  }
}

// Most dashboard resources require the owner to have completed onboarding
export function requireRestaurant(req, res, next) {
  if (!req.user?.restaurantId) {
    return res.status(403).json({ message: 'Restaurant profile not created yet', code: 'NO_RESTAURANT' });
  }
  next();
}

// Brand-level access: the master menu, brand profile, every branch, QR codes and manager accounts.
// Branch managers are refused here regardless of which route they call or what ids they send.
export function requireOwner(req, res, next) {
  if (req.user?.role === 'owner' || req.user?.role === 'super_admin') return next();
  return res.status(403).json({ message: 'You do not have access to this area', code: 'FORBIDDEN' });
}

// Branch-manager access. The branch always comes from the account itself — never from a URL,
// query string or body — so a manager cannot reach another branch by changing an id.
export async function requireBranchManager(req, res, next) {
  try {
    if (req.user?.role !== 'branch_manager' || !req.user.branchId || !req.user.restaurantId) {
      return res.status(403).json({ message: 'You do not have access to this area', code: 'FORBIDDEN' });
    }
    const branch = await Branch.findOne({ _id: req.user.branchId, restaurantId: req.user.restaurantId });
    if (!branch) {
      return res.status(403).json({ message: 'Your branch is no longer available. Contact your brand manager.', code: 'NO_BRANCH' });
    }
    req.branch = branch;
    next();
  } catch (err) {
    next(err);
  }
}
