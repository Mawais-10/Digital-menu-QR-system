import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { HttpError } from '../middleware/error.js';

// Brand manager (owner) manages the branch-manager accounts of their own branches.
// Every lookup is scoped to the owner's restaurant, so ids from another brand simply 404.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function managerJSON(user, branch) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive !== false,
    branchId: user.branchId,
    branchName: branch?.nameEn,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function ownedBranch(req, id) {
  const branch = await Branch.findOne({ _id: id, restaurantId: req.user.restaurantId });
  if (!branch) throw new HttpError(404, 'Branch not found');
  return branch;
}

async function ownedManager(req) {
  const manager = await User.findOne({
    _id: req.params.managerId,
    role: 'branch_manager',
    restaurantId: req.user.restaurantId,
  });
  if (!manager) throw new HttpError(404, 'Branch manager not found');
  return manager;
}

function cleanName(name) {
  const value = String(name ?? '').trim();
  if (!value) throw new HttpError(400, 'Name is required');
  if (value.length > 80) throw new HttpError(400, 'Name is too long');
  return value;
}

async function cleanEmail(email, exceptId) {
  const value = String(email ?? '').toLowerCase().trim();
  if (!EMAIL_RE.test(value)) throw new HttpError(400, 'A valid email is required');
  const taken = await User.findOne({ email: value, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  if (taken) throw new HttpError(409, 'An account with this email already exists');
  return value;
}

function cleanPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters`);
  }
  return password;
}

// GET /api/branches/:id/managers
export async function listManagers(req, res) {
  const branch = await ownedBranch(req, req.params.id);
  const managers = await User.find({
    role: 'branch_manager',
    restaurantId: req.user.restaurantId,
    branchId: branch._id,
  }).sort({ createdAt: 1 });
  res.json({ managers: managers.map((m) => managerJSON(m, branch)) });
}

// POST /api/branches/:id/managers  { name, email, password, phone? }
export async function createManager(req, res) {
  const branch = await ownedBranch(req, req.params.id);
  const { name, email, password, phone } = req.body || {};
  const manager = await User.create({
    role: 'branch_manager',
    name: cleanName(name),
    email: await cleanEmail(email),
    phone: String(phone ?? '').trim(),
    passwordHash: await bcrypt.hash(cleanPassword(password), 11),
    restaurantId: req.user.restaurantId,
    branchId: branch._id,
    createdBy: req.user._id,
    isActive: true,
  });
  res.status(201).json({ manager: managerJSON(manager, branch) });
}

// PATCH /api/managers/:managerId  { name?, email?, phone?, password?, isActive? }
// The branch assignment and role are fixed here: a manager cannot be promoted or moved by this call.
export async function updateManager(req, res) {
  const manager = await ownedManager(req);
  const { name, email, phone, password, isActive, role, branchId, restaurantId } = req.body || {};
  if (role !== undefined || branchId !== undefined || restaurantId !== undefined) {
    throw new HttpError(400, 'Role and branch assignment cannot be changed. Create a new manager for another branch.');
  }

  let endSessions = false;
  if (name !== undefined) manager.name = cleanName(name);
  if (phone !== undefined) manager.phone = String(phone ?? '').trim();
  if (email !== undefined) {
    const next = await cleanEmail(email, manager._id);
    if (next !== manager.email) {
      manager.email = next;
      endSessions = true;
    }
  }
  if (password !== undefined && password !== '') {
    manager.passwordHash = await bcrypt.hash(cleanPassword(password), 11);
    endSessions = true;
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') throw new HttpError(400, 'isActive must be true or false');
    if (!isActive && manager.isActive !== false) endSessions = true;
    manager.isActive = isActive;
  }
  // Credential changes and deactivation sign the manager out everywhere
  if (endSessions) manager.refreshTokenHash = null;

  await manager.save();
  const branch = await Branch.findById(manager.branchId).select('nameEn');
  res.json({ manager: managerJSON(manager, branch) });
}

// DELETE /api/managers/:managerId — revokes the account permanently
export async function deleteManager(req, res) {
  const manager = await ownedManager(req);
  await manager.deleteOne();
  res.json({ ok: true });
}
