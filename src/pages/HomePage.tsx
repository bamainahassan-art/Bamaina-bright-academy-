import { useState } from 'react';
import { ArrowRight, BookOpen, Calendar, ChevronRight, Quote, X } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import type { PageRoute } from '../components/Navbar';
import type { NewsItem, PublicBootstrap } from '../lib/types';

interface HomePageProps {
  data: PublicBootstrap;
  onNavigate: (page: PageRoute) => void;
}

const WHY_CHOOSE_ITEMS = [
  {
    num: '01',
    title: 'Qualified and dedicated teachers',
    desc: 'Trained early-childhood and primary educators committed to patient instruction and steady academic progress.',
  },
  {
    num: '02',
    title: 'Quality Nursery and Primary education',
    desc: 'Structured progression from Nursery One through Primary Six aligned with approved national standards.',
  },
  {
    num: '03',
    title: 'Child-friendly learning environment',
    desc: 'Bright, airy classrooms and age-appropriate learning aids that make every pupil feel welcome and curious.',
  },
  {
    num: '04',
    title: 'Strong academic foundation',
    desc: 'Focused mastery of English literacy, mathematical reasoning, science discovery, and digital readiness.',
  },
  {
    num: '05',
    title: 'Moral and character development',
    desc: 'Daily emphasis on honesty, respect, discipline, responsibility, and civic service.',
  },
  {
    num: '06',
    title: 'Modern teaching and learning methods',
    desc: 'Guided play in Nursery classes paired with hands-on inquiry and introductory computer studies in Primary classes.',
  },
  {
    num: '07',
    title: 'Individual attention and student support',
    desc: 'Continuous assessment tracking helps teachers spot learning needs early and partner closely with parents.',
  },
  {
    num: '08',
    title: 'Safe and supportive school environment',
    desc: 'Well-supervised campus grounds in Bamaina Town designed around pupil safety, hygiene, and wellbeing.',
  },
];

export function HomePage({ data, onNavigate }: HomePageProps) {
  const { settings, classes, subjects, news, testimonials } = data;
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const activeNursery = classes.filter((c) => c.section === 'Nursery' && c.isActive);
  const activePrimary = classes.filter((c) => c.section === 'Primary' && c.isActive);
  const nurserySubjects = subjects.filter((s) => s.section === 'Nursery' || s.section === 'Both');
  const primarySubjects = subjects.filter((s) => s.section === 'Primary' || s.section === 'Both');

  const stats = [
    { label: 'Total Students', value: settings.statStudents || '—' },
    { label: 'Qualified Teachers', value: settings.statTeachers || '—' },
    { label: 'Classes', value: settings.statClasses || '—' },
    { label: 'Years of Academic Excellence', value: settings.statYears || '—' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50/80 via-white to-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-semibold text-blue-800 tracking-wide mb-3">
                Welcome to Bamaina Bright Academy · Birnin Kudu LGA, Jigawa State
              </p>
              <h1
                className="font-display font-extrabold text-blue-950 tracking-tight leading-[1.12] mb-5"
                style={{ fontSize: 'clamp(2.1rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Building Bright Minds, Inspiring Great Futures.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                At Bamaina Bright Academy, we provide quality Nursery and Primary education in a supportive, disciplined, and stimulating environment where every child is encouraged to discover their potential and achieve excellence.
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onNavigate('admissions')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs min-h-[44px]"
                >
                  <span>Apply for Admission</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px]"
                >
                  <span>Explore Our School</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-blue-950 shadow-sm">
                <SafeImage
                  src="/src/assets/images/hero_nursery_primary_1795434531980.jpg"
                  alt="Pupils learning in a bright classroom at Bamaina Bright Academy"
                  className="w-full h-full lg:h-full object-cover"
                  fallbackTitle="Bamaina Bright Academy Classroom"
                />
              </div>
            </div>
          </div>

          {/* Editable Statistics Strip */}
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white border border-slate-200 rounded-xl px-5 py-4"
                >
                  <p className="font-display font-bold text-2xl sm:text-3xl text-blue-950 tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Official school figures are maintained directly by the School Administration Dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Welcome Message */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="aspect-[16/10] rounded-xl overflow-hidden border border-slate-200">
              <SafeImage
                src="/src/assets/images/about_campus_courtyard_1795434565564.jpg"
                alt="Bamaina Bright Academy school campus courtyard"
                className="w-full h-full object-cover"
                fallbackTitle="Bamaina Bright Academy Campus"
              />
            </div>
          </div>
          <div className="lg:col-span-6 space-y-4">
            <p className="text-xs font-semibold text-amber-700 tracking-wide">
              Principal Welcome Message
            </p>
            <h2
              className="font-display font-bold text-2xl sm:text-3xl text-blue-950 leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {settings.welcomeTitle}
            </h2>
            <p className="text-slate-600 leading-relaxed">{settings.welcomeMessage}</p>
            <p className="text-slate-600 leading-relaxed">
              We partner closely with parents across Bamaina Town and Birnin Kudu Local Government Area to nurture curiosity, academic diligence, confidence, and strong moral character in every child.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 hover:text-blue-950"
              >
                <span>Read our full Vision & Mission</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Bamaina Bright Academy */}
      <section className="py-14 lg:py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-blue-800 mb-2">
              Our Commitment to Families
            </p>
            <h2
              className="font-display font-bold text-2xl sm:text-3xl text-blue-950"
              style={{ textWrap: 'balance' }}
            >
              Why Choose Bamaina Bright Academy?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_CHOOSE_ITEMS.map((item) => (
              <div
                key={item.num}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-amber-600">
                    {item.num}.
                  </span>
                  <h3 className="font-display font-semibold text-base text-blue-950 mt-2 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Programmes */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-2">
                Foundational Curriculum
              </p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-blue-950">
                Academic Programmes
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('academics')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 hover:text-blue-950 whitespace-nowrap"
            >
              <span>View full curriculum & calendar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Nursery School */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col">
              <div className="aspect-[16/9] overflow-hidden bg-blue-900">
                <SafeImage
                  src="/src/assets/images/nursery_learning_play_1795434531453.jpg"
                  alt="Nursery school early childhood learning through play"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                    <span>Early Childhood Division</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeNursery.map((c) => c.name).join(', ') || 'Nursery'}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-blue-950 mb-3">
                    Nursery School
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-700 mb-6">
                    <li>· Early childhood education</li>
                    <li>· Basic literacy and numeracy</li>
                    <li>· Language development</li>
                    <li>· Creative activities</li>
                    <li>· Social and emotional development</li>
                    <li>· Learning through play</li>
                  </ul>
                  {nurserySubjects.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Core focus: {nurserySubjects.map((s) => s.name).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="pt-5 mt-5 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigate('admissions')}
                    className="text-sm font-semibold text-blue-800 hover:text-blue-950 inline-flex items-center gap-1"
                  >
                    <span>Apply for Nursery</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Primary School */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col">
              <div className="aspect-[16/9] overflow-hidden bg-blue-900">
                <SafeImage
                  src="/src/assets/images/primary_computer_science_1795434533097.jpg"
                  alt="Primary school pupils studying science and computer education"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                    <span>Primary Division</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activePrimary.length > 0
                        ? `${activePrimary[0].name} – ${activePrimary[activePrimary.length - 1].name}`
                        : 'Primary 1 – 6'}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-blue-950 mb-3">
                    Primary School
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-700 mb-6">
                    <li>· English Language</li>
                    <li>· Mathematics</li>
                    <li>· Basic Science and Technology</li>
                    <li>· Social and civic education</li>
                    <li>· Computer education</li>
                    <li>· Religious and moral education</li>
                    <li>· Creative arts</li>
                    <li>· Approved curriculum subjects</li>
                  </ul>
                  {primarySubjects.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {primarySubjects.length} active curriculum subjects configured
                    </p>
                  )}
                </div>
                <div className="pt-5 mt-5 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigate('admissions')}
                    className="text-sm font-semibold text-blue-800 hover:text-blue-950 inline-flex items-center gap-1"
                  >
                    <span>Apply for Primary</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parent Testimonials */}
      <section className="py-14 lg:py-20 bg-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-amber-300 mb-2">
              Community Voices
            </p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Parent Experiences & Feedback
            </h2>
          </div>

          {testimonials.length === 0 ? (
            <div className="border border-blue-800 rounded-xl p-8 bg-blue-900/40 text-blue-100 text-sm">
              Verified parent testimonials published by school administration will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="bg-blue-900/60 border border-blue-800 rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <Quote className="w-6 h-6 text-amber-400 mb-3" />
                    <p className="text-sm sm:text-base text-blue-50 leading-relaxed mb-5">
                      “{t.quote}”
                    </p>
                  </div>
                  <div className="pt-4 border-t border-blue-800/80 text-xs">
                    <p className="font-semibold text-white">{t.parentName}</p>
                    <p className="text-blue-200/80 mt-0.5">
                      {t.parentRole}
                      {t.isDemo ? ' · Sample Demo Record' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest News and Announcements */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-2">
                School Updates
              </p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-blue-950">
                Latest News & Announcements
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('news')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 hover:text-blue-950 whitespace-nowrap"
            >
              <span>All News & Events</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.slice(0, 3).map((item) => (
              <article
                key={item.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col justify-between hover:border-blue-300 transition-colors"
              >
                <div>
                  {item.imageUrl && (
                    <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                      <SafeImage
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="font-semibold text-blue-800">{item.category}</span>
                      {item.eventDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {item.eventDate}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-lg text-blue-950 mb-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                  </div>
                </div>
                <div className="px-6 pb-5">
                  <button
                    type="button"
                    onClick={() => setSelectedNews(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 hover:text-blue-950"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read full notice</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* News Reader Modal */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-blue-800">{selectedNews.category}</span>
                {selectedNews.eventDate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{selectedNews.eventDate}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                aria-label="Close notice"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedNews.imageUrl && (
                <div className="aspect-[16/9] rounded-lg overflow-hidden">
                  <SafeImage
                    src={selectedNews.imageUrl}
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-display font-bold text-2xl text-blue-950">
                {selectedNews.title}
              </h3>
              {selectedNews.location && (
                <p className="text-xs font-medium text-slate-500">
                  Location: {selectedNews.location}
                </p>
              )}
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedNews.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
