import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, AlertTriangle, RefreshCw, ImageIcon, ArrowLeft, ChevronDown, ArrowUpRight } from 'lucide-react';

/* ==========================================================================
   DINEZA dashboard design system
   - One scale for every screen: 8px radius on controls, 12px on surfaces,
     40px control height (32px small), 14px body text, 13px labels, 12px captions.
   - Brand orange for identity and accents; primary actions use brand-700 so
     white text keeps WCAG AA contrast.
   - Motion is short and purposeful, and follows the OS reduced-motion setting
     (MotionConfig reducedMotion="user" in main.jsx).
   ========================================================================== */

export const EASE = [0.22, 1, 0.36, 1];

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ---------- Buttons ---------- */

const BTN_VARIANTS = {
  primary: 'bg-brand-700 text-white shadow-card hover:bg-brand-800',
  secondary: 'border border-gray-300 bg-white text-gray-800 shadow-card hover:border-gray-400 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
  danger: 'bg-red-600 text-white shadow-card hover:bg-red-700',
  'danger-ghost': 'text-red-700 hover:bg-red-50',
  dark: 'bg-gray-900 text-white shadow-card hover:bg-gray-800',
};
const BTN_SIZES = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-11 gap-2 rounded-lg px-5 text-[15px]',
};

export function Button({ children, variant = 'primary', size = 'md', loading, className = '', disabled, ...props }) {
  return (
    <button
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,transform] duration-150 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        className
      )}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// Square icon-only button. `label` becomes the accessible name and tooltip.
export const IconButton = forwardRef(function IconButton({ label, children, size = 'md', variant = 'ghost', className = '', ...props }, ref) {
  const sizes = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' };
  const variants = {
    ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
    outline: 'border border-gray-300 bg-white text-gray-600 shadow-card hover:bg-gray-50 hover:text-gray-900',
    danger: 'text-gray-500 hover:bg-red-50 hover:text-red-700',
  };
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/* ---------- Form fields ---------- */

const FIELD =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-card transition-[border-color,box-shadow] duration-150 placeholder:text-gray-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';
const FIELD_ERROR = 'border-red-500 focus:border-red-500 focus:ring-red-500/15';

function FieldShell({ id, label, hint, error, required, children }) {
  return (
    <div className="block">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-gray-700">
          {label}
          {required && <span className="ms-0.5 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-gray-500">{hint}</p>
      )}
    </div>
  );
}

function describedBy(id, hint, error) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function Input({ label, hint, error, dir, className = '', id, leading, trailing, ...props }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={props.required}>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-gray-400" aria-hidden="true">
            {leading}
          </span>
        )}
        <input
          id={inputId}
          dir={dir}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={cx(FIELD, 'h-10', leading && 'ps-9', error && FIELD_ERROR, dir === 'rtl' && 'font-arabic', className)}
          {...props}
        />
        {trailing && <span className="absolute inset-y-0 end-1 flex items-center gap-0.5">{trailing}</span>}
      </div>
    </FieldShell>
  );
}

export function Textarea({ label, hint, error, dir, className = '', id, rows = 3, ...props }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={props.required}>
      <textarea
        id={inputId}
        dir={dir}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        className={cx(FIELD, 'resize-y py-2.5 leading-relaxed', error && FIELD_ERROR, dir === 'rtl' && 'font-arabic', className)}
        {...props}
      />
    </FieldShell>
  );
}

export function Select({ label, hint, error, children, className = '', id, ...props }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={props.required}>
      <div className="relative">
        <select
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={cx(FIELD, 'h-10 cursor-pointer appearance-none pe-9', error && FIELD_ERROR, className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      </div>
    </FieldShell>
  );
}

/* ---------- Switches ---------- */

const TOGGLE_TONES = { brand: 'bg-brand-600', success: 'bg-emerald-600', danger: 'bg-red-600', dark: 'bg-gray-900' };

// Accessible on/off switch. Always pass `label` when there is no visible text next to it.
export function Toggle({ checked, onChange, disabled, label, size = 'md', tone = 'brand', busy, className = '', ...props }) {
  const dims = size === 'sm' ? { track: 'h-5 w-9', knob: 'h-4 w-4', travel: 16 } : { track: 'h-6 w-11', knob: 'h-5 w-5', travel: 20 };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        dims.track,
        checked ? TOGGLE_TONES[tone] : 'bg-gray-300',
        className
      )}
      {...props}
    >
      <motion.span
        aria-hidden="true"
        className={cx('block rounded-full bg-white shadow-sm', dims.knob)}
        initial={false}
        animate={{ x: checked ? dims.travel : 0 }}
        transition={{ type: 'spring', stiffness: 700, damping: 40 }}
      />
    </button>
  );
}

/*
 * Segmented control (radio group) with a sliding thumb.
 * Pattern adapted from 21st.dev "Segmented Control" (ddoemonn): radiogroup semantics,
 * roving tabindex, arrow/Home/End keys, reduced motion via MotionConfig.
 * options: [{ value, label, icon?, tone?: 'neutral' | 'success' | 'danger' }]
 */
const SEG_ACTIVE_TEXT = { neutral: 'text-gray-900', success: 'text-emerald-700', danger: 'text-white', brand: 'text-white' };
const SEG_THUMB = {
  neutral: 'bg-white shadow-sm ring-1 ring-gray-900/5',
  success: 'bg-white shadow-sm ring-1 ring-emerald-600/20',
  danger: 'bg-red-600 shadow-sm',
  brand: 'bg-brand-700 shadow-sm',
};

export function SegmentedControl({ options, value, onChange, label, size = 'md', disabled, busy, className = '', fullWidth }) {
  const groupId = useId();
  const refs = useRef([]);
  const enabled = options.map((o) => !o.disabled && !disabled);

  const step = (from, dir) => {
    for (let k = 1; k <= options.length; k++) {
      const i = (from + dir * k + options.length) % options.length;
      if (enabled[i]) return i;
    }
    return from;
  };
  const go = (i) => {
    refs.current[i]?.focus();
    if (options[i].value !== value) onChange(options[i].value);
  };
  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      go(step(i, 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      go(step(i, -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(step(-1, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      go(step(options.length, -1));
    }
  };

  const sizes = size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]';
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-busy={busy || undefined}
      aria-disabled={disabled || undefined}
      className={cx(
        'relative inline-grid rounded-lg bg-gray-100 p-0.5 ring-1 ring-inset ring-gray-200',
        fullWidth && 'w-full',
        disabled && 'opacity-50',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        const tone = o.tone || 'neutral';
        return (
          <button
            key={o.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === selectedIndex ? 0 : -1}
            disabled={!enabled[i]}
            onClick={() => !active && onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              'relative z-0 inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors duration-150 disabled:cursor-not-allowed',
              sizes,
              active ? SEG_ACTIVE_TEXT[tone] : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-thumb-${groupId}`}
                aria-hidden="true"
                className={cx('absolute inset-0 -z-10 rounded-md', SEG_THUMB[tone])}
                transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.5 }}
              />
            )}
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Tabs ---------- */

export const tabIds = (base, id) => ({ tab: `${base}-tab-${id}`, panel: `${base}-panel-${id}` });

// Underline tabs. Render the panel yourself with role="tabpanel" and the ids from tabIds().
export function Tabs({ tabs, value, onChange, label, idBase, className = '' }) {
  const refs = useRef([]);
  const index = Math.max(0, tabs.findIndex((t) => t.id === value));
  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next == null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };
  return (
    <div className={cx('no-scrollbar -mx-1 overflow-x-auto border-b border-gray-200', className)}>
      <div role="tablist" aria-label={label} className="flex min-w-max gap-1 px-1">
        {tabs.map((t, i) => {
          const active = i === index;
          const ids = tabIds(idBase, t.id);
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              ref={(el) => (refs.current[i] = el)}
              id={ids.tab}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={ids.panel}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cx(
                'relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-t-md px-3 text-sm font-semibold transition-colors duration-150',
                active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {Icon && <Icon size={16} aria-hidden="true" className={active ? 'text-brand-700' : ''} />}
              {t.label}
              {t.count != null && (
                <span className={cx('tnum rounded-full px-1.5 py-px text-[11px] font-semibold', active ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600')}>
                  {t.count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId={`tabs-underline-${idBase}`}
                  aria-hidden="true"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Display ---------- */

const BADGE_COLORS = {
  orange: 'bg-brand-50 text-brand-800 ring-brand-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
};
const DOT_COLORS = { orange: 'bg-brand-500', green: 'bg-emerald-500', gray: 'bg-gray-400', red: 'bg-red-500', amber: 'bg-amber-500', blue: 'bg-sky-500' };

export function Badge({ children, color = 'orange', dot, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', BADGE_COLORS[color], className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', DOT_COLORS[color])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={cx('rounded-xl border border-gray-200 bg-white shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4', className)}>
      <div className="min-w-0 flex-1 basis-56">
        <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, to, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  const body = (
    <Card className={cx('h-full p-4 sm:p-5', to && 'transition-[border-color,box-shadow] duration-150 group-hover:border-gray-300 group-hover:shadow-soft')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-gray-600">{label}</span>
        {Icon && (
          <span className={cx('rounded-lg p-1.5', tones[tone])} aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="tnum mt-3 text-2xl font-semibold tracking-tight text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </Card>
  );
  return to ? (
    <Link to={to} className="group block rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ---------- Images ---------- */

/*
 * The one way to show a menu photo in the dashboard.
 *  fit="contain" (default): the whole photo is visible, proportions kept, never cropped or stretched.
 *  fit="cover": fills the frame — only for small thumbnails where cropping is acceptable.
 * The frame owns the size (aspect ratio + width from the parent), so a huge upload can never
 * stretch a card, table row, form or modal. The stored file is never altered.
 */
export function ImageFrame({ src, alt = '', fit = 'contain', ratio = 'aspect-[4/3]', className = '', checker = false, iconSize = 24, eager = false, children }) {
  // Load state is keyed by URL, so a new photo never inherits the old one's state and a
  // cached image that finishes instantly can't be reset back to "loading".
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  const imgRef = useRef(null);
  const loaded = !!src && loadedSrc === src;
  const failed = !!src && failedSrc === src;

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLoadedSrc(src);
  }, [src]);

  return (
    <div className={cx('relative overflow-hidden', ratio, checker ? 'bg-checker' : 'bg-gray-50', className)}>
      {src && !failed ? (
        <>
          {!loaded && <div className="shimmer absolute inset-0" aria-hidden="true" />}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            onLoad={() => setLoadedSrc(src)}
            onError={() => setFailedSrc(src)}
            className={cx(
              'absolute inset-0 h-full w-full transition-opacity duration-300',
              fit === 'cover' ? 'object-cover' : 'object-contain p-[6%]',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-300" aria-hidden={!alt}>
          <ImageIcon size={iconSize} />
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------- Overlays ---------- */

const MODAL_WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog with focus trap, Escape to close, focus restore and an animated entrance/exit.
export function Modal({ open, onClose, title, description, children, wide, size, footer }) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusFirst = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred = panel.querySelector('[data-autofocus]') || panel.querySelector('input:not([type="hidden"]):not([disabled]), textarea, select');
      (preferred || panel).focus();
    }, 40);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusFirst);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open]);

  const width = MODAL_WIDTHS[size || (wide ? 'lg' : 'sm')];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          className="dash-portal fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cx('relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-pop outline-none sm:rounded-2xl', width)}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold text-gray-900">{title}</h2>
                {description && <p id={descId} className="mt-0.5 text-[13px] text-gray-500">{description}</p>}
              </div>
              <IconButton label="Close dialog" onClick={onClose} className="-me-2 -mt-1">
                <X size={18} />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3.5 sm:px-6">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading, tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} data-autofocus>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className={cx('shrink-0 rounded-full p-2', tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700')} aria-hidden="true">
          <AlertTriangle size={18} />
        </div>
        <p className="pt-1 text-sm leading-relaxed text-gray-600">{message}</p>
      </div>
    </Modal>
  );
}

/* ---------- States ---------- */

export function Spinner({ className = '', label = 'Loading' }) {
  return (
    <div className={cx('flex items-center justify-center py-16', className)} role="status" aria-label={label}>
      <Loader2 size={26} className="animate-spin text-brand-600" aria-hidden="true" />
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={cx('animate-pulse rounded-md bg-gray-200/70', className)} aria-hidden="true" />;
}

// Page-level loading placeholder that matches the real layout, so nothing jumps when data arrives
export function PageSkeleton({ rows = 4, header = true }) {
  return (
    <div role="status" aria-label="Loading">
      {header && (
        <div className="mb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action, className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 rounded-xl bg-brand-50 p-3 text-brand-700" aria-hidden="true">
          <Icon size={22} />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm leading-relaxed text-gray-500">{subtitle}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-10 text-center" role="alert">
      <div className="mb-3 rounded-xl bg-white p-2.5 text-red-600 ring-1 ring-red-100" aria-hidden="true">
        <AlertTriangle size={20} />
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-gray-600">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

/* ---------- Page structure ---------- */

export function PageHeader({ title, subtitle, action, back, meta }) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900">
          <ArrowLeft size={14} aria-hidden="true" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
            {meta}
          </div>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function ExternalLinkButton({ href, children, size = 'md', variant = 'secondary' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150',
        BTN_VARIANTS[variant],
        BTN_SIZES[size]
      )}
    >
      {children}
      <ArrowUpRight size={size === 'sm' ? 14 : 15} aria-hidden="true" />
    </a>
  );
}

/* ---------- Brand ---------- */

// DINEZA brand mark (assets live in client/public)
export const LogoMark = ({ size = 40 }) => (
  <img
    src="/dineza-icon.png"
    alt="DINEZA"
    draggable={false}
    className="shrink-0 select-none object-contain"
    style={{ width: size, height: size }}
  />
);

// Full logo with wordmark and tagline
export const LogoFull = ({ className = 'h-24 w-auto' }) => (
  <img src="/dineza-logo.png" alt="DINEZA - Your Menu. One Scan Away." draggable={false} className={`select-none ${className}`} />
);
