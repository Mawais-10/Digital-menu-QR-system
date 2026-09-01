import { useState } from 'react';
import { LocateFixed, Loader2, Trash2, ExternalLink, Link2, MapPin } from 'lucide-react';

// Branch location picker: capture live GPS position or paste a Google Maps link.
// value = { lat, lng, mapUrl }  — onChange receives the updated object.
export default function LocationField({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const hasCoords = value.lat != null && value.lng != null;
  const hasLink = !!(value.mapUrl && value.mapUrl.trim());
  const previewUrl = hasLink
    ? value.mapUrl
    : hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`
      : '';
  const embedUrl = hasCoords ? `https://maps.google.com/maps?q=${value.lat},${value.lng}&z=16&output=embed` : '';

  const useCurrentLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Location is not supported by this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...value,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          mapUrl: '',
        });
        setLocating(false);
        setShowLinkInput(false);
      },
      (err) => {
        setGeoError(
          err.code === 1
            ? 'Location permission denied — allow location access in your browser and try again'
            : 'Could not get your location, try again'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const clear = () => onChange({ ...value, lat: null, lng: null, mapUrl: '' });

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700">Branch location</span>
      <span className="mb-2 block text-xs text-gray-400">Customers tap "Directions" on your menu to navigate here</span>

      {/* ---- Location set: live map preview ---- */}
      {hasCoords || hasLink ? (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
          {hasCoords && (
            <iframe
              src={embedUrl}
              title="Branch location preview"
              loading="lazy"
              className="pointer-events-none h-36 w-full border-0"
            />
          )}
          <div className={`flex items-center justify-between px-3.5 py-2.5 ${hasCoords ? 'border-t border-gray-100' : ''}`}>
            <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              {hasCoords ? 'Location set' : 'Maps link added'}
            </span>
            <div className="flex items-center gap-0.5">
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
              >
                <ExternalLink size={12} /> Open in Maps
              </a>
              <button
                type="button"
                onClick={clear}
                className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Remove location"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ---- No location yet: pick one ---- */
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="flex w-full items-center gap-3 rounded-lg bg-white px-3.5 py-3 text-start shadow-sm ring-1 ring-gray-200 transition-all hover:ring-brand-300 active:scale-[0.99] disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
              {locating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-800">
                {locating ? 'Getting your location…' : 'Use my current location'}
              </span>
              <span className="block text-xs text-gray-400">
                {locating ? 'Allow location access if asked' : 'One tap — works when you are at the branch'}
              </span>
            </span>
          </button>

          {!showLinkInput ? (
            <button
              type="button"
              onClick={() => setShowLinkInput(true)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
            >
              <Link2 size={13} /> Paste a Google Maps link instead
            </button>
          ) : (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-brand-500">
              <MapPin size={14} className="shrink-0 text-gray-300" />
              <input
                autoFocus
                placeholder="https://maps.app.goo.gl/…"
                value={value.mapUrl || ''}
                onChange={(e) => onChange({ ...value, mapUrl: e.target.value })}
                className="w-full border-0 bg-transparent py-1.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {geoError && <p className="mt-1.5 text-xs font-medium text-red-500">{geoError}</p>}
    </div>
  );
}
