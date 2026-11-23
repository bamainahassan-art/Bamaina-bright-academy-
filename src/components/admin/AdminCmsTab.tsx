import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { PublicBootstrap, UserRole } from '../../lib/types';

interface EnquiryRow {
  id: number;
  senderName: string;
  senderEmail: string | null;
  senderPhone: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export function AdminCmsTab({
  role,
  publicData,
  onChanged,
}: {
  role: UserRole;
  publicData: PublicBootstrap;
  onChanged: () => void;
}) {
  const { apiFetch } = useAuth();
  const [subTab, setSubTab] = useState<'settings' | 'news' | 'gallery' | 'enquiries'>('settings');
  const [msg, setMsg] = useState<string | null>(null);

  const s = publicData.settings;
  const [statStudents, setStatStudents] = useState(s.statStudents);
  const [statTeachers, setStatTeachers] = useState(s.statTeachers);
  const [statClasses, setStatClasses] = useState(s.statClasses);
  const [statYears, setStatYears] = useState(s.statYears);
  const [phone, setPhone] = useState(s.phone || '');
  const [email, setEmail] = useState(s.email || '');
  const [whatsapp, setWhatsapp] = useState(s.whatsapp || '');
  const [mapsEmbedUrl, setMapsEmbedUrl] = useState(s.mapsEmbedUrl || '');
  const [welcomeTitle, setWelcomeTitle] = useState(s.welcomeTitle);
  const [welcomeMessage, setWelcomeMessage] = useState(s.welcomeMessage);
  const [aboutHistory, setAboutHistory] = useState(s.aboutHistory);
  const [classPositionsEnabled, setClassPositionsEnabled] = useState(s.classPositionsEnabled);
  const [paystackPublicKey, setPaystackPublicKey] = useState(s.paystackPublicKey || '');
  const [paystackConfigured, setPaystackConfigured] = useState(s.paystackConfigured);

  // Leadership editing
  const [leaders, setLeaders] = useState(publicData.leadership);

  // News form
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Announcement');
  const [newsDate, setNewsDate] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');

  // Gallery form
  const [galTitle, setGalTitle] = useState('');
  const [galCat, setGalCat] = useState('Primary Classroom');
  const [galCaption, setGalCaption] = useState('');
  const [galImageUrl, setGalImageUrl] = useState('');

  // Enquiries
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);

  const isSuper = role === 'super_admin';

  const loadEnquiries = useCallback(async () => {
    const rows = await apiFetch<EnquiryRow[]>('/api/admin/enquiries');
    setEnquiries(rows);
  }, [apiFetch]);

  useEffect(() => {
    if (subTab === 'enquiries') {
      loadEnquiries();
    }
  }, [subTab, loadEnquiries]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        statStudents,
        statTeachers,
        statClasses,
        statYears,
        phone,
        email,
        whatsapp,
        mapsEmbedUrl,
        welcomeTitle,
        welcomeMessage,
        aboutHistory,
        classPositionsEnabled,
        paystackPublicKey,
        paystackConfigured,
      }),
    });
    setMsg('School website settings and statistics updated.');
    onChanged();
  };

  const handleSaveLeader = async (leader: (typeof leaders)[0]) => {
    await apiFetch(`/api/admin/leadership/${leader.id}`, {
      method: 'PUT',
      body: JSON.stringify(leader),
    });
    setMsg(`Updated ${leader.titleRole}.`);
    onChanged();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setMsg('Logo file must be under 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ logoDataUrl: String(reader.result || '') }),
      });
      setMsg('School logo updated.');
      onChanged();
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setMsg('Photo must be under 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setGalImageUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleClearDemoData = async () => {
    const res = await apiFetch<{ message: string }>('/api/admin/demo-data', {
      method: 'DELETE',
    });
    setMsg(res.message);
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
        {isSuper && (
          <button
            type="button"
            onClick={() => setSubTab('settings')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
              subTab === 'settings' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
            }`}
          >
            School Info, Stats & Branding
          </button>
        )}
        <button
          type="button"
          onClick={() => setSubTab('news')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
            subTab === 'news' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
          }`}
        >
          News & Events
        </button>
        <button
          type="button"
          onClick={() => setSubTab('gallery')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
            subTab === 'gallery' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
          }`}
        >
          Gallery Photos
        </button>
        <button
          type="button"
          onClick={() => setSubTab('enquiries')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
            subTab === 'enquiries' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
          }`}
        >
          Contact Enquiries
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          {msg}
        </div>
      )}

      {subTab === 'settings' && isSuper && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
          >
            <h3 className="font-display font-bold text-lg text-blue-950">
              Editable School Statistics, Contact & Content
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Total Students Stat
                </label>
                <input
                  type="text"
                  value={statStudents}
                  onChange={(e) => setStatStudents(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Qualified Teachers Stat
                </label>
                <input
                  type="text"
                  value={statTeachers}
                  onChange={(e) => setStatTeachers(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Classes Stat
                </label>
                <input
                  type="text"
                  value={statClasses}
                  onChange={(e) => setStatClasses(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Years of Excellence Stat
                </label>
                <input
                  type="text"
                  value={statYears}
                  onChange={(e) => setStatYears(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Official Telephone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Google Maps Embed URL (optional)
                </label>
                <input
                  type="url"
                  value={mapsEmbedUrl}
                  onChange={(e) => setMapsEmbedUrl(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Homepage Welcome Heading
                </label>
                <input
                  type="text"
                  value={welcomeTitle}
                  onChange={(e) => setWelcomeTitle(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Homepage Welcome Message
                </label>
                <textarea
                  rows={3}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  School Background & History (About Us)
                </label>
                <textarea
                  rows={3}
                  value={aboutHistory}
                  onChange={(e) => setAboutHistory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={classPositionsEnabled}
                  onChange={(e) => setClassPositionsEnabled(e.target.checked)}
                />
                <span>Enable Class Positions on Report Cards</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={paystackConfigured}
                  onChange={(e) => setPaystackConfigured(e.target.checked)}
                />
                <span>Paystack Gateway Active (requires PAYSTACK_SECRET_KEY)</span>
              </label>
            </div>

            {paystackConfigured && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Paystack Public Key
                </label>
                <input
                  type="text"
                  value={paystackPublicKey}
                  onChange={(e) => setPaystackPublicKey(e.target.value)}
                  placeholder="pk_live_... or pk_test_..."
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Upload Custom School Logo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-xs text-slate-600"
                />
              </div>

              <button
                type="submit"
                className="min-h-[44px] px-6 py-2.5 text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg"
              >
                Save Website Settings
              </button>
            </div>
          </form>

          {/* Leadership Directory Editor */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-blue-950">
              Edit School Leadership & Management Names
            </h3>
            <div className="space-y-3">
              {leaders.map((leader, idx) => (
                <div key={leader.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <input
                    type="text"
                    value={leader.titleRole}
                    onChange={(e) => {
                      const next = [...leaders];
                      next[idx] = { ...leader, titleRole: e.target.value };
                      setLeaders(next);
                    }}
                    className="sm:col-span-4 min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={leader.fullName}
                    onChange={(e) => {
                      const next = [...leaders];
                      next[idx] = { ...leader, fullName: e.target.value };
                      setLeaders(next);
                    }}
                    className="sm:col-span-6 min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveLeader(leaders[idx])}
                    className="sm:col-span-2 min-h-[40px] px-3 py-1.5 text-xs font-semibold bg-amber-400 text-slate-950 rounded-lg"
                  >
                    Update
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Demo Data Action */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-base text-amber-950">
                Prepare for Live Deployment: Clear Sample Demo Records
              </h3>
              <p className="text-xs text-amber-900 mt-1">
                Removes all sample demonstration accounts, students, fees, and results marked [DEMO] while keeping your real records intact.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearDemoData}
              className="px-4 py-2.5 text-xs font-semibold bg-red-700 hover:bg-red-600 text-white rounded-lg whitespace-nowrap shrink-0"
            >
              Clear Sample Demo Records
            </button>
          </div>
        </div>
      )}

      {subTab === 'news' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/api/admin/news', {
                method: 'POST',
                body: JSON.stringify({
                  title: newsTitle,
                  category: newsCategory,
                  eventDate: newsDate,
                  summary: newsSummary,
                  content: newsContent,
                }),
              });
              setNewsTitle('');
              setNewsDate('');
              setNewsSummary('');
              setNewsContent('');
              setMsg('Announcement published.');
              onChanged();
            }}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-base text-blue-950">
              Publish News or Event
            </h3>
            <input
              type="text"
              required
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              placeholder="Headline *"
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newsCategory}
                onChange={(e) => setNewsCategory(e.target.value)}
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Announcement">Announcement</option>
                <option value="Admission">Admission</option>
                <option value="Examination">Examination</option>
                <option value="Achievement">Achievement</option>
                <option value="Event">Event</option>
              </select>
              <input
                type="text"
                value={newsDate}
                onChange={(e) => setNewsDate(e.target.value)}
                placeholder="Date label"
                className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <input
              type="text"
              required
              value={newsSummary}
              onChange={(e) => setNewsSummary(e.target.value)}
              placeholder="Short summary *"
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <textarea
              rows={4}
              required
              value={newsContent}
              onChange={(e) => setNewsContent(e.target.value)}
              placeholder="Full article or announcement text *"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="w-full min-h-[42px] px-4 py-2 text-sm font-semibold bg-blue-900 text-white rounded-lg"
            >
              Publish Notice
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-base text-blue-950 border-b border-slate-200 pb-2">
              Published News & Events
            </h3>
            <div className="divide-y divide-slate-200">
              {publicData.news.map((n) => (
                <div key={n.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-blue-800 font-semibold">{n.category}</p>
                    <p className="font-semibold text-sm text-slate-900">{n.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/news/${n.id}`, { method: 'DELETE' });
                      onChanged();
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'gallery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/api/admin/gallery', {
                method: 'POST',
                body: JSON.stringify({
                  title: galTitle,
                  category: galCat,
                  caption: galCaption,
                  imageUrl: galImageUrl,
                }),
              });
              setGalTitle('');
              setGalCaption('');
              setGalImageUrl('');
              setMsg('Photo added to School Gallery.');
              onChanged();
            }}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-base text-blue-950">
              Upload School Gallery Photograph
            </h3>
            <input
              type="text"
              required
              value={galTitle}
              onChange={(e) => setGalTitle(e.target.value)}
              placeholder="Photo Title *"
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <select
              value={galCat}
              onChange={(e) => setGalCat(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="Nursery Classroom">Nursery Classroom</option>
              <option value="Primary Classroom">Primary Classroom</option>
              <option value="Teachers & Students">Teachers & Students</option>
              <option value="School Facilities">School Facilities</option>
              <option value="Sports & Extracurricular">Sports & Extracurricular</option>
            </select>
            <input
              type="text"
              value={galCaption}
              onChange={(e) => setGalCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full min-h-[40px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="file"
              accept="image/*"
              required={!galImageUrl}
              onChange={handleGalleryFile}
              className="text-xs text-slate-600"
            />
            <button
              type="submit"
              disabled={!galImageUrl}
              className="w-full min-h-[42px] px-4 py-2 text-sm font-semibold bg-blue-900 text-white rounded-lg disabled:opacity-50"
            >
              Add Photo to Gallery
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-base text-blue-950 border-b border-slate-200 pb-2">
              Current Gallery Photos ({publicData.gallery.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publicData.gallery.map((g) => (
                <div key={g.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <img
                    src={g.imageUrl}
                    alt={g.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-blue-800">{g.category}</p>
                      <p className="text-sm font-medium text-slate-900">{g.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/gallery/${g.id}`, { method: 'DELETE' });
                        onChanged();
                      }}
                      className="text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'enquiries' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-blue-950">
            Contact Enquiries Inbox
          </h3>
          {enquiries.length === 0 ? (
            <p className="text-sm text-slate-500">No contact enquiries submitted yet.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {enquiries.map((eq) => (
                <div key={eq.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-blue-950">{eq.subject}</p>
                    <p className="text-xs text-slate-500">
                      {eq.senderName} · {eq.senderPhone} {eq.senderEmail ? `· ${eq.senderEmail}` : ''}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">{eq.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/enquiries/${eq.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                          status: eq.status === 'New' ? 'Reviewed' : 'New',
                        }),
                      });
                      await loadEnquiries();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded border shrink-0 ${
                      eq.status === 'New'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {eq.status}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
