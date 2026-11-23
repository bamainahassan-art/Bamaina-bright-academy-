import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadFeeReceiptPdf } from '../../lib/pdfGenerator';
import type {
  InvoiceRecord,
  PaymentRecord,
  SchoolSettings,
  SessionItem,
  StudentRecord,
  TermItem,
  UserRole,
} from '../../lib/types';

interface FeeStructureItem {
  id: number;
  sessionId: number;
  termId: number;
  section: string;
  title: string;
  tuitionAmount: number;
  developmentLevy: number;
  booksAndMaterials: number;
  examFee: number;
  totalAmount: number;
  isDemo: boolean;
}

interface FinancePayload {
  summary: {
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
    fullyPaidStudents: number;
    studentsWithOutstanding: number;
  };
  structures: FeeStructureItem[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
}

export function AdminFinanceTab({
  role,
  sessions,
  terms,
  settings,
  onChanged,
}: {
  role: UserRole;
  sessions: SessionItem[];
  terms: TermItem[];
  settings: SchoolSettings | null;
  onChanged: () => void;
}) {
  const { apiFetch } = useAuth();
  const [finance, setFinance] = useState<FinancePayload | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [subTab, setSubTab] = useState<'overview' | 'structures' | 'record'>('overview');
  const [msg, setMsg] = useState<string | null>(null);

  // Fee structure form
  const [sessionId, setSessionId] = useState<number>(sessions.find((s) => s.isCurrent)?.id || sessions[0]?.id || 1);
  const [termId, setTermId] = useState<number>(terms.find((t) => t.isCurrent)?.id || terms[0]?.id || 1);
  const [section, setSection] = useState<'Nursery' | 'Primary'>('Primary');
  const [title, setTitle] = useState('');
  const [tuition, setTuition] = useState('20000');
  const [devLevy, setDevLevy] = useState('3000');
  const [books, setBooks] = useState('4000');
  const [exam, setExam] = useState('1500');

  // Invoice generation
  const [genStructId, setGenStructId] = useState<number>(0);
  const [genStudentId, setGenStudentId] = useState<string>('all');
  const [genDueDate, setGenDueDate] = useState('');

  // Record payment form
  const [payInvoiceId, setPayInvoiceId] = useState<number>(0);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank Transfer'>('Cash');
  const [payRef, setPayRef] = useState('');
  const [payVerifyNow, setPayVerifyNow] = useState(false);

  const canEdit = role === 'super_admin' || role === 'accountant';

  const load = useCallback(async () => {
    const [fin, stus] = await Promise.all([
      apiFetch<FinancePayload>('/api/admin/finance'),
      apiFetch<StudentRecord[]>('/api/admin/students'),
    ]);
    setFinance(fin);
    setStudents(stus);
    if (fin.structures[0]) setGenStructId((p) => p || fin.structures[0].id);
    const unpaidInv = fin.invoices.find((i) => i.status !== 'Paid');
    if (unpaidInv) setPayInvoiceId((p) => p || unpaidInv.id);
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiFetch('/api/admin/finance/structures', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          termId,
          section,
          title,
          tuitionAmount: Number(tuition),
          developmentLevy: Number(devLevy),
          booksAndMaterials: Number(books),
          examFee: Number(exam),
        }),
      });
      setTitle('');
      setMsg('Fee structure created.');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to create fee structure.');
    }
  };

  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await apiFetch<{ count: number }>('/api/admin/finance/invoices/generate', {
        method: 'POST',
        body: JSON.stringify({
          feeStructureId: genStructId,
          studentId: genStudentId === 'all' ? null : Number(genStudentId),
          dueDate: genDueDate,
        }),
      });
      setMsg(`Generated ${res.count} student fee invoice(s).`);
      await load();
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to generate invoices.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiFetch('/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: payInvoiceId,
          amount: Number(payAmount),
          paymentMethod: payMethod,
          reference: payRef,
          verifyNow: payMethod === 'Cash' ? true : payVerifyNow,
        }),
      });
      setPayAmount('');
      setPayRef('');
      setMsg(
        payMethod === 'Bank Transfer' && !payVerifyNow
          ? 'Bank transfer recorded as Pending Verification.'
          : 'Payment recorded and verified.'
      );
      await load();
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to record payment.');
    }
  };

  const handleVerifyTransfer = async (paymentId: number, status: 'Verified' | 'Rejected') => {
    await apiFetch(`/api/admin/finance/payments/${paymentId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setMsg(`Transfer marked as ${status}.`);
    await load();
    onChanged();
  };

  const exportFinancialCsv = () => {
    if (!finance) return;
    const headers = ['Invoice No', 'Student', 'Admission No', 'Class', 'Amount Due', 'Amount Paid', 'Status'];
    const lines = finance.invoices.map((i) =>
      [
        i.invoiceNumber,
        `"${i.studentName || ''}"`,
        i.admissionNumber || '',
        `"${i.className || ''}"`,
        i.amountDue,
        i.amountPaid,
        i.status,
      ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bamaina-bright-academy-fees-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!finance) return <div className="p-6 text-sm text-slate-500">Loading financial ledger...</div>;

  return (
    <div className="space-y-6">
      {/* Payment Dashboard KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Fees Expected</p>
          <p className="font-display font-bold text-xl text-blue-950 tabular-nums mt-1">
            ₦{finance.summary.totalExpected.toLocaleString('en-NG')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Collected</p>
          <p className="font-display font-bold text-xl text-emerald-700 tabular-nums mt-1">
            ₦{finance.summary.totalCollected.toLocaleString('en-NG')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Outstanding Balances</p>
          <p className="font-display font-bold text-xl text-amber-700 tabular-nums mt-1">
            ₦{finance.summary.totalOutstanding.toLocaleString('en-NG')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Fully Paid Students</p>
          <p className="font-display font-bold text-xl text-blue-950 tabular-nums mt-1">
            {finance.summary.fullyPaidStudents}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">With Outstanding</p>
          <p className="font-display font-bold text-xl text-red-700 tabular-nums mt-1">
            {finance.summary.studentsWithOutstanding}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('overview')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
              subTab === 'overview' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
            }`}
          >
            Invoices & Payments
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setSubTab('record')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
                  subTab === 'record' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                Record Payment & Invoices
              </button>
              <button
                type="button"
                onClick={() => setSubTab('structures')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
                  subTab === 'structures' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                Fee Structures
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={exportFinancialCsv}
          className="min-h-[40px] px-4 py-2 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-lg inline-flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Export Financial Report (CSV)</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          {msg}
        </div>
      )}

      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Pending Bank Transfer Verification Queue */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-blue-950">
              Payment Ledger & Bank Transfer Verification
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Receipt</th>
                    <th className="px-3 py-2.5 font-semibold">Student</th>
                    <th className="px-3 py-2.5 font-semibold">Method / Ref</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 tabular-nums">
                  {finance.payments.map((p) => {
                    const inv = finance.invoices.find((i) => i.id === p.invoiceId);
                    return (
                      <tr key={p.id}>
                        <td className="px-3 py-3 font-mono text-xs">{p.receiptNumber}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">
                          {p.studentName}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {p.paymentMethod}
                          {p.reference ? ` · ${p.reference}` : ''}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          ₦{p.amount.toLocaleString('en-NG')}
                        </td>
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3 text-right space-x-2 whitespace-nowrap">
                          {canEdit && p.verificationStatus === 'Pending Verification' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerifyTransfer(p.id, 'Verified')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-700 text-white rounded"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerifyTransfer(p.id, 'Rejected')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-700 text-white rounded"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              downloadFeeReceiptPdf(
                                p,
                                inv,
                                p.studentName || 'Student',
                                p.admissionNumber || '',
                                settings
                              )
                            }
                            className="text-xs font-semibold text-blue-800 hover:underline"
                          >
                            Receipt PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-blue-950">
              All Student Fee Invoices
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Invoice</th>
                    <th className="px-3 py-2.5 font-semibold">Student</th>
                    <th className="px-3 py-2.5 font-semibold">Class</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Due</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Paid</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 tabular-nums">
                  {finance.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-3 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{inv.studentName}</td>
                      <td className="px-3 py-3 text-slate-600">{inv.className || '—'}</td>
                      <td className="px-3 py-3 text-right">₦{inv.amountDue.toLocaleString('en-NG')}</td>
                      <td className="px-3 py-3 text-right">₦{inv.amountPaid.toLocaleString('en-NG')}</td>
                      <td className="px-3 py-3 font-semibold text-xs">{inv.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'record' && canEdit && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleRecordPayment}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-base text-blue-950">
              Record Fee Payment
            </h3>
            <select
              value={payInvoiceId}
              onChange={(e) => setPayInvoiceId(Number(e.target.value))}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {finance.invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} — {i.studentName} (Bal: ₦
                  {Math.max(0, i.amountDue - i.amountPaid).toLocaleString('en-NG')})
                </option>
              ))}
            </select>
            <input
              type="number"
              required
              min={100}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount Paid (NGN)"
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as 'Cash' | 'Bank Transfer')}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="Cash">Cash Payment (Recorded by Accountant)</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="Receipt / Bank Transfer Reference"
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            {payMethod === 'Bank Transfer' && (
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={payVerifyNow}
                  onChange={(e) => setPayVerifyNow(e.target.checked)}
                />
                <span>I have confirmed this bank credit in the school bank statement</span>
              </label>
            )}
            <button
              type="submit"
              className="w-full min-h-[42px] px-4 py-2.5 text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg"
            >
              Save Payment & Generate Receipt
            </button>
          </form>

          <form
            onSubmit={handleGenerateInvoices}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-base text-blue-950">
              Generate Student Fee Invoices
            </h3>
            <select
              value={genStructId}
              onChange={(e) => setGenStructId(Number(e.target.value))}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {finance.structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.section}) — ₦{s.totalAmount.toLocaleString('en-NG')}
                </option>
              ))}
            </select>
            <select
              value={genStudentId}
              onChange={(e) => setGenStudentId(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="all">All Active Students in Matching Section</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName} ({st.admissionNumber})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={genDueDate}
              onChange={(e) => setGenDueDate(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="w-full min-h-[42px] px-4 py-2.5 text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg"
            >
              Issue Fee Invoices
            </button>
          </form>
        </div>
      )}

      {subTab === 'structures' && canEdit && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateStructure}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-base text-blue-950">
              Create Fee Structure
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={sessionId}
                onChange={(e) => setSessionId(Number(e.target.value))}
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={termId}
                onChange={(e) => setTermId(Number(e.target.value))}
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as 'Nursery' | 'Primary')}
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="Nursery">Nursery Section</option>
              <option value="Primary">Primary Section</option>
            </select>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fee Title (e.g. Primary First Term Fees)"
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                required
                value={tuition}
                onChange={(e) => setTuition(e.target.value)}
                placeholder="Tuition"
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                type="number"
                value={devLevy}
                onChange={(e) => setDevLevy(e.target.value)}
                placeholder="Dev Levy"
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                type="number"
                value={books}
                onChange={(e) => setBooks(e.target.value)}
                placeholder="Books & Materials"
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                type="number"
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                placeholder="Exam Fee"
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[42px] px-4 py-2.5 text-sm font-semibold bg-blue-900 text-white rounded-lg"
            >
              Save Fee Structure
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-base text-blue-950 border-b border-slate-200 pb-2">
              Configured Fee Structures
            </h3>
            <div className="divide-y divide-slate-200">
              {finance.structures.map((st) => (
                <div key={st.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">
                      {st.title} {st.isDemo ? '[DEMO]' : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {st.section} Section · Tuition ₦{st.tuitionAmount.toLocaleString('en-NG')}
                    </p>
                  </div>
                  <p className="font-display font-bold text-base text-blue-950 tabular-nums">
                    ₦{st.totalAmount.toLocaleString('en-NG')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
