import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, QrCode, Copy, ExternalLink } from 'lucide-react';
import { Card, Button, IconButton, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui.jsx';
import { branchApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function QRManager() {
  const toast = useToast();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await branchApi.list();
      // Show the cards straight away; each QR preview fills in as it arrives
      setEntries(data.branches.map((b) => ({ branch: b, qr: undefined })));
      data.branches.forEach(async (b) => {
        let qr = null;
        try {
          qr = (await branchApi.qrPreview(b._id)).data;
        } catch {
          qr = null;
        }
        setEntries((prev) => prev?.map((e) => (e.branch._id === b._id ? { ...e, qr } : e)));
      });
    } catch (err) {
      setError(errMsg(err, 'Could not load branches'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState title="QR codes could not be loaded" message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="QR Codes" subtitle="Print-ready codes for every branch. Each one carries your logo and never needs reprinting." />

      {!entries ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No branches yet"
          subtitle="Create a branch first. Its QR code is generated automatically."
          action={<Link to="/dashboard/branches"><Button>Go to Branches</Button></Link>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(({ branch, qr }) => (
            <li key={branch._id}>
              <Card className="flex h-full flex-col items-center p-5 text-center">
                <div className="rounded-xl border border-gray-200 bg-white p-2.5">
                  {qr === undefined ? (
                    <Skeleton className="h-40 w-40" />
                  ) : qr ? (
                    <img src={qr.dataUrl} alt={`QR code for ${branch.nameEn}`} className="h-40 w-40" />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center text-gray-300" aria-label="QR preview unavailable">
                      <QrCode size={40} aria-hidden="true" />
                    </div>
                  )}
                </div>
                <h2 className="mt-4 text-[15px] font-semibold text-gray-900">{branch.nameEn}</h2>
                <div className="mt-0.5 flex max-w-full items-center gap-0.5">
                  <span className="truncate font-mono text-xs text-gray-500">/menu/{branch.slug}</span>
                  <IconButton
                    size="sm"
                    label={`Copy ${branch.nameEn} menu link`}
                    onClick={() => {
                      navigator.clipboard.writeText(branch.menuUrl);
                      toast.success('Link copied');
                    }}
                  >
                    <Copy size={14} />
                  </IconButton>
                  <a
                    href={`/menu/${branch.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${branch.nameEn} live menu`}
                    title="Open live menu"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
                <div className="mt-auto flex w-full gap-2 pt-4">
                  <Button size="sm" className="flex-1" onClick={() => branchApi.downloadQr(branch._id, 'png', 2048, branch.slug)}>
                    <Download size={14} aria-hidden="true" /> PNG
                  </Button>
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => branchApi.downloadQr(branch._id, 'svg', 2048, branch.slug)}>
                    <Download size={14} aria-hidden="true" /> SVG
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
