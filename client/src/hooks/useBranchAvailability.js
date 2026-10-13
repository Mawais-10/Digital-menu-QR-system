import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../api/client.js';

/*
 * State for a branch's item availability, shared by the brand manager's branch page and the
 * branch manager's screen.
 *  - optimistic: the switch moves immediately, and rolls back if the server refuses
 *  - reconciles: the server's answer (full current state) replaces the guess, which also
 *    picks up changes someone else made to the other switch in the meantime
 *  - ordered: if two clicks on the same item race, only the newest response is applied
 *  - fresh: reloads quietly when the tab becomes visible again, so another manager's changes appear
 *
 * load():                () => Promise<rows>
 * save(itemId, patch):   Promise<partial row state from the server>
 */
export function useBranchAvailability({ load, save, toast }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [pending, setPending] = useState(() => new Set());
  const seq = useRef(new Map()); // itemId -> latest request number
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const refresh = useCallback(
    async ({ quiet } = {}) => {
      if (!quiet) setStatus('loading');
      try {
        const next = await load();
        // Never overwrite an item that is mid-save with an older snapshot
        setRows((prev) => {
          if (!quiet || !pendingRef.current.size) return next;
          const saving = new Map(prev.filter((r) => pendingRef.current.has(r.item._id)).map((r) => [r.item._id, r]));
          return next.map((r) => saving.get(r.item._id) || r);
        });
        setStatus('ready');
        setError('');
      } catch (err) {
        if (!quiet) {
          setError(errMsg(err, 'Could not load the menu'));
          setStatus('error');
        }
      }
    },
    [load]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh({ quiet: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const patchRow = (itemId, patch) =>
    setRows((prev) => prev.map((r) => (r.item._id === itemId ? { ...r, ...patch } : r)));

  const update = useCallback(
    async (row, patch) => {
      const id = row.item._id;
      const n = (seq.current.get(id) || 0) + 1;
      seq.current.set(id, n);
      const before = { isAvailable: row.isAvailable, isSoldOut: row.isSoldOut };

      patchRow(id, patch);
      setPending((p) => new Set(p).add(id));
      try {
        const result = await save(id, patch);
        if (seq.current.get(id) === n) patchRow(id, result);
      } catch (err) {
        if (seq.current.get(id) === n) patchRow(id, before);
        toast?.error(errMsg(err, 'Could not save. Nothing was changed.'));
      } finally {
        if (seq.current.get(id) === n) {
          setPending((p) => {
            const next = new Set(p);
            next.delete(id);
            return next;
          });
        }
      }
    },
    [save, toast]
  );

  return { rows, setRows, status, error, pending, refresh, update, patchRow };
}
