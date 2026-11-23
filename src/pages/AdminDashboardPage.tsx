import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminAdmissionsTab } from '../components/admin/AdminAdmissionsTab';
import { AdminPeopleTab } from '../components/admin/AdminPeopleTab';
import { AdminAcademicsTab } from '../components/admin/AdminAcademicsTab';
import { AdminFinanceTab } from '../components/admin/AdminFinanceTab';
import { AdminCmsTab } from '../components/admin/AdminCmsTab';
import type { NewsItem, PaymentRecord, PublicBootstrap } from '../lib/types';
import type { PageRoute } from '../components/Navbar';

interface DashboardOverview {
  role: string;
  metrics: {
    totalStudents: number;
    realStudents: number;
    totalTeachers: number;
    activeClasses: number;
    pendingAdmissions: number;
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
  };
  recentPayments: PaymentRecord[];
  recentAnnouncements: NewsItem[];
  enquiriesCount: number;
}

type AdminSection =
  | 'overview'
  | 'admissions'
  | 'people'
  | 'academics'
  | 'finance'
  | 'cms';

export function AdminDashboardPage({
  publicData,
  onReloadPublic,
  onNavigate,
}: {
  publicData: PublicBootstrap;
  onReloadPublic: () => void;
  onNavigate: (page: PageRoute) => void;
}) {
  const { user, apiFetch, logout } = useAuth();
  const [section, setSection] = useState<AdminSection>('overview');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DashboardOverview>('/api/admin/dashboard');
      setOverview(data);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (!user) return null;

  const role = user.role;
  const navItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard; roles: string[] }> = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, roles: ['super_admin', 'headteacher', 'accountant', 'teacher'] },
    { id: 'admissions', label: 'Admissions', icon: FileSpreadsheet, roles: ['super_admin', 'headteacher'] },
    { id: 'people', label: 'Students & Staff', icon: Users, roles: ['super_admin', 'headteacher', 'teacher'] },
    { id: 'academics', label: 'Academics & Results', icon: BookOpen, roles: ['super_admin', 'headteacher', 'teacher'] },
    { id: 'finance', label: 'Fees & Finance', icon: CreditCard, roles: ['super_admin', 'accountant', 'headteacher'] },
    { id: 'cms', label: 'Website & Settings', icon: Globe, roles: ['super_admin', 'headteacher'] },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-blue-950 text-white shrink-0 border-b lg:border-b-0 lg:border-r border-blue-900">
        <div className="p-5 border-b border-blue-900">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
            {role.replace('_', ' ')}
            {user.isDemo ? ' · DEMO' : ''}
          </p>
          <p className="font-display font-bold text-base text-white mt-0.5 truncate">
            {user.fullName}
          </p>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors min-h-[42px] ${
                  active
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-blue-100 hover:bg-blue-900/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block p-4 mt-4 border-t border-blue-900">
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('home');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-200 hover:text-white rounded-lg hover:bg-blue-900"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {user.isDemo && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-amber-950">
            <strong>Demo Mode Active:</strong> Sample demonstration records are clearly tagged <span className="font-mono">[DEMO]</span>. Real applications and payments added here are saved directly to PostgreSQL.
          </div>
        )}

        {section === 'overview' && (
          loading || !overview ? (
            <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-bold text-2xl text-blue-950">
                  School Administration Overview
                </h1>
                <p className="text-sm text-slate-600">
                  Live operational summary across students, admissions, academic classes, and fee administration.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Total Students in Registry</p>
                  <p className="font-display font-bold text-2xl text-blue-950 tabular-nums mt-1">
                    {overview.metrics.totalStudents}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Active Teachers</p>
                  <p className="font-display font-bold text-2xl text-blue-950 tabular-nums mt-1">
                    {overview.metrics.totalTeachers}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Active Classes</p>
                  <p className="font-display font-bold text-2xl text-blue-950 tabular-nums mt-1">
                    {overview.metrics.activeClasses}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Pending Admissions</p>
                  <p className="font-display font-bold text-2xl text-amber-700 tabular-nums mt-1">
                    {overview.metrics.pendingAdmissions}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Total Fee Collections</p>
                  <p className="font-display font-bold text-2xl text-emerald-700 tabular-nums mt-1">
                    ₦{overview.metrics.totalCollected.toLocaleString('en-NG')}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500">Outstanding School Fees</p>
                  <p className="font-display font-bold text-2xl text-red-700 tabular-nums mt-1">
                    ₦{overview.metrics.totalOutstanding.toLocaleString('en-NG')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                  <h2 className="font-display font-bold text-base text-blue-950 border-b border-slate-200 pb-2">
                    Recent Fee Payments
                  </h2>
                  {overview.recentPayments.length === 0 ? (
                    <p className="text-sm text-slate-500">No payments recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {overview.recentPayments.slice(0, 6).map((p) => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                          <div>
                            <p className="font-semibold text-slate-900">{p.studentName}</p>
                            <p className="text-xs text-slate-500">
                              {p.receiptNumber} · {p.paymentMethod} · {p.verificationStatus}
                            </p>
                          </div>
                          <span className="font-semibold tabular-nums text-blue-950">
                            ₦{p.amount.toLocaleString('en-NG')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                  <h2 className="font-display font-bold text-base text-blue-950 border-b border-slate-200 pb-2">
                    Recent School Announcements
                  </h2>
                  <div className="divide-y divide-slate-200">
                    {overview.recentAnnouncements.map((a) => (
                      <div key={a.id} className="py-2.5">
                        <p className="text-xs font-semibold text-blue-800">{a.category}</p>
                        <p className="text-sm font-medium text-slate-900">{a.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {section === 'admissions' && (
          <AdminAdmissionsTab settings={publicData.settings} onChanged={loadDashboard} />
        )}

        {section === 'people' && (
          <AdminPeopleTab
            role={role}
            classes={publicData.classes}
            subjects={publicData.subjects}
            onChanged={loadDashboard}
          />
        )}

        {section === 'academics' && (
          <AdminAcademicsTab
            role={role}
            onChanged={() => {
              loadDashboard();
              onReloadPublic();
            }}
          />
        )}

        {section === 'finance' && (
          <AdminFinanceTab
            role={role}
            sessions={publicData.sessions}
            terms={publicData.terms}
            settings={publicData.settings}
            onChanged={loadDashboard}
          />
        )}

        {section === 'cms' && (
          <AdminCmsTab
            role={role}
            publicData={publicData}
            onChanged={() => {
              loadDashboard();
              onReloadPublic();
            }}
          />
        )}
      </main>
    </div>
  );
}
