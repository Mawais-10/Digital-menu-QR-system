// End-to-end tests for branch managers, branch-level sold-out and permission enforcement.
// Runs the real Express app against an isolated database (<your db>_e2e_test) that is dropped afterwards.
//   npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- Isolated test database -------------------------------------------------------------------
function testMongoUri() {
  if (process.env.TEST_MONGODB_URI) return process.env.TEST_MONGODB_URI;
  const envFile = path.join(here, '..', '.env');
  const raw = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  const base = (/^MONGODB_URI=(.*)$/m.exec(raw)?.[1] || process.env.MONGODB_URI || '').trim();
  if (!base) throw new Error('Set TEST_MONGODB_URI (or MONGODB_URI in server/.env) to run the e2e tests');
  const u = new URL(base);
  const db = u.pathname.replace(/^\//, '') || 'qrmenu';
  u.pathname = `/${db}_e2e_test`;
  return u.toString();
}

process.env.MONGODB_URI = testMongoUri();
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'e2e-refresh-secret';

const mongoose = (await import('mongoose')).default;
const { connectDB } = await import('../src/config/db.js');
const app = (await import('../src/app.js')).default;

let server;
let base;

before(async () => {
  await connectDB();
  const name = mongoose.connection.name;
  assert.ok(name.endsWith('_e2e_test'), `refusing to run against "${name}"`);
  await mongoose.connection.db.dropDatabase();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.name.endsWith('_e2e_test')) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.disconnect();
  await new Promise((resolve) => server?.close(resolve));
});

// ---- Tiny HTTP client ---------------------------------------------------------------------------
async function call(method, url, { token, body, cookie } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data, cookie: setCookie ? setCookie.split(';')[0] : null };
}
const get = (u, o) => call('GET', u, o);
const post = (u, body, o = {}) => call('POST', u, { ...o, body });
const patch = (u, body, o = {}) => call('PATCH', u, { ...o, body });
const del = (u, o) => call('DELETE', u, o);

// Passwords that meet the sign-in rules (10+ chars, upper, lower, number, symbol)
const OWNER_PW = 'Owner#Pass2026';
const MANAGER_PW = 'Manager#2026x';
const NEW_PW = 'NewPass#4567';

async function makeBrand(tag) {
  const signup = await post('/auth/signup', {
    businessName: `${tag} Brand`,
    username: `${tag}owner1`,
    password: OWNER_PW,
  });
  assert.equal(signup.status, 201, JSON.stringify(signup.data));
  const token = signup.data.accessToken;
  const r = await post('/restaurant', { nameEn: `${tag} Cafe`, nameAr: 'مقهى' }, { token });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const b1 = await post('/branches', { nameEn: `${tag} One` }, { token });
  const b2 = await post('/branches', { nameEn: `${tag} Two` }, { token });
  assert.equal(b1.status, 201);
  assert.equal(b2.status, 201);
  const cat = await post('/categories', { nameEn: 'Drinks', nameAr: 'مشروبات' }, { token });
  assert.equal(cat.status, 201);
  // Items go through multipart in the app; JSON works for the same fields
  const mk = async (nameEn, price) => {
    const res = await post('/items', { nameEn, nameAr: nameEn, basePrice: price, categoryId: cat.data.category._id }, { token });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    return res.data.item;
  };
  return {
    token,
    branch1: b1.data.branch,
    branch2: b2.data.branch,
    item1: await mk('Latte', 1.5),
    item2: await mk('Mocha', 1.8),
  };
}

const publicItem = async (slug, itemId) => {
  const res = await get(`/public/menu/${slug}`);
  assert.equal(res.status, 200);
  return res.data.items.find((i) => String(i.id) === String(itemId)) || null;
};

// ---- Shared fixtures ----------------------------------------------------------------------------
let A; // brand under test
let X; // a different brand
let manager; // branch manager of A.branch1
let mToken;
let mCookie;

test('setup: two brands with branches and items', async () => {
  A = await makeBrand('alpha');
  X = await makeBrand('xeno');
});

test('brand manager creates a branch manager for one branch', async () => {
  const bad = await post(`/branches/${A.branch1._id}/managers`, { name: 'Sara', username: 'sara.alpha1', password: 'short' }, { token: A.token });
  assert.equal(bad.status, 400, 'short password is refused');

  const res = await post(
    `/branches/${A.branch1._id}/managers`,
    { name: 'Sara', username: 'Sara.Alpha1', password: MANAGER_PW },
    { token: A.token }
  );
  assert.equal(res.status, 201, JSON.stringify(res.data));
  manager = res.data.manager;
  assert.equal(manager.username, 'sara.alpha1', 'usernames are stored in lowercase');
  assert.equal(String(manager.branchId), String(A.branch1._id));
  assert.equal(manager.isActive, true);

  const dup = await post(`/branches/${A.branch2._id}/managers`, { name: 'Dup', username: 'SARA.alpha1', password: MANAGER_PW }, { token: A.token });
  assert.equal(dup.status, 409, 'usernames are unique, whatever the case');
  const takenByOwner = await post(`/branches/${A.branch2._id}/managers`, { name: 'Dup', username: 'xenoowner1', password: MANAGER_PW }, { token: A.token });
  assert.equal(takenByOwner.status, 409, "a manager cannot reuse another brand owner's username");

  const foreign = await post(`/branches/${X.branch1._id}/managers`, { name: 'Z', username: 'zed.xeno1', password: MANAGER_PW }, { token: A.token });
  assert.equal(foreign.status, 404, "cannot create a manager on another brand's branch");

  const list = await get(`/branches/${A.branch1._id}/managers`, { token: A.token });
  assert.equal(list.status, 200);
  assert.equal(list.data.managers.length, 1);
  const otherList = await get(`/branches/${A.branch1._id}/managers`, { token: X.token });
  assert.equal(otherList.status, 404, "another brand cannot list this brand's managers");
});

test('branch manager signs in and sees only their branch', async () => {
  const login = await post('/auth/login', { username: 'sara.alpha1', password: MANAGER_PW });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.user.role, 'branch_manager');
  assert.equal(login.data.user.mustChangePassword, false, 'a password that meets the rules is kept');
  assert.equal(String(login.data.user.branchId), String(A.branch1._id));
  mToken = login.data.accessToken;
  mCookie = login.cookie;
  assert.ok(mCookie, 'refresh cookie issued');

  const me = await get('/my-branch', { token: mToken });
  assert.equal(me.status, 200);
  assert.equal(String(me.data.branch.id), String(A.branch1._id));
  assert.equal(me.data.restaurant.nameEn, 'alpha Cafe');

  const items = await get('/my-branch/items', { token: mToken });
  assert.equal(items.status, 200);
  assert.equal(items.data.items.length, 2);
  for (const row of items.data.items) {
    assert.equal(row.isAvailable, true);
    assert.equal(row.isSoldOut, false);
    assert.equal(row.item.basePrice, undefined, 'editing fields are not exposed');
  }

  const ownerUsesManagerApi = await get('/my-branch', { token: A.token });
  assert.equal(ownerUsesManagerApi.status, 403, 'owners have no /my-branch');
});

test('sold out applies to this branch only and leaves the master menu untouched', async () => {
  const res = await patch(`/my-branch/items/${A.item1._id}`, { isSoldOut: true }, { token: mToken });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.isSoldOut, true);
  assert.equal(res.data.isAvailable, true);
  assert.ok(res.data.soldOutAt);

  const here1 = await publicItem(A.branch1.slug, A.item1._id);
  assert.ok(here1, 'sold-out item is still listed');
  assert.equal(here1.soldOut, true, 'and flagged sold out');
  const there = await publicItem(A.branch2.slug, A.item1._id);
  assert.equal(there.soldOut, false, 'other branch unaffected');

  const master = await get('/items', { token: A.token });
  const m1 = master.data.items.find((i) => i._id === A.item1._id);
  assert.equal(m1.nameEn, 'Latte');
  assert.equal(m1.basePrice, 1.5);
  assert.equal(m1.isActive, true);

  const back = await patch(`/my-branch/items/${A.item1._id}`, { isSoldOut: false }, { token: mToken });
  assert.equal(back.data.isSoldOut, false);
  assert.equal((await publicItem(A.branch1.slug, A.item1._id)).soldOut, false, 'available again');
});

test('branch manager cannot reach brand-level APIs', async () => {
  const t = { token: mToken };
  const id1 = A.item1._id;
  const forbidden = [
    ['GET', '/items'],
    ['POST', '/items', { nameEn: 'Hack', nameAr: 'Hack', basePrice: 1, categoryId: A.item1.categoryId }],
    ['PATCH', `/items/${id1}`, { basePrice: 0.001 }],
    ['DELETE', `/items/${id1}`],
    ['GET', '/items/import-template'],
    ['GET', '/categories'],
    ['POST', '/categories', { nameEn: 'X', nameAr: 'X' }],
    ['GET', '/restaurant'],
    ['PATCH', '/restaurant', { nameEn: 'Hijacked' }],
    ['POST', '/restaurant', { nameEn: 'New', nameAr: 'New' }],
    ['GET', '/stats'],
    ['GET', '/branches'],
    ['GET', `/branches/${A.branch1._id}`],
    ['GET', `/branches/${A.branch2._id}/items`],
    ['PATCH', `/branches/${A.branch2._id}/items/${id1}`, { isSoldOut: true }],
    ['PATCH', `/branches/${A.branch1._id}/items/${id1}`, { customPrice: 0.1 }],
    ['GET', `/branches/${A.branch1._id}/qr-preview`],
    ['GET', `/branches/${A.branch1._id}/managers`],
    ['POST', `/branches/${A.branch1._id}/managers`, { name: 'N', username: 'n.alpha123', password: MANAGER_PW }],
    ['PATCH', `/managers/${manager.id}`, { isActive: true }],
    ['DELETE', `/managers/${manager.id}`],
    ['PATCH', '/auth/me', { businessName: 'Mine now' }],
  ];
  for (const [method, url, body] of forbidden) {
    const res = await call(method, url, { ...t, body });
    assert.equal(res.status, 403, `${method} ${url} should be 403, got ${res.status} ${JSON.stringify(res.data)}`);
  }
  const master = await get('/items', { token: A.token });
  assert.equal(master.data.items.length, 2, 'nothing was created or deleted');
  assert.equal(master.data.items.find((i) => i._id === id1).basePrice, 1.5, 'price unchanged');
});

test('branch manager cannot change prices or target another branch through the request', async () => {
  const price = await patch(`/my-branch/items/${A.item1._id}`, { customPrice: 0.1 }, { token: mToken });
  assert.equal(price.status, 403);

  const smuggled = await patch(`/my-branch/items/${A.item1._id}`, { isSoldOut: true, branchId: A.branch2._id }, { token: mToken });
  assert.equal(smuggled.status, 403, 'extra fields are refused, not ignored');

  // Query-string branch ids are ignored: the change still lands on the manager's own branch
  const viaQuery = await call('PATCH', `/my-branch/items/${A.item1._id}?branchId=${A.branch2._id}`, { token: mToken, body: { isSoldOut: true } });
  assert.equal(viaQuery.status, 200);
  assert.equal((await publicItem(A.branch1.slug, A.item1._id)).soldOut, true);
  assert.equal((await publicItem(A.branch2.slug, A.item1._id)).soldOut, false, 'branch two untouched');
  await patch(`/my-branch/items/${A.item1._id}`, { isSoldOut: false }, { token: mToken });

  const foreignItem = await patch(`/my-branch/items/${X.item1._id}`, { isSoldOut: true }, { token: mToken });
  assert.equal(foreignItem.status, 404, "another brand's item is not reachable");
  const badValue = await patch(`/my-branch/items/${A.item1._id}`, { isSoldOut: 'yes' }, { token: mToken });
  assert.equal(badValue.status, 400);
});

test('sold out never re-enables an item that is switched off for the branch', async () => {
  const off = await patch(`/branches/${A.branch1._id}/items/${A.item2._id}`, { isAvailable: false }, { token: A.token });
  assert.equal(off.status, 200);
  assert.equal(await publicItem(A.branch1.slug, A.item2._id), null, 'hidden item is not on the menu');

  const soldOut = await patch(`/my-branch/items/${A.item2._id}`, { isSoldOut: true }, { token: mToken });
  assert.equal(soldOut.data.isAvailable, false, 'still switched off');
  const notSoldOut = await patch(`/my-branch/items/${A.item2._id}`, { isSoldOut: false }, { token: mToken });
  assert.equal(notSoldOut.data.isAvailable, false, 'still switched off');
  assert.equal(await publicItem(A.branch1.slug, A.item2._id), null);
  assert.ok(await publicItem(A.branch2.slug, A.item2._id), 'other branch still carries it');

  // The branch manager may use the existing on/off switch for their own branch
  const on = await patch(`/my-branch/items/${A.item2._id}`, { isAvailable: true }, { token: mToken });
  assert.equal(on.data.isAvailable, true);
  assert.ok(await publicItem(A.branch1.slug, A.item2._id));
});

test('simultaneous changes to different switches do not overwrite each other', async () => {
  const [a, b] = await Promise.all([
    patch(`/my-branch/items/${A.item1._id}`, { isSoldOut: true }, { token: mToken }),
    patch(`/branches/${A.branch1._id}/items/${A.item1._id}`, { customPrice: 1.25 }, { token: A.token }),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const rows = await get(`/branches/${A.branch1._id}/items`, { token: A.token });
  const row = rows.data.items.find((r) => r.item._id === A.item1._id);
  assert.equal(row.isSoldOut, true);
  assert.equal(row.customPrice, 1.25);
  assert.equal(row.isAvailable, true);
  const pub = await publicItem(A.branch1.slug, A.item1._id);
  assert.equal(pub.price, 1.25);
  assert.equal(pub.soldOut, true);
});

test('brand manager overview counts sold-out items per branch', async () => {
  const stats = await get('/stats', { token: A.token });
  assert.equal(stats.status, 200);
  assert.equal(stats.data.managers, 1);
  assert.equal(stats.data.soldOut, 1);
  assert.equal(stats.data.soldOutByBranch[A.branch1._id], 1);
});

test('deactivating a manager ends their access immediately', async () => {
  const other = await patch(`/managers/${manager.id}`, { isActive: false }, { token: X.token });
  assert.equal(other.status, 404, 'another brand cannot touch this manager');

  const promote = await patch(`/managers/${manager.id}`, { role: 'owner' }, { token: A.token });
  assert.equal(promote.status, 400, 'role cannot be changed');
  const move = await patch(`/managers/${manager.id}`, { branchId: A.branch2._id }, { token: A.token });
  assert.equal(move.status, 400, 'branch cannot be reassigned');

  const off = await patch(`/managers/${manager.id}`, { isActive: false }, { token: A.token });
  assert.equal(off.status, 200);
  assert.equal(off.data.manager.isActive, false);

  const withOldToken = await get('/my-branch', { token: mToken });
  assert.equal(withOldToken.status, 401);
  assert.equal(withOldToken.data.code, 'ACCOUNT_DISABLED');
  const refresh = await post('/auth/refresh', {}, { cookie: mCookie });
  assert.equal(refresh.status, 401);
  const login = await post('/auth/login', { username: 'sara.alpha1', password: MANAGER_PW });
  assert.equal(login.status, 403);
});

test('reactivating and resetting the password works; old password stops working', async () => {
  const weak = await patch(`/managers/${manager.id}`, { password: 'newpass456' }, { token: A.token });
  assert.equal(weak.status, 400, 'a reset password must meet the rules too');
  const res = await patch(`/managers/${manager.id}`, { isActive: true, password: NEW_PW, name: 'Sara K' }, { token: A.token });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.manager.name, 'Sara K');
  assert.equal((await post('/auth/login', { username: 'sara.alpha1', password: MANAGER_PW })).status, 401);
  const ok = await post('/auth/login', { username: 'sara.alpha1', password: NEW_PW });
  assert.equal(ok.status, 200);
  mToken = ok.data.accessToken;
});

test('brand manager workflows are unchanged', async () => {
  const t = { token: A.token };
  assert.equal((await get('/restaurant', t)).status, 200);
  assert.equal((await patch('/restaurant', { taglineEn: 'Fresh' }, t)).status, 200);
  assert.equal((await get('/branches', t)).status, 200);
  assert.equal((await get(`/branches/${A.branch1._id}/qr-preview`, t)).status, 200);
  const upd = await patch(`/items/${A.item1._id}`, { basePrice: 1.6 }, t);
  assert.equal(upd.status, 200);
  assert.equal(upd.data.item.basePrice, 1.6);
  assert.equal((await patch('/auth/me', { businessName: 'alpha Brand' }, t)).status, 200);
});

test('revoking a manager deletes the account; deleting a branch removes its managers', async () => {
  const gone = await del(`/managers/${manager.id}`, { token: A.token });
  assert.equal(gone.status, 200);
  assert.equal((await post('/auth/login', { username: 'sara.alpha1', password: NEW_PW })).status, 401);
  assert.equal((await get('/my-branch', { token: mToken })).status, 401);

  const m2 = await post(`/branches/${A.branch2._id}/managers`, { name: 'Omar', username: 'omar.alpha2', password: MANAGER_PW }, { token: A.token });
  assert.equal(m2.status, 201);
  const omar = await post('/auth/login', { username: 'omar.alpha2', password: MANAGER_PW });
  assert.equal(omar.status, 200);
  assert.equal((await del(`/branches/${A.branch2._id}`, { token: A.token })).status, 200);
  assert.equal((await post('/auth/login', { username: 'omar.alpha2', password: MANAGER_PW })).status, 401);
  assert.equal((await get('/my-branch', { token: omar.data.accessToken })).status, 401);
});

test('price-list layout for toppings is accepted and reaches the public menu', async () => {
  const t = { token: A.token };
  const made = await post('/categories', { nameEn: 'Toppings', nameAr: 'إضافات', layout: 'pricelist' }, t);
  assert.equal(made.status, 201);
  assert.equal(made.data.category.layout, 'pricelist');
  const item = await post('/items', { nameEn: 'Honey', nameAr: 'عسل', basePrice: 0.315, categoryId: made.data.category._id }, t);
  assert.equal(item.status, 201);

  const drinks = (await get('/categories', t)).data.categories.find((c) => c.nameEn === 'Drinks');
  const switched = await patch(`/categories/${drinks._id}`, { layout: 'pricelist' }, t);
  assert.equal(switched.status, 200);
  assert.equal(switched.data.category.layout, 'pricelist');
  assert.equal((await patch(`/categories/${drinks._id}`, { layout: 'carousel' }, t)).status, 400, 'unknown layouts are refused');
  assert.equal((await patch(`/categories/${drinks._id}`, { layout: 'grid' }, t)).status, 200);

  const menu = await get(`/public/menu/${A.branch1.slug}`);
  assert.equal(menu.status, 200);
  assert.equal(menu.data.categories.find((c) => c.nameEn === 'Toppings').layout, 'pricelist');
  assert.equal(menu.data.categories.find((c) => c.nameEn === 'Drinks').layout, 'grid');
  assert.ok(menu.data.items.some((i) => i.nameEn === 'Honey'));
});

// ---- Username + password rules --------------------------------------------------------------------

test('sign-in is by username only, in any letter case', async () => {
  const upper = await post('/auth/login', { username: 'ALPHAOWNER1', password: OWNER_PW });
  assert.equal(upper.status, 200, JSON.stringify(upper.data));
  assert.equal(upper.data.user.username, 'alphaowner1');
  assert.equal(upper.data.user.email, undefined, 'no email in the account payload');
  assert.equal((await post('/auth/login', { username: 'alphaowner1', password: 'Owner#Pass2025' })).status, 401);
  assert.equal((await post('/auth/login', { email: 'alpha-owner@e2e.test', password: OWNER_PW })).status, 401, 'email sign-in is gone');
  A.token = upper.data.accessToken;
});

test('usernames must follow the rules', async () => {
  const tryName = (username) => post('/auth/signup', { businessName: 'Rules', username, password: OWNER_PW });
  const refused = {
    'short1a': 'too short',
    'abcdefghijklmnopqrstuvwxyz12345': 'too long',
    'nonumbers': 'no number',
    '1startswithdigit': 'starts with a number',
    '_starts.with1': 'starts with a symbol',
    'has space1': 'space',
    'emoji☃name1': 'non-English character',
    'dash-name12': 'dash',
    'double..dot1': 'two symbols in a row',
    'endswith1_': 'ends with a symbol',
    'admin.cafe1': 'reserved',
    'dinezastaff1': 'reserved',
    '': 'empty',
  };
  for (const [name, why] of Object.entries(refused)) {
    const res = await tryName(name);
    assert.equal(res.status, 400, `"${name}" should be refused (${why}), got ${res.status} ${JSON.stringify(res.data)}`);
  }
  assert.equal((await tryName('alphaowner1')).status, 409, 'taken username');
  assert.equal((await tryName('good.name_2026')).status, 201, 'a valid username is accepted');
});

test('passwords must follow the rules', async () => {
  const refused = {
    'Sh0rt!': 'too short',
    'alllowercase1!': 'no capital',
    'ALLUPPERCASE1!': 'no small letter',
    'NoNumbersHere!': 'no number',
    'NoSymbols12345': 'no symbol',
    'Has Space#1234': 'space',
    'Xpwd.owner2026#Aa': 'contains the username',
  };
  for (const [pw, why] of Object.entries(refused)) {
    const res = await post('/auth/signup', { businessName: 'Rules', username: 'pwd.owner2026', password: pw });
    assert.equal(res.status, 400, `"${pw}" should be refused (${why}), got ${res.status}`);
  }
  assert.equal((await post('/auth/signup', { businessName: 'Rules', username: 'pwd.owner2026', password: 'Strong#Pass123' })).status, 201);
});

test('an old weak password works once, then must be replaced', async () => {
  const bcrypt = (await import('bcryptjs')).default;
  const { default: User } = await import('../src/models/User.js');
  await User.create({
    username: 'legacy.owner1',
    businessName: 'Legacy',
    email: 'legacy@e2e.test',
    passwordHash: await bcrypt.hash('oldpass1', 11),
  });
  const first = await post('/auth/login', { username: 'legacy.owner1', password: 'oldpass1' });
  assert.equal(first.status, 200);
  assert.equal(first.data.user.mustChangePassword, true);
  const t = { token: first.data.accessToken };

  const me = await get('/auth/me', t);
  assert.equal(me.data.user.mustChangePassword, true, 'the flag survives a page reload');
  assert.equal((await patch('/auth/password', { currentPassword: 'wrong', newPassword: 'Legacy#Pass2026' }, t)).status, 400);
  assert.equal((await patch('/auth/password', { currentPassword: 'oldpass1', newPassword: 'stillweak1' }, t)).status, 400);
  const changed = await patch('/auth/password', { currentPassword: 'oldpass1', newPassword: 'Legacy#Pass2026' }, t);
  assert.equal(changed.status, 200, JSON.stringify(changed.data));
  assert.equal(changed.data.user.mustChangePassword, false);

  assert.equal((await post('/auth/login', { username: 'legacy.owner1', password: 'oldpass1' })).status, 401);
  const again = await post('/auth/login', { username: 'legacy.owner1', password: 'Legacy#Pass2026' });
  assert.equal(again.status, 200);
  assert.equal(again.data.user.mustChangePassword, false);
});

test('two accounts without an email can coexist', async () => {
  const { default: User } = await import('../src/models/User.js');
  await User.syncIndexes();
  const withoutEmail = await User.countDocuments({ email: { $exists: false } });
  assert.ok(withoutEmail >= 2, `expected several accounts without email, found ${withoutEmail}`);
});
