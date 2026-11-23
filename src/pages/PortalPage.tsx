import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CreditCard,
  Download,
  FileCheck2,
  GraduationCap,
  LogOut,
  Mail,
  Printer,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadFeeReceiptPdf, downloadReportCardPdf } from '../lib/pdfGenerator';
import type {
  InvoiceRecord,
  NewsItem,
  PaymentRecord,
  ResultSheetData,
  SchoolSettings,
  SessionItem,
  StudentRecord,
  TermItem,
} from '../lib/types';
import type { PageRoute } from '../components/Navbar';

interface PortalOverviewResponse {
  students: StudentRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  assignments: Array<{
    id: number;
    classId: number;
    className: string | null;
    subjectName: string | null;
    title: string;
    type: string;
    description: string;
    dueDate: string | null;
    isDemo: boolean;
    createdAt: string;
  }>;
  announcements: NewsItem[];
  sessions: SessionItem[];
  terms: TermItem[];
  settings: SchoolSettings | null;
}

interface PortalPageProps {
  onNavigate: (page: PageRoute) => void;
}

export function PortalPage({ onNavigate }: PortalPageProps) {
  const { user, apiFetch, logout } = useAuth();
  const [data, setData] = useState<PortalOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [tab, setTab] = useState<'overview' | 'results' | 'fees' | 'assignments'>('overview');

  // Results state
  const [sessionId, setSessionId] = useState<number>(0);
  const [termId, setTermId] = useState<number>(0);
  const [resultSheet, setResultSheet] = useState<ResultSheetData | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Bank transfer form state
  const [transferInvoiceId, setTransferInvoiceId] = useState<number | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferMsg, setTransferMsg] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PortalOverviewResponse>('/api/portal/overview');
      setData(res);
      if (res.students.length > 0) {
        setSelectedStudentId((prev) => prev || res.students[0].id);
      }
      const curSess = res.sessions.find((s) => s.isCurrent) || res.sessions[0];
      if (curSess) {
        setSessionId((prev) => prev || curSess.id);
        const curTerm =
          res.terms.find((t) => t.isCurrent && t.sessionId === curSess.id) ||
          res.terms.find((t) => t.sessionId === curSess.id);
        if (curTerm) setTermId((prev) => prev || curTerm.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load portal.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const activeStudent =
    data?.students.find((s) => s.id === selectedStudentId) || data?.students[0] || null;

  const fetchResults = useCallback(async () => {
    if (!activeStudent || !sessionId || !termId) return;
    setLoadingResults(true);
    setResultsError(null);
    try {
      const sheet = await apiFetch<ResultSheetData>(
        `/api/portal/results?studentId=${activeStudent.id}&sessionId=${sessionId}&termId=${termId}`
      );
      setResultSheet(sheet);
    } catch (err) {
      setResultsError(err instanceof Error ? err.message : 'Unable to fetch results.');
    } finally {
      setLoadingResults(false);
    }
  }, [apiFetch, activeStudent, sessionId, termId]);

  useEffect(() => {
    if (tab === 'results' && activeStudent && sessionId && termId) {
      fetchResults();
    }
  }, [tab, activeStudent, sessionId, termId, fetchResults]);

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferInvoiceId) return;
    setTransferMsg(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/portal/payments/submit-transfer', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: transferInvoiceId,
          amount: Number(transferAmount),
          reference: transferRef,
          notes: transferNotes,
        }),
      });
      setTransferMsg(res.message);
      setTransferInvoiceId(null);
      setTransferAmount('');
      setTransferRef('');
      setTransferNotes('');
      await loadOverview();
    } catch (err) {
      setTransferMsg(err instanceof Error ? err.message : 'Failed to submit transfer.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {error || 'Portal unavailable.'}
        </div>
      </div>
    );
  }

  const studentInvoices = activeStudent
    ? data.invoices.filter((i) => i.studentId === activeStudent.id)
    : [];
  const studentPayments = activeStudent
    ? data.payments.filter((p) => p.studentId === activeStudent.id)
    : [];
  const studentAssignments = activeStudent
    ? data.assignments.filter((a) => a.classId === activeStudent.classId)
    : [];

  return (
    <div className="bg-slate-50 min-h-screen pb-14">
      {/* Portal Top Welcome Header */}
      <div className="bg-blue-950 text-white border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-300">
              {user?.role === 'parent' ? 'Parent Portal' : 'Student Portal'}
              {user?.isDemo ? ' · Sample Demo Mode' : ''}
            </p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mt-0.5">
              Welcome, {user?.fullName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact School</span>
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                onNavigate('home');
              }}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {user?.isDemo && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-amber-950">
            <strong>Demo Mode Notice:</strong> You are viewing clearly labelled sample demonstration pupil records, invoices, and report cards.
          </div>
        )}

        {/* Multi-child selector for Parents */}
        {data.students.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
            <GraduationCap className="w-8 h-8 text-blue-800 mx-auto" />
            <h2 className="font-display font-bold text-lg text-blue-950">
              No Linked Student Profiles Found
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Contact Bamaina Bright Academy administration to link your child’s admission number to your portal account, or submit a new admission application.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('admissions')}
              className="px-5 py-2.5 text-sm font-semibold bg-amber-400 text-slate-950 rounded-lg"
            >
              Apply for Admission
            </button>
          </div>
        ) : (
          <>
            {data.students.length > 1 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2.5">
                  Select Child Profile ({data.students.length} linked children)
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {data.students.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedStudentId(child.id)}
                      className={`px-4 py-2.5 rounded-lg border text-left transition-colors min-h-[44px] ${
                        activeStudent?.id === child.id
                          ? 'bg-blue-900 border-blue-900 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-blue-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">{child.fullName}</p>
                      <p
                        className={`text-xs ${
                          activeStudent?.id === child.id ? 'text-blue-200' : 'text-slate-500'
                        }`}
                      >
                        {child.className || 'Unassigned'} · {child.admissionNumber}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Portal Section Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-fit">
              {[
                { id: 'overview', label: 'Profile & Notices', icon: User },
                { id: 'results', label: 'Examination Results', icon: FileCheck2 },
                { id: 'fees', label: 'Fees & Receipts', icon: CreditCard },
                { id: 'assignments', label: 'Assignments & Materials', icon: BookOpen },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id as typeof tab)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap ${
                      tab === t.id
                        ? 'bg-blue-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Overview & Announcements */}
            {tab === 'overview' && activeStudent && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <p className="font-mono text-xs text-blue-800 font-semibold">
                        {activeStudent.admissionNumber}
                      </p>
                      <h2 className="font-display font-bold text-xl text-blue-950 mt-0.5">
                        {activeStudent.fullName}
                      </h2>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                      {activeStudent.status}
                    </span>
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Current Class</dt>
                      <dd className="font-semibold text-slate-900">
                        {activeStudent.className || 'Pending placement'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Section</dt>
                      <dd className="font-medium text-slate-900">
                        {activeStudent.classSection || '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Gender</dt>
                      <dd className="font-medium text-slate-900">{activeStudent.gender}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Date of Birth</dt>
                      <dd className="font-medium text-slate-900 tabular-nums">
                        {activeStudent.dateOfBirth}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Guardian</dt>
                      <dd className="font-medium text-slate-900 text-right">
                        {activeStudent.guardianName}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h2 className="font-display font-bold text-lg text-blue-950 border-b border-slate-200 pb-3">
                    School Announcements & Notices
                  </h2>
                  <div className="divide-y divide-slate-200">
                    {data.announcements.map((a) => (
                      <div key={a.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-blue-800">{a.category}</span>
                          {a.eventDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{a.eventDate}</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-blue-950">{a.title}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">{a.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Results Checking System */}
            {tab === 'results' && activeStudent && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="font-display font-bold text-xl text-blue-950">
                      Online Examination Results
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      {activeStudent.fullName} · {activeStudent.className} ·{' '}
                      <span className="font-mono">{activeStudent.admissionNumber}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={sessionId}
                      onChange={(e) => setSessionId(Number(e.target.value))}
                      className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      {data.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          Session: {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={termId}
                      onChange={(e) => setTermId(Number(e.target.value))}
                      className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      {data.terms
                        .filter((t) => t.sessionId === sessionId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                    {resultSheet && resultSheet.results.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => downloadReportCardPdf(resultSheet)}
                          className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download PDF Report Card</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="min-h-[42px] px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {loadingResults ? (
                  <div className="h-32 bg-slate-100 rounded-lg animate-pulse" />
                ) : resultsError ? (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                    {resultsError}
                  </div>
                ) : !resultSheet || resultSheet.results.length === 0 ? (
                  <div className="p-8 text-center border border-slate-200 rounded-lg text-sm text-slate-500">
                    No examination scores have been recorded for this session and term yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-500">Subjects Recorded</p>
                        <p className="font-display font-bold text-2xl text-blue-950 tabular-nums mt-1">
                          {resultSheet.summary.subjectCount}
                        </p>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-500">Overall Average</p>
                        <p className="font-display font-bold text-2xl text-blue-950 tabular-nums mt-1">
                          {resultSheet.summary.averageScore}%
                        </p>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-500">Attendance</p>
                        <p className="font-display font-bold text-2xl text-blue-950 tabular-nums mt-1">
                          {resultSheet.meta
                            ? `${resultSheet.meta.daysPresent}/${resultSheet.meta.daysOpened}`
                            : '—'}
                        </p>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-500">Class Position</p>
                        <p className="font-display font-bold text-2xl text-blue-950 tabular-nums mt-1">
                          {resultSheet.summary.position !== null
                            ? `${resultSheet.summary.position} / ${resultSheet.summary.classTotalStudents}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Subject Scores Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-blue-950 text-white text-xs">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Subject</th>
                            <th className="px-4 py-3 font-semibold text-right">CA (40)</th>
                            <th className="px-4 py-3 font-semibold text-right">Exam (60)</th>
                            <th className="px-4 py-3 font-semibold text-right">Total (100)</th>
                            <th className="px-4 py-3 font-semibold text-center">Grade</th>
                            <th className="px-4 py-3 font-semibold">Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 tabular-nums">
                          {resultSheet.results.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {r.subjectName}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-700">{r.caScore}</td>
                              <td className="px-4 py-3 text-right text-slate-700">{r.examScore}</td>
                              <td className="px-4 py-3 text-right font-bold text-blue-950">
                                {r.totalScore}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-blue-800">
                                {r.grade}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{r.remark}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Teacher & Headteacher Remarks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-500 mb-1">
                          Class Teacher’s Remarks
                        </p>
                        <p className="text-slate-800">
                          {resultSheet.meta?.teacherRemark || 'Pending teacher remark.'}
                        </p>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-500 mb-1">
                          Headteacher’s Remarks
                        </p>
                        <p className="text-slate-800">
                          {resultSheet.meta?.headteacherRemark || 'Pending headteacher approval.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: School Fees & Payment History */}
            {tab === 'fees' && activeStudent && (
              <div className="space-y-6">
                {transferMsg && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
                    {transferMsg}
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <h2 className="font-display font-bold text-lg text-blue-950">
                      Student Fee Invoices
                    </h2>
                    <span className="text-xs text-slate-500">
                      {data.settings?.paystackConfigured
                        ? 'Online Paystack & Bank Transfer supported'
                        : 'Bank Transfer (verified by Bursar) or Cash at School Office'}
                    </span>
                  </div>

                  {studentInvoices.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                      No fee invoices issued for this student yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {studentInvoices.map((inv) => {
                        const balance = Math.max(0, inv.amountDue - inv.amountPaid);
                        return (
                          <div
                            key={inv.id}
                            className="border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <p className="font-mono text-xs text-slate-500">
                                {inv.invoiceNumber}
                                {inv.isDemo ? ' · DEMO' : ''}
                              </p>
                              <h3 className="font-semibold text-blue-950">{inv.description}</h3>
                              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                                Total Due: ₦{inv.amountDue.toLocaleString('en-NG')} · Paid: ₦
                                {inv.amountPaid.toLocaleString('en-NG')} ·{' '}
                                <strong>Balance: ₦{balance.toLocaleString('en-NG')}</strong>
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                                  inv.status === 'Paid'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : inv.status === 'Partial'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-red-50 border-red-200 text-red-800'
                                }`}
                              >
                                {inv.status}
                              </span>
                              {balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTransferInvoiceId(inv.id);
                                    setTransferAmount(String(balance));
                                  }}
                                  className="px-3.5 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg min-h-[38px]"
                                >
                                  Submit Bank Transfer
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {transferInvoiceId && (
                    <form
                      onSubmit={handleSubmitTransfer}
                      className="mt-4 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
                    >
                      <h3 className="font-display font-bold text-sm text-blue-950">
                        Submit Bank Transfer Reference (Awaits Accountant Verification)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="number"
                          required
                          min={100}
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="Amount (NGN)"
                          className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                        <input
                          type="text"
                          required
                          value={transferRef}
                          onChange={(e) => setTransferRef(e.target.value)}
                          placeholder="Bank Session / Transaction Ref"
                          className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                        <input
                          type="text"
                          value={transferNotes}
                          onChange={(e) => setTransferNotes(e.target.value)}
                          placeholder="Sender Bank / Depositor Name"
                          className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div className="flex gap-2.5">
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg"
                        >
                          Submit for Verification
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransferInvoiceId(null)}
                          className="px-4 py-2 text-xs font-medium text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Payment History & Receipts */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h2 className="font-display font-bold text-lg text-blue-950 border-b border-slate-200 pb-3">
                    Payment History & Official Receipts
                  </h2>
                  {studentPayments.length === 0 ? (
                    <p className="text-sm text-slate-500">No fee payments recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">Receipt No</th>
                            <th className="px-4 py-2.5 font-semibold">Method</th>
                            <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                            <th className="px-4 py-2.5 font-semibold">Verification</th>
                            <th className="px-4 py-2.5 font-semibold text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 tabular-nums">
                          {studentPayments.map((p) => {
                            const matchedInvoice = studentInvoices.find(
                              (inv) => inv.id === p.invoiceId
                            );
                            return (
                              <tr key={p.id}>
                                <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-950">
                                  {p.receiptNumber}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{p.paymentMethod}</td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                  ₦{p.amount.toLocaleString('en-NG')}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`text-xs font-semibold ${
                                      p.verificationStatus === 'Verified'
                                        ? 'text-emerald-700'
                                        : p.verificationStatus === 'Rejected'
                                          ? 'text-red-700'
                                          : 'text-amber-700'
                                    }`}
                                  >
                                    {p.verificationStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadFeeReceiptPdf(
                                        p,
                                        matchedInvoice,
                                        activeStudent.fullName,
                                        activeStudent.admissionNumber,
                                        data.settings
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-950"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Assignments & Learning Materials */}
            {tab === 'assignments' && activeStudent && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display font-bold text-lg text-blue-950 border-b border-slate-200 pb-3">
                  Class Assignments & Learning Resources ({activeStudent.className})
                </h2>
                {studentAssignments.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">
                    No homework or learning materials posted for this class yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentAssignments.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-xl p-5 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-blue-800">
                            {item.type} · {item.subjectName || 'General'}
                          </span>
                          {item.dueDate && <span>Due: {item.dueDate}</span>}
                        </div>
                        <h3 className="font-display font-bold text-base text-blue-950">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
