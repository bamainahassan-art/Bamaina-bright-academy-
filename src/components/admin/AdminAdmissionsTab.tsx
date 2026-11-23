import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, FileText, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadAdmissionLetterPdf } from '../../lib/pdfGenerator';
import type { SchoolSettings } from '../../lib/types';

interface AdmissionRow {
  id: number;
  referenceNumber: string;
  studentFullName: string;
  dateOfBirth: string;
  gender: string;
  applyingClassName: string;
  previousSchool: string | null;
  studentAddress: string;
  passportDataUrl: string | null;
  parentFullName: string;
  parentPhone: string;
  parentEmail: string | null;
  parentAddress: string;
  relationship: string;
  medicalInfo: string | null;
  emergencyContact: string;
  supportingDocName: string | null;
  supportingDocDataUrl: string | null;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  adminNotes: string | null;
  admittedStudentId: number | null;
  createdAt: string;
}

export function AdminAdmissionsTab({
  settings,
  onChanged,
}: {
  settings: SchoolSettings | null;
  onChanged: () => void;
}) {
  const { apiFetch } = useAuth();
  const [rows, setRows] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<AdmissionRow | null>(null);
  const [notes, setNotes] = useState('');
  const [enrolStudent, setEnrolStudent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AdmissionRow[]>('/api/admin/admissions');
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateStatus = async (status: AdmissionRow['status']) => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await apiFetch<AdmissionRow>(`/api/admin/admissions/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          adminNotes: notes,
          enrolStudent: status === 'Approved' ? enrolStudent : false,
        }),
      });
      setSelected(updated);
      setMsg(`Application ${updated.referenceNumber} updated to "${status}".`);
      await load();
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter((r) => (filter === 'All' ? true : r.status === filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-blue-950">
            Online Admission Applications
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Review submitted applications, update review statuses, and enrol approved pupils.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {['All', 'Submitted', 'Under Review', 'Approved', 'Rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                filter === st ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading applications...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No admission applications match this filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filtered.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    setSelected(app);
                    setNotes(app.adminNotes || '');
                    setMsg(null);
                  }}
                  className={`w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors ${
                    selected?.id === app.id ? 'bg-blue-50/70' : ''
                  }`}
                >
                  <div>
                    <p className="font-mono text-xs text-blue-800 font-semibold">
                      {app.referenceNumber}
                    </p>
                    <p className="font-semibold text-sm text-slate-900 mt-0.5">
                      {app.studentFullName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.applyingClassName} · Parent: {app.parentFullName}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded border shrink-0 ${
                      app.status === 'Approved'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : app.status === 'Rejected'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : app.status === 'Under Review'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    {app.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          {!selected ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Select an application from the list to inspect full details and update its status.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="font-mono text-xs text-blue-800 font-semibold">
                    {selected.referenceNumber}
                  </p>
                  <h3 className="font-display font-bold text-lg text-blue-950">
                    {selected.studentFullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Applying for {selected.applyingClassName} · {selected.gender} · DOB:{' '}
                    {selected.dateOfBirth}
                  </p>
                </div>
                {selected.passportDataUrl && (
                  <img
                    src={selected.passportDataUrl}
                    alt="Applicant passport"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                )}
              </div>

              <dl className="space-y-2 text-xs sm:text-sm">
                <div>
                  <dt className="text-slate-500">Residential Address</dt>
                  <dd className="font-medium text-slate-900">{selected.studentAddress}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Parent / Guardian ({selected.relationship})</dt>
                  <dd className="font-medium text-slate-900">
                    {selected.parentFullName} · {selected.parentPhone}
                    {selected.parentEmail ? ` · ${selected.parentEmail}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Emergency Contact</dt>
                  <dd className="font-medium text-slate-900">{selected.emergencyContact}</dd>
                </div>
                {selected.medicalInfo && (
                  <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                    <dt className="text-xs font-semibold text-amber-900">
                      Confidential Medical / Learning Notes
                    </dt>
                    <dd className="text-xs text-slate-800 mt-0.5">{selected.medicalInfo}</dd>
                  </div>
                )}
                {selected.supportingDocName && selected.supportingDocDataUrl && (
                  <div>
                    <a
                      href={selected.supportingDocDataUrl}
                      download={selected.supportingDocName}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Download Supporting Doc: {selected.supportingDocName}</span>
                    </a>
                  </div>
                )}
              </dl>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Review Notes / Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes visible on applicant status & admission letter..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm"
                  />
                </div>

                {!selected.admittedStudentId && (
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={enrolStudent}
                      onChange={(e) => setEnrolStudent(e.target.checked)}
                    />
                    <span>Automatically enrol student & assign admission number when Approved</span>
                  </label>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleUpdateStatus('Under Review')}
                    className="px-3 py-2 text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-900 rounded-lg"
                  >
                    Mark Under Review
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleUpdateStatus('Approved')}
                    className="px-3 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleUpdateStatus('Rejected')}
                    className="px-3 py-2 text-xs font-semibold bg-red-700 hover:bg-red-600 text-white rounded-lg inline-flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>

                {selected.status === 'Approved' && (
                  <button
                    type="button"
                    onClick={() => downloadAdmissionLetterPdf(selected, settings)}
                    className="w-full px-4 py-2.5 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Generate Admission Letter (PDF)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
