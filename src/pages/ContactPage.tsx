import React, { useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import type { PublicBootstrap } from '../lib/types';

interface ContactPageProps {
  data: PublicBootstrap;
}

export function ContactPage({ data }: ContactPageProps) {
  const { settings } = data;
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          senderPhone,
          senderEmail,
          subject,
          message,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to submit enquiry.');
      setSent(true);
      setSenderName('');
      setSenderPhone('');
      setSenderEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-blue-950 text-white py-12 border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-amber-300 mb-2">
            Contact & Campus Location
          </p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Get in Touch with Bamaina Bright Academy
          </h1>
          <p className="text-blue-100 mt-2 max-w-2xl text-sm sm:text-base">
            Reach out for admissions enquiries, school visits, fee administration questions, or parent feedback.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Official School Address & Editable Contact Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="font-display font-bold text-xl text-blue-950">
              Official School Details
            </h2>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">School Address</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  Bamaina Bright Academy
                  <br />
                  Bamaina Town, Birnin Kudu Local Government Area,
                  <br />
                  Jigawa State, Nigeria.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Official Telephone</p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {settings.phone || 'Not yet published — editable in Admin Settings'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Official Email</p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {settings.email || 'Not yet published — editable in Admin Settings'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500">Official WhatsApp</p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {settings.whatsapp || 'Not yet published — editable in Admin Settings'}
                </p>
              </div>
            </div>
          </div>

          {/* Location Map */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-display font-bold text-base text-blue-950">
                Campus Area Map
              </h3>
              <p className="text-xs text-slate-500">
                Bamaina Town, Birnin Kudu LGA, Jigawa State
              </p>
            </div>
            {settings.mapsEmbedUrl && settings.mapsEmbedUrl.startsWith('https://') ? (
              <iframe
                title="Bamaina Bright Academy Location Map"
                src={settings.mapsEmbedUrl}
                className="w-full h-64 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="p-6 bg-blue-50/60 text-sm text-slate-700 space-y-2">
                <p>
                  Exact campus Google Maps embed URL can be added by the School Administrator in Website Settings (no unverified coordinates are invented).
                </p>
                <p className="text-xs text-slate-500">
                  Location Reference: {settings.mapsQuery}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Enquiry Form */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            <h2 className="font-display font-bold text-xl text-blue-950 mb-1">
              Send a Contact Enquiry
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Messages are delivered directly to the School Administration Dashboard.
            </p>

            {sent && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Your enquiry has been sent to Bamaina Bright Academy administration.</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address (optional)
                  </label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Nursery Admission Enquiry"
                    className="w-full min-h-[44px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message *
                </label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-2 focus:outline-blue-700"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] px-6 py-3 text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting ? 'Sending Enquiry...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
