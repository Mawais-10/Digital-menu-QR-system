import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, refreshCookieOptions } from '../utils/tokens.js';
import { cleanUsername, cleanNewPassword, normalizeUsername, passwordProblem } from '../utils/credentials.js';

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie('refresh_token', refreshToken, refreshCookieOptions());
  return accessToken;
}

export async function signup(req, res) {
  const { businessName, username: rawUsername, phone, password } = req.body || {};
  if (!businessName?.trim()) throw new HttpError(400, 'Business name is required');
  const username = await cleanUsername(rawUsername);
  cleanNewPassword(password, username);

  const user = await User.create({
    businessName: businessName.trim(),
    username,
    phone: (phone || '').trim(),
    passwordHash: await bcrypt.hash(password, 11),
  });

  const accessToken = await issueSession(res, user);
  res.status(201).json({ accessToken, user: user.toSafeJSON() });
}

export async function login(req, res) {
  const { username, password } = req.body || {};
  const user = await User.findOne({ username: normalizeUsername(username) });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    throw new HttpError(401, 'Invalid username or password');
  }
  if (user.isActive === false) {
    throw new HttpError(403, 'This account has been deactivated. Contact your brand manager.');
  }
  // A password set before the current rules still works once, then has to be replaced
  user.mustChangePassword = passwordProblem(password, user.username) !== null;
  const accessToken = await issueSession(res, user);
  res.json({ accessToken, user: user.toSafeJSON() });
}

export async function refresh(req, res) {
  const token = req.cookies?.refresh_token;
  if (!token) throw new HttpError(401, 'No refresh token');
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, 'Invalid refresh token');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.refreshTokenHash !== hashToken(token)) {
    throw new HttpError(401, 'Refresh token revoked');
  }
  if (user.isActive === false) {
    throw new HttpError(401, 'This account has been deactivated');
  }
  // Issue a fresh access token WITHOUT rotating the refresh cookie — rotation made
  // parallel refreshes (second tab, remounted app) race each other into a logout.
  const accessToken = signAccessToken(user);
  res.json({ accessToken, user: user.toSafeJSON() });
}

export async function logout(req, res) {
  const token = req.cookies?.refresh_token;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne({ _id: payload.sub }, { refreshTokenHash: null });
    } catch {
      // already invalid — nothing to revoke
    }
  }
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.json({ ok: true });
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

export async function updateProfile(req, res) {
  const { businessName, phone } = req.body || {};
  if (businessName !== undefined) {
    if (!businessName.trim()) throw new HttpError(400, 'Business name cannot be empty');
    req.user.businessName = businessName.trim();
  }
  if (phone !== undefined) req.user.phone = phone.trim();
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!(await bcrypt.compare(currentPassword || '', req.user.passwordHash))) {
    throw new HttpError(400, 'Current password is incorrect');
  }
  cleanNewPassword(newPassword, req.user.username);
  if (await bcrypt.compare(newPassword, req.user.passwordHash)) {
    throw new HttpError(400, 'Choose a password different from the current one');
  }
  req.user.passwordHash = await bcrypt.hash(newPassword, 11);
  req.user.mustChangePassword = false;
  await req.user.save();
  res.json({ ok: true, user: req.user.toSafeJSON() });
}
