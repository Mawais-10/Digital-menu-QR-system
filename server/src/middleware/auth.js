import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

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
