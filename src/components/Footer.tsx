import { Mail, MapPin, Phone } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import type { PageRoute } from './Navbar';
import type { SchoolSettings } from '../lib/types';

interface FooterProps {
  settings?: SchoolSettings | null;
  onNavigate: (page: PageRoute) => void;
}

export function Footer({ settings, onNavigate }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-blue-950 text-slate-200 border-t border-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* School Brand & Address */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SchoolLogo logoDataUrl={settings?.logoDataUrl} className="h-11 w-11" />
            <div>
              <p className="font-display font-bold text-white text-base">
                {settings?.schoolName || 'Bamaina Bright Academy'}
              </p>
              <p className="text-xs text-amber-300">
                {settings?.tagline || 'Building Bright Minds, Inspiring Great Futures.'}
              </p>
            </div>
          </div>
          <p className="text-sm text-blue-100/80 leading-relaxed flex items-start gap-2">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              {settings?.address ||
                'Bamaina Town, Birnin Kudu Local Government Area, Jigawa State, Nigeria.'}
            </span>
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-display font-semibold text-white text-sm mb-4">Quick Links</h3>
          <ul className="space-y-2.5 text-sm text-blue-100/80">
            <li>
              <button type="button" onClick={() => onNavigate('about')} className="hover:text-amber-300 transition-colors">
                About Bamaina Bright Academy
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('academics')} className="hover:text-amber-300 transition-colors">
                Nursery & Primary Academics
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('news')} className="hover:text-amber-300 transition-colors">
                News & Announcements
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('gallery')} className="hover:text-amber-300 transition-colors">
                School Photo Gallery
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('login')} className="hover:text-amber-300 transition-colors">
                Student & Parent Portal
              </button>
            </li>
          </ul>
        </div>

        {/* Admission Information */}
        <div>
          <h3 className="font-display font-semibold text-white text-sm mb-4">
            Admissions & Enrolment
          </h3>
          <p className="text-sm text-blue-100/80 leading-relaxed mb-4">
            Applications are open for Nursery One to Three and Primary One to Six. Submit forms online and track your application status using your reference number.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('admissions')}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-amber-400 text-slate-950 rounded-lg hover:bg-amber-300 transition-colors"
          >
            Start Online Application
          </button>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="font-display font-semibold text-white text-sm mb-4">
            Contact Administration
          </h3>
          <ul className="space-y-2.5 text-sm text-blue-100/80">
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings?.phone || 'Phone number editable in Admin Settings'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings?.email || 'Email address editable in Admin Settings'}</span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-blue-900 flex items-center gap-4 text-xs text-blue-200/80">
            <button type="button" onClick={() => onNavigate('contact')} className="hover:text-amber-300">
              Send Enquiry
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => onNavigate('contact')} className="hover:text-amber-300">
              Campus Location
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-blue-900/80 bg-blue-950/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-blue-200/75">
          <p>
            © {year} {settings?.schoolName || 'Bamaina Bright Academy'}. All rights reserved.
          </p>
          <p>Bamaina Town · Birnin Kudu LGA · Jigawa State, Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
