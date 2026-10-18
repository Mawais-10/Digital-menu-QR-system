import User from '../models/User.js';
import { HttpError } from '../middleware/error.js';

// Sign-in is by username + password. The client mirrors these rules in
// client/src/lib/credentials.js so people see them while typing; keep both in step.

export const USERNAME_MIN = 8;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72; // bcrypt ignores anything past 72 bytes

const RESERVED = ['admin', 'root', 'support', 'dineza', 'system', 'superuser'];

// Usernames are case-insensitive: stored and compared in lowercase
export const normalizeUsername = (value) => String(value ?? '').trim().toLowerCase();

export function usernameProblem(username) {
  const u = username;
  if (u.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters`;
  if (u.length > USERNAME_MAX) return `Username must be at most ${USERNAME_MAX} characters`;
  if (!/^[a-z0-9._]+$/.test(u)) return 'Username can only use English letters, numbers, dot (.) and underscore (_)';
  if (!/^[a-z]/.test(u)) return 'Username must start with a letter';
  if (!/[0-9]/.test(u)) return 'Username must include at least one number';
  if (/[._]{2}/.test(u)) return 'Username cannot have two symbols in a row';
  if (/[._]$/.test(u)) return 'Username cannot end with a dot or underscore';
  if (RESERVED.some((w) => u.startsWith(w))) return 'This username is reserved. Choose another one';
  return null;
}

export function passwordProblem(password, username = '') {
  const p = String(password ?? '');
  if (p.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (Buffer.byteLength(p, 'utf8') > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`;
  if (/\s/.test(p)) return 'Password cannot contain spaces';
  if (!/[A-Z]/.test(p)) return 'Password must include a capital letter (A-Z)';
  if (!/[a-z]/.test(p)) return 'Password must include a small letter (a-z)';
  if (!/[0-9]/.test(p)) return 'Password must include a number (0-9)';
  if (!/[^A-Za-z0-9]/.test(p)) return 'Password must include a symbol, for example ! @ # $ %';
  if (username && p.toLowerCase().includes(username.toLowerCase())) return 'Password cannot contain the username';
  return null;
}

// Validated, lowercase and not used by any other account (exceptId: the account being edited)
export async function cleanUsername(value, exceptId) {
  const username = normalizeUsername(value);
  const problem = usernameProblem(username);
  if (problem) throw new HttpError(400, problem);
  const taken = await User.exists({ username, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  if (taken) throw new HttpError(409, 'This username is already taken');
  return username;
}

export function cleanNewPassword(password, username) {
  const problem = passwordProblem(password, username);
  if (problem) throw new HttpError(400, problem);
  return password;
}
