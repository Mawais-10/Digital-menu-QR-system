import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRestaurant } from '../middleware/auth.js';
import { asyncHandler as ah } from '../utils/asyncHandler.js';
import { upload } from '../middleware/upload.js';
import * as auth from '../controllers/authController.js';
import * as restaurant from '../controllers/restaurantController.js';
import * as branches from '../controllers/branchController.js';
import * as menu from '../controllers/menuController.js';
import * as qr from '../controllers/qrController.js';
import * as pub from '../controllers/publicController.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });
const publicLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

// ---- Auth ----
router.post('/auth/signup', authLimiter, ah(auth.signup));
router.post('/auth/login', authLimiter, ah(auth.login));
router.post('/auth/refresh', ah(auth.refresh));
router.post('/auth/logout', ah(auth.logout));
router.get('/auth/me', requireAuth, ah(auth.me));
router.patch('/auth/me', requireAuth, ah(auth.updateProfile));
router.patch('/auth/password', requireAuth, ah(auth.changePassword));

// ---- Restaurant ----
router.post('/restaurant', requireAuth, ah(restaurant.createRestaurant));
router.get('/restaurant', requireAuth, requireRestaurant, ah(restaurant.getRestaurant));
router.patch('/restaurant', requireAuth, requireRestaurant, ah(restaurant.updateRestaurant));
router.post('/restaurant/logo', requireAuth, requireRestaurant, upload.single('image'), ah(restaurant.uploadLogo));
router.get('/stats', requireAuth, requireRestaurant, ah(restaurant.stats));

// ---- Branches ----
router.get('/branches', requireAuth, requireRestaurant, ah(branches.listBranches));
router.post('/branches', requireAuth, requireRestaurant, ah(branches.createBranch));
router.get('/branches/:id', requireAuth, requireRestaurant, ah(branches.getBranch));
router.patch('/branches/:id', requireAuth, requireRestaurant, ah(branches.updateBranch));
router.delete('/branches/:id', requireAuth, requireRestaurant, ah(branches.deleteBranch));
router.get('/branches/:id/items', requireAuth, requireRestaurant, ah(branches.listBranchItems));
router.patch('/branches/:id/items/:itemId', requireAuth, requireRestaurant, ah(branches.updateBranchItem));
router.get('/branches/:id/qr', requireAuth, requireRestaurant, ah(qr.branchQr));
router.get('/branches/:id/qr-preview', requireAuth, requireRestaurant, ah(qr.branchQrPreview));

// ---- Master menu ----
router.get('/categories', requireAuth, requireRestaurant, ah(menu.listCategories));
router.post('/categories', requireAuth, requireRestaurant, ah(menu.createCategory));
router.patch('/categories/reorder', requireAuth, requireRestaurant, ah(menu.reorderCategories));
router.patch('/categories/:id', requireAuth, requireRestaurant, ah(menu.updateCategory));
router.delete('/categories/:id', requireAuth, requireRestaurant, ah(menu.deleteCategory));

router.get('/items', requireAuth, requireRestaurant, ah(menu.listItems));
router.post('/items', requireAuth, requireRestaurant, upload.single('image'), ah(menu.createItem));
router.patch('/items/:id', requireAuth, requireRestaurant, upload.single('image'), ah(menu.updateItem));
router.delete('/items/:id', requireAuth, requireRestaurant, ah(menu.deleteItem));

// ---- Public (no auth) ----
router.get('/public/menu/:slug', publicLimiter, ah(pub.publicMenu));

export default router;
