import { ShieldCheck, Target, Compass, Users } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import type { PublicBootstrap } from '../lib/types';
import type { PageRoute } from '../components/Navbar';

interface AboutPageProps {
  data: PublicBootstrap;
  onNavigate: (page: PageRoute) => void;
}

const CORE_VALUES = [
  { name: 'Excellence', desc: 'Striving for consistent effort and mastery in reading, numeracy, and inquiry.' },
  { name: 'Discipline', desc: 'Cultivating punctuality, self-control, orderly habits, and focused classroom conduct.' },
  { name: 'Integrity', desc: 'Encouraging truthfulness, fairness, and moral courage in daily school life.' },
  { name: 'Respect', desc: 'Honouring teachers, parents, elders, classmates, and community heritage.' },
  { name: 'Creativity', desc: 'Inspiring curiosity through storytelling, drawing, music, and hands-on discovery.' },
  { name: 'Responsibility', desc: 'Teaching pupils to care for their books, classrooms, and shared school spaces.' },
  { name: 'Hard work', desc: 'Building resilience and steady study habits that prepare children for lifelong success.' },
];

export function AboutPage({ data, onNavigate }: AboutPageProps) {
  const { settings, leadership } = data;

  return (
    <div className="bg-white">
      {/* Header Banner */}
      <section className="bg-blue-950 text-white py-14 border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-semibold text-amber-300">
              About Bamaina Bright Academy · Birnin Kudu LGA, Jigawa State
            </p>
            <h1
              className="font-display font-bold text-3xl sm:text-4xl text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Building Bright Minds, Inspiring Great Futures.
            </h1>
            <p className="text-blue-100 leading-relaxed max-w-2xl">
              {settings.aboutHistory}
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="aspect-[16/10] rounded-xl overflow-hidden border border-blue-800">
              <SafeImage
                src="/src/assets/images/about_campus_courtyard_1795434565564.jpg"
                alt="Bamaina Bright Academy campus"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Vision, Mission & Educational Philosophy */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-slate-200 rounded-xl p-7 bg-blue-50/50">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-amber-300 flex items-center justify-center mb-4">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-xl text-blue-950 mb-3">
              Our Vision
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
              {settings.visionStatement}
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-7 bg-amber-50/50">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-xl text-blue-950 mb-3">
              Our Mission
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
              {settings.missionStatement}
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-7 bg-white">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-xl text-blue-950 mb-3">
              Educational Philosophy
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
              {settings.philosophyStatement}
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-14 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-semibold text-blue-800 mb-1">Character & Standards</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-blue-950">
              Our Seven Core Values
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CORE_VALUES.map((val, idx) => (
              <div
                key={val.name}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <span className="font-mono text-xs font-semibold text-amber-600">
                  0{idx + 1}.
                </span>
                <h3 className="font-display font-bold text-lg text-blue-950 mt-1 mb-2">
                  {val.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership & Management */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-blue-800 mb-1">Governance</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-blue-950">
              School Leadership & Management
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Leadership profiles are editable directly from the Administration Dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {leadership.map((leader) => (
            <div
              key={leader.id}
              className="border border-slate-200 rounded-xl p-6 bg-white flex items-start gap-4"
            >
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700">{leader.titleRole}</p>
                <h3 className="font-display font-bold text-lg text-blue-950 mt-0.5">
                  {leader.fullName}
                </h3>
                {leader.bio && (
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{leader.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Commitment to Academic Excellence */}
        <div className="mt-12 bg-blue-950 text-white rounded-xl p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <h3 className="font-display font-bold text-2xl">
              Commitment to Academic Excellence
            </h3>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              From early phonics and counting in Nursery One to full primary completion in Primary Six, every pupil receives regular assessment feedback, attentive teacher guidance, and transparent termly reporting for parents.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('academics')}
              className="px-5 py-3 text-sm font-semibold bg-white text-blue-950 rounded-lg hover:bg-blue-50"
            >
              View Academics
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admissions')}
              className="px-5 py-3 text-sm font-semibold bg-amber-400 text-slate-950 rounded-lg hover:bg-amber-300"
            >
              Apply for Admission
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
