import { useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, ClipboardCheck, GraduationCap } from 'lucide-react';
import type { PublicBootstrap } from '../lib/types';
import type { PageRoute } from '../components/Navbar';

interface AcademicsPageProps {
  data: PublicBootstrap;
  onNavigate: (page: PageRoute) => void;
}

export function AcademicsPage({ data, onNavigate }: AcademicsPageProps) {
  const [sectionTab, setSectionTab] = useState<'all' | 'Nursery' | 'Primary'>('all');
  const { classes, subjects, calendar, currentSession, currentTerm } = data;

  const nurseryClasses = classes.filter((c) => c.section === 'Nursery');
  const primaryClasses = classes.filter((c) => c.section === 'Primary');

  const filteredSubjects = subjects.filter((s) =>
    sectionTab === 'all' ? true : s.section === sectionTab || s.section === 'Both'
  );

  return (
    <div className="bg-white">
      <section className="bg-blue-950 text-white py-14 border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-amber-300 mb-2">
            Academics & Curriculum · {currentSession?.name || 'Current Session'}
            {currentTerm ? ` · ${currentTerm.name}` : ''}
          </p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white mb-4">
            Nursery & Primary Academic Structure
          </h1>
          <p className="text-blue-100 max-w-2xl leading-relaxed">
            Our curriculum builds strong foundational literacy, numeracy, scientific curiosity, digital awareness, and moral character from early childhood through Primary Six.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        {/* Nursery & Primary Class Divisions */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border border-slate-200 rounded-xl p-6 sm:p-8 bg-blue-50/40">
            <div className="flex items-center gap-2.5 mb-4">
              <GraduationCap className="w-5 h-5 text-blue-800" />
              <h2 className="font-display font-bold text-xl text-blue-950">
                Nursery Section
              </h2>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Early childhood learning centred on phonics, foundational numeracy, language confidence, creative play, and caring social habits.
            </p>
            <div className="space-y-3">
              {nurseryClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <h3 className="font-display font-semibold text-blue-950 text-sm sm:text-base">
                      {cls.name}
                    </h3>
                    {cls.description && (
                      <p className="text-xs text-slate-600 mt-1">{cls.description}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      cls.isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {cls.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-6 sm:p-8 bg-white">
            <div className="flex items-center gap-2.5 mb-4">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <h2 className="font-display font-bold text-xl text-blue-950">
                Primary Section
              </h2>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Comprehensive primary education covering English, Mathematics, Science & Technology, Civic Education, Computer Studies, Moral Education, and Creative Arts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {primaryClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold text-blue-950 text-sm">
                      {cls.name}
                    </h3>
                    <span
                      className={`text-xs font-medium ${
                        cls.isActive ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {cls.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {cls.description && (
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {cls.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subjects Offered */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display font-bold text-2xl text-blue-950">
                Subjects Offered
              </h2>
              <p className="text-sm text-slate-600">
                Approved curriculum subjects taught across Nursery and Primary classes.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              {(['all', 'Nursery', 'Primary'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSectionTab(tab)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    sectionTab === tab
                      ? 'bg-white text-blue-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all' ? 'All Sections' : `${tab} Section`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((sub) => (
              <div
                key={sub.id}
                className="border border-slate-200 rounded-lg px-4 py-3.5 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm text-blue-950">{sub.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sub.section === 'Both' ? 'Nursery & Primary' : `${sub.section} Level`}
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500">{sub.code}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Teaching, Assessment, Homework & Examination Information */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-lg text-blue-950">
              Teaching & Learning Methods
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>Child-centred phonics, guided reading circles, and interactive storytelling in Nursery classes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>Structured direct instruction, visual problem solving, and practical computer/science demonstrations in Primary classes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>Small-group reinforcement for pupils needing extra literacy or numeracy support.</span>
              </li>
            </ul>
          </div>

          <div className="border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
              <h3 className="font-display font-bold text-lg text-blue-950">
                Assessment & Examination System
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every termly grade combines <strong>40% Continuous Assessment (CA)</strong>—classwork, homework, and mid-term tests—with <strong>60% End-of-Term Examination</strong> for a total of 100 marks.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono tabular-nums">
              <div className="border border-slate-200 rounded p-2 text-center">A: 75–100</div>
              <div className="border border-slate-200 rounded p-2 text-center">B: 65–74</div>
              <div className="border border-slate-200 rounded p-2 text-center">C: 50–64</div>
              <div className="border border-slate-200 rounded p-2 text-center">D: 45–49</div>
              <div className="border border-slate-200 rounded p-2 text-center">E: 40–44</div>
              <div className="border border-slate-200 rounded p-2 text-center">F: 0–39</div>
            </div>
          </div>
        </section>

        {/* Academic Calendar & Homework Portal Link */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-800" />
              <h3 className="font-display font-bold text-base text-blue-950">
                Academic Calendar & Term Milestones
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {calendar.map((cal) => (
                <div
                  key={cal.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-sm text-blue-950">{cal.title}</p>
                    {cal.description && (
                      <p className="text-xs text-slate-600 mt-0.5">{cal.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 sm:text-right shrink-0">
                    <span className="font-semibold text-blue-800">{cal.termName}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{cal.eventDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 border border-slate-200 rounded-xl p-6 bg-blue-950 text-white space-y-4">
            <h3 className="font-display font-bold text-lg">
              Homework, Assignments & Results
            </h3>
            <p className="text-sm text-blue-100 leading-relaxed">
              Enrolled pupils and parents can sign in to the School Portal to view class homework, download learning materials, and check approved termly report cards.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full min-h-[44px] px-4 py-2.5 text-sm font-semibold bg-amber-400 text-slate-950 rounded-lg hover:bg-amber-300"
            >
              Open Student & Parent Portal
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
