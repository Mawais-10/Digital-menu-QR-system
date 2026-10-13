import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRestaurant, requireOwner, requireBranchManager } from '../middleware/auth.js';
import { asyncHandler as ah } from '../utils/asyncHandler.js';
import { upload, uploadSpreadsheet } from '../middleware/upload.js';
import * as auth from '../controllers/authController.js';
import * as restaurant from '../controllers/restaurantController.js';
import * as branches from '../controllers/branchController.js';
import * as managers from '../controllers/managerController.js';
import * as myBranch from '../controllers/myBranchController.js';
import * as menu from '../controllers/menuController.js';
import * as qr from '../controllers/qrController.js';
import * as pub from '../controllers/publicController.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });
const publicLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

// Brand manager (owner) with a completed restaurant profile
const brand = [requireAuth, requireOwner, requireRestaurant];
// Branch manager bound to a single branch
const branchManager = [requireAuth, requireBranchManager];

// ---- Auth (any signed-in role) ----
router.post('/auth/signup', authLimiter, ah(auth.signup));
router.post('/auth/login', authLimiter, ah(auth.login));
router.post('/auth/refresh', ah(auth.refresh));
router.post('/auth/logout', ah(auth.logout));
router.get('/auth/me', requireAuth, ah(auth.me));
router.patch('/auth/me', requireAuth, requireOwner, ah(auth.updateProfile));
router.patch('/auth/password', requireAuth, ah(auth.changePassword));

// ---- Restaurant (brand profile) ----
router.post('/restaurant', requireAuth, requireOwner, ah(restaurant.createRestaurant));
router.get('/restaurant', ...brand, ah(restaurant.getRestaurant));
router.patch('/restaurant', ...brand, ah(restaurant.updateRestaurant));
router.post('/restaurant/logo', ...brand, upload.single('image'), ah(restaurant.uploadLogo));
router.get('/stats', ...brand, ah(restaurant.stats));

// ---- Branches ----
router.get('/branches', ...brand, ah(branches.listBranches));
router.post('/branches', ...brand, ah(branches.createBranch));
router.get('/branches/:id', ...brand, ah(branches.getBranch));
router.patch('/branches/:id', ...brand, ah(branches.updateBranch));
router.delete('/branches/:id', ...brand, ah(branches.deleteBranch));
router.get('/branches/:id/items', ...brand, ah(branches.listBranchItems));
router.patch('/branches/:id/items/:itemId', ...brand, ah(branches.updateBranchItem));
router.get('/branches/:id/qr', ...brand, ah(qr.branchQr));
router.get('/branches/:id/qr-preview', ...brand, ah(qr.branchQrPreview));

// ---- Branch manager accounts (managed by the brand manager) ----
router.get('/branches/:id/managers', ...brand, ah(managers.listManagers));
router.post('/branches/:id/managers', ...brand, ah(managers.createManager));
router.patch('/managers/:managerId', ...brand, ah(managers.updateManager));
router.delete('/managers/:managerId', ...brand, ah(managers.deleteManager));

// ---- Master menu ----
router.get('/categories', ...brand, ah(menu.listCategories));
router.post('/categories', ...brand, ah(menu.createCategory));
router.patch('/categories/reorder', ...brand, ah(menu.reorderCategories));
router.patch('/categories/:id', ...brand, ah(menu.updateCategory));
router.delete('/categories/:id', ...brand, ah(menu.deleteCategory));

router.get('/items', ...brand, ah(menu.listItems));
router.get('/items/import-template', ...brand, ah(menu.importTemplate));
router.post('/items/import', ...brand, uploadSpreadsheet.single('file'), ah(menu.importItems));
router.post('/items', ...brand, upload.single('image'), ah(menu.createItem));
router.patch('/items/:id', ...brand, upload.single('image'), ah(menu.updateItem));
router.delete('/items/:id', ...brand, ah(menu.deleteItem));

// ---- Branch manager: their own branch only (branch comes from the account, never the request) ----
router.get('/my-branch', ...branchManager, ah(myBranch.myBranch));
router.get('/my-branch/items', ...branchManager, ah(myBranch.myBranchItems));
router.patch('/my-branch/items/:itemId', ...branchManager, ah(myBranch.updateMyBranchItem));

// ---- Public (no auth) ----
router.get('/public/menu/:slug', publicLimiter, ah(pub.publicMenu));

export default router;
