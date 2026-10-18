import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import { HttpError } from '../middleware/error.js';
import { cleanUsername, cleanNewPassword } from '../utils/credentials.js';

// Brand manager (owner) manages the branch-manager accounts of their own branches.
// Every lookup is scoped to the owner's restaurant, so ids from another brand simply 404.

function managerJSON(user, branch) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
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

// POST /api/branches/:id/managers  { name, username, password, phone? }
export async function createManager(req, res) {
  const branch = await ownedBranch(req, req.params.id);
  const { name, username: rawUsername, password, phone } = req.body || {};
  const username = await cleanUsername(rawUsername);
  const manager = await User.create({
    role: 'branch_manager',
    name: cleanName(name),
    username,
    phone: String(phone ?? '').trim(),
    passwordHash: await bcrypt.hash(cleanNewPassword(password, username), 11),
    restaurantId: req.user.restaurantId,
    branchId: branch._id,
    createdBy: req.user._id,
    isActive: true,
  });
  res.status(201).json({ manager: managerJSON(manager, branch) });
}

// PATCH /api/managers/:managerId  { name?, username?, phone?, password?, isActive? }
// The branch assignment and role are fixed here: a manager cannot be promoted or moved by this call.
export async function updateManager(req, res) {
  const manager = await ownedManager(req);
  const { name, username, phone, password, isActive, role, branchId, restaurantId } = req.body || {};
  if (role !== undefined || branchId !== undefined || restaurantId !== undefined) {
    throw new HttpError(400, 'Role and branch assignment cannot be changed. Create a new manager for another branch.');
  }

  let endSessions = false;
  if (name !== undefined) manager.name = cleanName(name);
  if (phone !== undefined) manager.phone = String(phone ?? '').trim();
  if (username !== undefined) {
    const next = await cleanUsername(username, manager._id);
    if (next !== manager.username) {
      manager.username = next;
      endSessions = true;
    }
  }
  if (password !== undefined && password !== '') {
    manager.passwordHash = await bcrypt.hash(cleanNewPassword(password, manager.username), 11);
    // A password chosen by the brand manager meets the rules, so no forced change is needed
    manager.mustChangePassword = false;
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
