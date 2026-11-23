import React, { useState } from 'react';
import { CheckCircle2, Download, FileText, Printer, Search, Shield } from 'lucide-react';
import {
  downloadAdmissionAcknowledgementPdf,
  downloadAdmissionLetterPdf,
} from '../lib/pdfGenerator';
import type { PublicBootstrap } from '../lib/types';

interface AdmissionsPageProps {
  data: PublicBootstrap;
}

interface SubmittedReceipt {
  id: number;
  referenceNumber: string;
  studentFullName: string;
  dateOfBirth: string;
  gender: string;
  applyingClassName: string;
  parentFullName: string;
  parentPhone: string;
  parentEmail: string | null;
  status: string;
  createdAt: string;
}

interface StatusLookupResult {
  referenceNumber: string;
  studentFullName: string;
  applyingClassName: string;
  parentFullName: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  adminNotes: string | null;
  admittedAdmissionNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

function readFileAsDataUrl(file: File, maxBytes = 1_200_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`"${file.name}" exceeds 1.2 MB. Please choose a smaller file.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export function AdmissionsPage({ data }: AdmissionsPageProps) {
  const [tab, setTab] = useState<'apply' | 'status'>('apply');
  const activeClasses = data.classes.filter((c) => c.isActive);

  // Application form state
  const [studentFullName, setStudentFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [applyingClassId, setApplyingClassId] = useState<number>(activeClasses[0]?.id || 1);
  const [previousSchool, setPreviousSchool] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [passportDataUrl, setPassportDataUrl] = useState('');
  const [passportName, setPassportName] = useState('');

  const [parentFullName, setParentFullName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [relationship, setRelationship] = useState('Father');

  const [medicalInfo, setMedicalInfo] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [supportingDocName, setSupportingDocName] = useState('');
  const [supportingDocDataUrl, setSupportingDocDataUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<SubmittedReceipt | null>(null);

  // Status checker state
  const [lookupRef, setLookupRef] = useState('');
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<StatusLookupResult | null>(null);

  const handlePassportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFormError(null);
      const url = await readFileAsDataUrl(file);
      setPassportDataUrl(url);
      setPassportName(file.name);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid image file.');
    }
  };

  const handleSupportDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFormError(null);
      const url = await readFileAsDataUrl(file, 1_500_000);
      setSupportingDocDataUrl(url);
      setSupportingDocName(file.name);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid supporting file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/public/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentFullName,
          dateOfBirth,
          gender,
          applyingClassId: Number(applyingClassId),
          previousSchool,
          studentAddress,
          passportDataUrl,
          parentFullName,
          parentPhone,
          parentEmail,
          parentAddress,
          relationship,
          medicalInfo,
          emergencyContact,
          supportingDocName,
          supportingDocDataUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Could not submit application.');
      }
      setSubmittedApp(json.application);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    setChecking(true);
    try {
      const res = await fetch(
        `/api/public/admissions/status?ref=${encodeURIComponent(lookupRef.trim())}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Application not found.');
      }
      setLookupResult(json);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-blue-950 text-white py-12 border-b border-blue-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-amber-300 mb-2">
              Online Admission Platform
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
              Apply to Bamaina Bright Academy
            </h1>
            <p className="text-blue-100 mt-2 max-w-xl text-sm sm:text-base">
              Complete the Nursery or Primary admission form online, receive your unique reference number immediately, and track approval status anytime.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 bg-blue-900 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setTab('apply')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap min-h-[40px] ${
                tab === 'apply'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              New Application
            </button>
            <button
              type="button"
              onClick={() => setTab('status')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap min-h-[40px] ${
                tab === 'status'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Check Application Status
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {tab === 'apply' ? (
          submittedApp ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-bold text-2xl text-blue-950">
                    Application Submitted Successfully
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Keep your unique reference number safe to check your admission review status online.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-blue-800">
                    Unique Application Reference Number
                  </p>
                  <p className="font-mono font-bold text-2xl text-blue-950 mt-1 tabular-nums">
                    {submittedApp.referenceNumber}
                  </p>
                </div>
                <div className="text-xs sm:text-right text-slate-600">
                  <p>
                    Status: <strong className="text-blue-950">{submittedApp.status}</strong>
                  </p>
                  <p className="mt-0.5">Class: {submittedApp.applyingClassName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-slate-200 pt-5">
                <div>
                  <span className="text-slate-500">Applicant Name:</span>{' '}
                  <strong className="text-slate-900">{submittedApp.studentFullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Parent / Guardian:</span>{' '}
                  <strong className="text-slate-900">{submittedApp.parentFullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Class Applying For:</span>{' '}
                  <strong className="text-slate-900">{submittedApp.applyingClassName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Phone Contact:</span>{' '}
                  <strong className="text-slate-900">{submittedApp.parentPhone}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    downloadAdmissionAcknowledgementPdf(submittedApp, data.settings)
                  }
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-900 text-white hover:bg-blue-800 rounded-lg min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Acknowledgement PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg min-h-[44px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLookupRef(submittedApp.referenceNumber);
                    setTab('status');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 rounded-lg min-h-[44px]"
                >
                  <Search className="w-4 h-4" />
                  <span>Track Status</span>
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8"
            >
              {formError && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {formError}
                </div>
              )}

              {/* Section 1: Student Information */}
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg text-blue-950 border-b border-slate-200 pb-2">
                  01. Student Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentFullName}
                      onChange={(e) => setStudentFullName(e.target.value)}
                      placeholder="Surname Firstname Other Name"
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Gender *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-2 focus:outline-blue-700"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Class Applying For *
                    </label>
                    <select
                      value={applyingClassId}
                      onChange={(e) => setApplyingClassId(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-2 focus:outline-blue-700"
                    >
                      {activeClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.section})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Previous School (if applicable)
                    </label>
                    <input
                      type="text"
                      value={previousSchool}
                      onChange={(e) => setPreviousSchool(e.target.value)}
                      placeholder="Optional"
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Residential Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentAddress}
                      onChange={(e) => setStudentAddress(e.target.value)}
                      placeholder="House / Ward, Town, LGA"
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Passport Photograph Upload (JPG/PNG, max 1.2 MB)
                    </label>
                    <div className="flex flex-wrap items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePassportChange}
                        className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
                      />
                      {passportDataUrl && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700">
                          <img
                            src={passportDataUrl}
                            alt="Passport preview"
                            className="w-11 h-11 rounded object-cover border border-slate-200"
                          />
                          <span>{passportName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Parent / Guardian Information */}
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg text-blue-950 border-b border-slate-200 pb-2">
                  02. Parent / Guardian Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Parent / Guardian Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={parentFullName}
                      onChange={(e) => setParentFullName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Relationship to Student *
                    </label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-2 focus:outline-blue-700"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Legal Guardian</option>
                      <option value="Relative">Family Relative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="e.g. 080..."
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address (used for Parent Portal linking)
                    </label>
                    <input
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Parent / Guardian Residential Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={parentAddress}
                      onChange={(e) => setParentAddress(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Confidential Medical & Emergency Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="font-display font-bold text-lg text-blue-950">
                    03. Emergency Contact & Additional Information
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Shield className="w-3.5 h-3.5 text-blue-700" />
                    Handled confidentially (NDPA)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Emergency Contact Name & Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="Full name and active telephone number"
                      className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Medical or Special Learning Information (Confidential — optional)
                    </label>
                    <textarea
                      rows={3}
                      value={medicalInfo}
                      onChange={(e) => setMedicalInfo(e.target.value)}
                      placeholder="Allergies, medical needs, or learning support notes accessible only to senior school leadership."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Supporting Documents (Birth Certificate / Transfer Letter — optional, max 1.5 MB)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleSupportDocChange}
                        className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:text-xs file:font-semibold file:text-slate-700"
                      />
                      {supportingDocName && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <FileText className="w-3.5 h-3.5" />
                          {supportingDocName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-slate-500 max-w-md">
                  By submitting this form, you confirm that all pupil and guardian details are accurate for school admission review in accordance with the Nigeria Data Protection Act.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-7 py-3 text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Admission Application'}
                </button>
              </div>
            </form>
          )
        ) : (
          /* Status Checker Tab */
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-blue-950">
                Track Admission Application Status
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Enter the Application Reference Number generated when you submitted your form (e.g. BBA-ADM-2026-1234).
              </p>
            </div>

            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={lookupRef}
                onChange={(e) => setLookupRef(e.target.value)}
                placeholder="Enter reference number (e.g. BBA-ADM-2026-....)"
                className="flex-1 min-h-[44px] px-4 py-2.5 border border-slate-300 rounded-lg font-mono text-sm uppercase focus:outline-2 focus:outline-blue-700"
              />
              <button
                type="submit"
                disabled={checking}
                className="min-h-[44px] px-6 py-2.5 text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>{checking ? 'Checking...' : 'Check Status'}</span>
              </button>
            </form>

            {lookupError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {lookupError}
              </div>
            )}

            {lookupResult && (
              <div className="border border-slate-200 rounded-xl p-6 space-y-5 bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <p className="font-mono text-xs text-slate-500">
                      {lookupResult.referenceNumber}
                    </p>
                    <h3 className="font-display font-bold text-xl text-blue-950 mt-0.5">
                      {lookupResult.studentFullName}
                    </h3>
                  </div>
                  <div className="text-sm font-semibold">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-md border ${
                        lookupResult.status === 'Approved'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : lookupResult.status === 'Rejected'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : lookupResult.status === 'Under Review'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      Status: {lookupResult.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <p>
                    <span className="text-slate-500">Applying Class:</span>{' '}
                    <strong>{lookupResult.applyingClassName}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Parent / Guardian:</span>{' '}
                    <strong>{lookupResult.parentFullName}</strong>
                  </p>
                  {lookupResult.admittedAdmissionNumber && (
                    <p>
                      <span className="text-slate-500">Assigned Admission No:</span>{' '}
                      <strong className="font-mono text-blue-900">
                        {lookupResult.admittedAdmissionNumber}
                      </strong>
                    </p>
                  )}
                </div>

                {lookupResult.adminNotes && (
                  <div className="p-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700">
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      Administration Remarks & Next Instructions
                    </p>
                    <p>{lookupResult.adminNotes}</p>
                  </div>
                )}

                {lookupResult.status === 'Approved' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadAdmissionLetterPdf(lookupResult, data.settings)
                      }
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg min-h-[44px]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Official Admission Letter (PDF)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
