import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, QrCode, Copy, ExternalLink } from 'lucide-react';
import { Card, Button, Spinner, EmptyState, PageHeader } from '../../components/ui.jsx';
import { branchApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function QRManager() {
  const toast = useToast();
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await branchApi.list();
      const withQr = await Promise.all(
        data.branches.map(async (b) => {
          try {
            const q = await branchApi.qrPreview(b._id);
            return { branch: b, qr: q.data };
          } catch {
            return { branch: b, qr: null };
          }
        })
      );
      setEntries(withQr);
    })();
  }, []);

  if (!entries) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="QR Codes" subtitle="Download print-ready QR codes for every branch" />

      {entries.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No branches yet"
          subtitle="Create a branch first — its QR code is generated automatically."
          action={<Link to="/dashboard/branches"><Button>Go to Branches</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(({ branch, qr }) => (
            <Card key={branch._id} className="flex flex-col items-center p-6 text-center">
              {qr ? (
                <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-gray-100">
                  <img src={qr.dataUrl} alt={`QR for ${branch.nameEn}`} className="h-36 w-36" />
                </div>
              ) : (
                <div className="flex h-36 w-36 items-center justify-center text-gray-300"><QrCode size={40} /></div>
              )}
              <h3 className="mt-4 text-sm font-bold text-gray-900">{branch.nameEn}</h3>
              <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-gray-400">
                /menu/{branch.slug}
                <button
                  onClick={() => { navigator.clipboard.writeText(branch.menuUrl); toast.success('Link copied'); }}
                  className="rounded p-1 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Copy size={11} />
                </button>
                <a href={`/menu/${branch.slug}`} target="_blank" rel="noreferrer" className="rounded p-1 hover:bg-gray-100 hover:text-gray-600">
                  <ExternalLink size={11} />
                </a>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => branchApi.downloadQr(branch._id, 'png', 2048, branch.slug)}>
                  <Download size={13} /> PNG
                </Button>
                <Button size="sm" variant="secondary" onClick={() => branchApi.downloadQr(branch._id, 'svg', 2048, branch.slug)}>
                  <Download size={13} /> SVG
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
