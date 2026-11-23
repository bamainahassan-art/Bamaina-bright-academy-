import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import type { AppUser, SchoolSettings } from '../lib/types';

export type PageRoute =
  | 'home'
  | 'about'
  | 'academics'
  | 'admissions'
  | 'news'
  | 'gallery'
  | 'contact'
  | 'login'
  | 'portal'
  | 'admin';

interface NavbarProps {
  activePage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  settings?: SchoolSettings | null;
  user: AppUser | null;
  onLogout: () => void;
}

export function Navbar({
  activePage,
  onNavigate,
  settings,
  user,
  onLogout,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff =
    user && ['super_admin', 'headteacher', 'accountant', 'teacher'].includes(user.role);

  const navItems: Array<{ id: PageRoute; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About Us' },
    { id: 'academics', label: 'Academics' },
    { id: 'admissions', label: 'Admissions' },
    { id: 'news', label: 'News & Events' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'contact', label: 'Contact Us' },
    {
      id: user ? (isStaff ? 'admin' : 'portal') : 'login',
      label: user ? (isStaff ? 'Dashboard' : 'School Portal') : 'Portal / Login',
    },
  ];

  const handleSelect = (page: PageRoute) => {
    setMobileOpen(false);
    onNavigate(page);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line Brand Wordmark + Crest */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 rounded-md"
        >
          <SchoolLogo logoDataUrl={settings?.logoDataUrl} className="h-9 w-9" />
          <span className="font-display font-bold text-base sm:text-lg tracking-tight text-blue-950 whitespace-nowrap">
            {settings?.schoolName || 'Bamaina Bright Academy'}
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden xl:flex items-center gap-5 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-500 text-blue-900 font-semibold'
                    : 'border-transparent hover:text-blue-900 hover:border-blue-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Sign Out
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSelect('admissions')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            Apply for Admission
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="xl:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="xl:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-between ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSelect('admissions')}
              className="w-full min-h-[44px] px-4 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
            >
              Apply for Admission
            </button>
            {user && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
              >
                Sign Out ({user.fullName})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
