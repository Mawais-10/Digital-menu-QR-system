import { useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageHeader, Button, ErrorState, PageSkeleton, ExternalLinkButton } from '../../components/ui.jsx';
import AvailabilityList, { AvailabilitySummary } from '../../components/AvailabilityList.jsx';
import { useBranchAvailability } from '../../hooks/useBranchAvailability.js';
import { myBranchApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

// Branch manager: availability for their own branch only (the API decides which branch).
export default function BranchMenu() {
  const { branch, restaurant } = useOutletContext();
  const toast = useToast();
  const currency = restaurant?.currency || 'OMR';

  const load = useCallback(async () => (await myBranchApi.items()).data.items, []);
  const save = useCallback(async (itemId, patch) => (await myBranchApi.updateItem(itemId, patch)).data, []);
  const { rows, status, error, pending, refresh, update } = useBranchAvailability({ load, save, toast });

  return (
    <div>
      <PageHeader
        title="Menu availability"
        subtitle={`Mark items sold out or take them off ${branch.nameEn}'s menu. Changes show on your QR menu right away.`}
        action={
          <>
            <Button variant="secondary" size="sm" onClick={() => refresh()} disabled={status === 'loading'}>
              <RefreshCw size={14} aria-hidden="true" /> Refresh
            </Button>
            <span className="sm:hidden">
              <ExternalLinkButton href={`/menu/${branch.slug}`} size="sm">Live menu</ExternalLinkButton>
            </span>
          </>
        }
      />

      {status === 'error' ? (
        <ErrorState title="The menu could not be loaded" message={error} onRetry={() => refresh()} />
      ) : status === 'loading' && !rows.length ? (
        <PageSkeleton rows={6} header={false} />
      ) : (
        <div className="space-y-5">
          <AvailabilitySummary rows={rows} />
          <AvailabilityList rows={rows} onUpdate={update} pending={pending} currency={currency} />
        </div>
      )}
    </div>
  );
}
