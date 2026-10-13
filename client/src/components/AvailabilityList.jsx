import { useMemo, useState } from 'react';
import { Search, PackageX, CircleCheck, EyeOff, Loader2, Ban, ListChecks } from 'lucide-react';
import { Card, Badge, Toggle, SegmentedControl, ImageFrame, Input, Select, EmptyState, cx } from './ui.jsx';

/*
 * Branch menu availability, shared by the brand manager (branch page) and the branch manager.
 *
 * Two independent controls per item:
 *   "On menu"      — the existing branch-level activation (off = hidden from this branch's QR menu)
 *   Available/Sold out — temporary stock state (sold out = shown on the QR menu but cannot be ordered)
 * Sold out never changes "On menu", and is disabled while the item is off the menu.
 *
 * rows: [{ item: { _id, nameEn, nameAr, imageUrl, isActive, categoryId: {_id,nameEn,nameAr,sortOrder} },
 *          isAvailable, isSoldOut, price? , ... }]
 * onUpdate(row, patch) → Promise (caller does optimistic update + rollback)
 * pending: Set of item ids currently saving
 * renderExtra(row): optional extra column (brand manager's branch price)
 */

export function rowStatus(row) {
  if (row.item.isActive === false) return 'master-off';
  if (!row.isAvailable) return 'hidden';
  if (row.isSoldOut) return 'soldout';
  return 'available';
}

const STATUS_BADGE = {
  available: { color: 'green', label: 'Available' },
  soldout: { color: 'red', label: 'Sold out' },
  hidden: { color: 'gray', label: 'Off menu' },
  'master-off': { color: 'gray', label: 'Off in master menu' },
};

const STOCK_OPTIONS = [
  { value: 'available', label: 'Available', tone: 'success', icon: <CircleCheck size={14} aria-hidden="true" /> },
  { value: 'soldout', label: 'Sold out', tone: 'danger', icon: <Ban size={14} aria-hidden="true" /> },
];

export function AvailabilitySummary({ rows }) {
  const counts = useMemo(() => {
    const c = { available: 0, soldout: 0, hidden: 0 };
    for (const r of rows) {
      const s = rowStatus(r);
      if (s === 'available') c.available++;
      else if (s === 'soldout') c.soldout++;
      else c.hidden++;
    }
    return c;
  }, [rows]);
  const tiles = [
    { label: 'Available', value: counts.available, icon: CircleCheck, tone: 'text-brand-800 bg-brand-100' },
    { label: 'Sold out', value: counts.soldout, icon: PackageX, tone: 'text-red-700 bg-red-50' },
    { label: 'Off menu', value: counts.hidden, icon: EyeOff, tone: 'text-gray-700 bg-gray-100' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="flex items-center gap-3 p-3 sm:p-4">
          <span className={cx('hidden rounded-lg p-2 sm:inline-flex', tone)} aria-hidden="true">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div className="tnum text-xl font-semibold leading-none text-gray-900">{value}</div>
            <div className="mt-1 truncate text-xs font-medium text-gray-500">{label}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function AvailabilityList({ rows, onUpdate, pending, currency = 'OMR', renderExtra, emptyAction }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const decimals = currency === 'OMR' ? 3 : 2;

  const categories = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const c = r.item.categoryId;
      if (c && !map.has(c._id)) map.set(c._id, c);
    }
    return [...map.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [rows]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (category !== 'all' && r.item.categoryId?._id !== category) return false;
      const s = rowStatus(r);
      if (status === 'available' && s !== 'available') return false;
      if (status === 'soldout' && s !== 'soldout') return false;
      if (status === 'hidden' && s !== 'hidden' && s !== 'master-off') return false;
      if (q && !(r.item.nameEn?.toLowerCase().includes(q) || r.item.nameAr?.includes(query.trim()))) return false;
      return true;
    });
    const map = new Map();
    for (const r of filtered) {
      const c = r.item.categoryId;
      const key = c?._id || 'none';
      if (!map.has(key)) map.set(key, { category: c, rows: [] });
      map.get(key).rows.push(r);
    }
    return [...map.values()].sort((a, b) => (a.category?.sortOrder ?? 0) - (b.category?.sortOrder ?? 0));
  }, [rows, query, category, status]);

  if (!rows.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No menu items yet"
        subtitle="Items appear here once the brand manager adds them to the master menu."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="md:w-72">
          <Input
            label="Search items"
            type="search"
            placeholder="Name in English or Arabic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leading={<Search size={16} />}
          />
        </div>
        <div className="md:w-52">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.nameEn}</option>
            ))}
          </Select>
        </div>
        <div className="md:ms-auto">
          <span className="mb-1.5 block text-[13px] font-medium text-gray-700" aria-hidden="true">Show</span>
          <SegmentedControl
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'available', label: 'Available' },
              { value: 'soldout', label: 'Sold out' },
              { value: 'hidden', label: 'Off menu' },
            ]}
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Search} title="No items match" subtitle="Try a different search, category or status." />
      ) : (
        groups.map(({ category: cat, rows: catRows }) => (
          <Card key={cat?._id || 'none'} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 sm:px-5">
              <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900">
                {cat?.nameEn || 'Uncategorized'}
                {cat?.nameAr && <span className="font-arabic ms-2 font-medium text-gray-500">{cat.nameAr}</span>}
              </h3>
              <span className="tnum shrink-0 text-xs font-medium text-gray-500">{catRows.length} items</span>
            </div>

            {/* Column labels (desktop) */}
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7.5rem_13rem] items-center gap-4 border-b border-gray-100 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 lg:grid">
              <span>Item</span>
              <span>Price</span>
              <span>On menu</span>
              <span>Stock</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {catRows.map((row) => {
                const s = rowStatus(row);
                const masterOff = s === 'master-off';
                const busy = pending?.has(row.item._id);
                const badge = STATUS_BADGE[s];
                const price = row.price ?? row.effectivePrice;
                return (
                  <li
                    key={row.item._id}
                    className={cx(
                      'grid grid-cols-1 gap-3 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1fr)_7rem_7.5rem_13rem] lg:items-center lg:gap-4',
                      busy && 'bg-gray-50/60'
                    )}
                  >
                    {/* Item */}
                    <div className="flex min-w-0 items-center gap-3">
                      <ImageFrame
                        src={row.item.imageUrl}
                        alt=""
                        ratio="aspect-square"
                        className={cx('w-12 shrink-0 rounded-lg ring-1 ring-gray-200', (s === 'hidden' || masterOff) && 'opacity-50')}
                        iconSize={16}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-900">{row.item.nameEn}</div>
                        <div className="font-arabic truncate text-left text-[13px] text-gray-500" dir="rtl">{row.item.nameAr}</div>
                        {!renderExtra && price != null && (
                          <div className="tnum text-xs font-medium text-gray-600 lg:hidden">{Number(price).toFixed(decimals)} {currency}</div>
                        )}
                      </div>
                      <Badge color={badge.color} dot className="lg:hidden">{badge.label}</Badge>
                    </div>

                    {/* Price (+ editor for the brand manager) */}
                    <div className={cx('items-center justify-between gap-3 lg:block', renderExtra ? 'flex' : 'hidden')}>
                      <span className="text-xs font-medium text-gray-500 lg:hidden">Branch price</span>
                      {renderExtra ? (
                        renderExtra(row)
                      ) : (
                        <span className="tnum text-sm font-medium text-gray-800">
                          {price != null ? `${Number(price).toFixed(decimals)} ${currency}` : '—'}
                        </span>
                      )}
                    </div>

                    {/* Controls: one row on phones, two grid columns on desktop (lg:contents) */}
                    <div className="flex items-center justify-between gap-3 lg:contents">
                      {/* On menu (activation) */}
                      <label className="flex cursor-pointer items-center gap-2">
                        <Toggle
                          checked={row.isAvailable && !masterOff}
                          disabled={busy || masterOff}
                          busy={busy}
                          tone="success"
                          label={`${row.item.nameEn}: show on this branch's menu`}
                          onChange={(v) => onUpdate(row, { isAvailable: v })}
                        />
                        <span className="whitespace-nowrap text-xs font-medium text-gray-600">
                          <span className="lg:hidden">On menu</span>
                          <span className="hidden lg:inline">{masterOff ? 'Off' : row.isAvailable ? 'On' : 'Off'}</span>
                        </span>
                      </label>

                      {/* Stock (sold out) */}
                      <div className="flex items-center gap-1.5">
                        <SegmentedControl
                          size="sm"
                          label={`${row.item.nameEn}: stock status`}
                          value={row.isSoldOut ? 'soldout' : 'available'}
                          disabled={busy || !row.isAvailable || masterOff}
                          busy={busy}
                          onChange={(v) => onUpdate(row, { isSoldOut: v === 'soldout' })}
                          options={STOCK_OPTIONS}
                        />
                        <span className="flex w-4 justify-center">
                          {busy && <Loader2 size={14} className="animate-spin text-gray-400" aria-label="Saving" />}
                        </span>
                      </div>
                    </div>

                    {(s === 'hidden' || masterOff) && (
                      <p className="text-xs text-gray-500 lg:col-span-4">
                        {masterOff
                          ? 'Switched off in the master menu by the brand manager, so it is hidden at every branch.'
                          : 'Off the menu at this branch. Turn it on to set its stock status.'}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
