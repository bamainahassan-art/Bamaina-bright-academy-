import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppUser } from '../lib/types';

interface LoginPageProps {
  onSuccess: (user: AppUser) => void;
}

const DEMO_ROLES = [
  { uid: 'demo_super_admin', label: 'Super Administrator', desc: 'Full school & CMS control' },
  { uid: 'demo_headteacher', label: 'Headteacher', desc: 'Admissions, academics & approvals' },
  { uid: 'demo_accountant', label: 'Accountant / Bursar', desc: 'Fees, invoices & transfer verification' },
  { uid: 'demo_teacher', label: 'Class Teacher', desc: 'Primary 4 scores & assignments' },
  { uid: 'demo_parent', label: 'Parent Account', desc: '2 linked children, fees & results' },
  { uid: 'demo_student', label: 'Student Account', desc: 'Personal profile, assignments & results' },
];

export function LoginPage({ onSuccess }: LoginPageProps) {
  const { signInWithGoogle, loginWithCredentials, loginDemoRole, claimInitialAdmin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasRealAdmin, setHasRealAdmin] = useState<boolean>(true);
  const [showClaimAdmin, setShowClaimAdmin] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');

  useEffect(() => {
    fetch('/api/auth/bootstrap-status')
      .then((r) => r.json())
      .then((d) => {
        setHasRealAdmin(Boolean(d.hasRealAdmin));
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await loginWithCredentials(identifier, password);
      onSuccess(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const u = await signInWithGoogle();
      if (u) onSuccess(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (uid: string) => {
    setError(null);
    setLoading(true);
    try {
      const u = await loginDemoRole(uid);
      onSuccess(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start demo session.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await claimInitialAdmin(claimName, claimEmail, claimPassword);
      onSuccess(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Official School Portal Login */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold text-blue-800 mb-1">
              Secure Portal Access
            </p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-blue-950">
              Bamaina Bright Academy Login
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Sign in as a Parent, Student, Teacher, Accountant, Headteacher, or Administrator.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address, Staff ID, or Admission Number
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. parent@example.com or BBA/2026/..."
                className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] px-5 py-3 text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-500">Or continue with Google</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full min-h-[44px] px-4 py-2.5 text-sm font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-blue-800" />
            <span>Sign in with Google Account</span>
          </button>

          {/* First-Run Super Admin Claim (only shown before first live admin is created) */}
          {!hasRealAdmin && (
            <div className="pt-4 border-t border-slate-200">
              {!showClaimAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowClaimAdmin(true)}
                  className="text-xs font-semibold text-blue-800 hover:text-blue-950 inline-flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>First-Time Setup: Register Primary Super Administrator</span>
                </button>
              ) : (
                <form onSubmit={handleClaimAdmin} className="space-y-3 bg-blue-50/60 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-950">
                    Initial Super Administrator Setup
                  </p>
                  <input
                    type="text"
                    required
                    value={claimName}
                    onChange={(e) => setClaimName(e.target.value)}
                    placeholder="Administrator Full Name"
                    className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                  <input
                    type="email"
                    required
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    placeholder="Official Admin Email"
                    className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={claimPassword}
                    onChange={(e) => setClaimPassword(e.target.value)}
                    placeholder="Choose strong password (min 8 chars)"
                    className="w-full min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg"
                    >
                      Claim Admin Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClaimAdmin(false)}
                      className="px-3 py-2 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right: Clearly Labelled Demo Mode Panel */}
        <div className="lg:col-span-6 bg-white border border-amber-300 rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-lg text-blue-950">
                Demo Mode — Sample Role Accounts
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Explore every portal and permission level using clearly labelled sample demonstration accounts. Sample records are strictly separated from genuine school data and can be cleared from System Settings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_ROLES.map((item) => (
              <button
                key={item.uid}
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin(item.uid)}
                className="text-left border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg p-3.5 transition-colors min-h-[68px]"
              >
                <p className="font-display font-semibold text-sm text-blue-950">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
            Note: Sample demonstration students and fees are prefixed with <span className="font-mono">[DEMO]</span> so they are never mistaken for genuine school records.
          </p>
        </div>
      </div>
    </div>
  );
}
