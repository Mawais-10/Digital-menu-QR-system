import Branch from '../models/Branch.js';

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Build a unique, permanent slug like "shawarmac-alkhuwair" (suffixing -2, -3... on collision)
export async function uniqueBranchSlug(restaurantName, branchName) {
  const base = slugify(`${restaurantName} ${branchName}`) || `menu-${Date.now()}`;
  let slug = base;
  let n = 1;
  while (await Branch.exists({ slug })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}
