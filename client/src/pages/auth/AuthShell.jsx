import { Link } from 'react-router-dom';
import { QrCode, Smartphone, Globe2 } from 'lucide-react';
import { LogoMark } from '../../components/ui.jsx';

// Split-screen auth layout: brand story panel + form panel
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-orange-700 lg:block">
        <div className="pattern-arabesque absolute inset-0 opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white/95 p-1"><LogoMark size={30} /></div>
            <span className="text-lg font-extrabold text-white">Simat</span>
          </Link>

          <div>
            <h2 className="max-w-md text-4xl font-extrabold leading-tight text-white">
              One QR code.
              <br />
              Printed once.
              <br />
              Works forever.
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-orange-100">
              Build your restaurant's digital menu, update it anytime, and your printed QR codes never change.
            </p>
            <div className="mt-8 space-y-3.5">
              {[
                { icon: QrCode, text: 'Permanent QR code per branch' },
                { icon: Globe2, text: 'Arabic + English, beautifully' },
                { icon: Smartphone, text: 'Premium mobile menu experience' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm font-medium text-white/90">
                  <div className="rounded-lg bg-white/15 p-2"><Icon size={16} /></div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-orange-200/70">© {new Date().getFullYear()} Simat — Digital menus for the GCC</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <LogoMark size={30} />
            <span className="text-lg font-extrabold text-gray-900">Simat</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}
