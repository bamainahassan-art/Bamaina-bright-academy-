import React, { useCallback, useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type {
  CalendarItem,
  SchoolClass,
  SessionItem,
  SubjectItem,
  TermItem,
  UserRole,
} from '../../lib/types';

interface AcademicsPayload {
  classes: SchoolClass[];
  subjects: SubjectItem[];
  sessions: SessionItem[];
  terms: TermItem[];
  calendar: CalendarItem[];
  assignments: Array<{
    id: number;
    className: string | null;
    subjectName: string | null;
    title: string;
    type: string;
    dueDate: string | null;
  }>;
}

interface ScoreSheetRow {
  studentId: number;
  fullName: string;
  admissionNumber: string;
  isDemo: boolean;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  remark: string;
  approvedByHeadteacher: boolean;
  daysPresent: number;
  daysOpened: number;
  teacherRemark: string;
  headteacherRemark: string;
}

export function AdminAcademicsTab({
  role,
  onChanged,
}: {
  role: UserRole;
  onChanged: () => void;
}) {
  const { apiFetch } = useAuth();
  const [subTab, setSubTab] = useState<'results' | 'assignments' | 'structure'>('results');
  const [acad, setAcad] = useState<AcademicsPayload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Results entry controls
  const [sessionId, setSessionId] = useState<number>(0);
  const [termId, setTermId] = useState<number>(0);
  const [classId, setClassId] = useState<number>(0);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [sheet, setSheet] = useState<ScoreSheetRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);

  // Assignment form
  const [asgClassId, setAsgClassId] = useState<number>(0);
  const [asgSubjectId, setAsgSubjectId] = useState<number>(0);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgType, setAsgType] = useState('Assignment');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgDue, setAsgDue] = useState('');

  // Structure forms
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubSection, setNewSubSection] = useState('Primary');
  const [newSessName, setNewSessName] = useState('');
  const [calTitle, setCalTitle] = useState('');
  const [calTerm, setCalTerm] = useState('First Term');
  const [calDate, setCalDate] = useState('');

  const isLeader = role === 'super_admin' || role === 'headteacher';

  const loadAcademics = useCallback(async () => {
    const data = await apiFetch<AcademicsPayload>('/api/admin/academics');
    setAcad(data);
    const curS = data.sessions.find((s) => s.isCurrent) || data.sessions[0];
    if (curS) {
      setSessionId((p) => p || curS.id);
      const curT = data.terms.find((t) => t.isCurrent && t.sessionId === curS.id) || data.terms[0];
      if (curT) setTermId((p) => p || curT.id);
    }
    const defaultClass = data.classes.find((c) => c.name === 'Primary Four') || data.classes[0];
    if (defaultClass) {
      setClassId((p) => p || defaultClass.id);
      setAsgClassId((p) => p || defaultClass.id);
    }
    if (data.subjects[0]) {
      setSubjectId((p) => p || data.subjects[0].id);
      setAsgSubjectId((p) => p || data.subjects[0].id);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadAcademics();
  }, [loadAcademics]);

  const loadSheet = useCallback(async () => {
    if (!sessionId || !termId || !classId || !subjectId) return;
    setLoadingSheet(true);
    setMsg(null);
    try {
      const rows = await apiFetch<ScoreSheetRow[]>(
        `/api/admin/results/sheet?sessionId=${sessionId}&termId=${termId}&classId=${classId}&subjectId=${subjectId}`
      );
      setSheet(rows);
    } catch (err) {
      setSheet([]);
      setMsg(err instanceof Error ? err.message : 'Unable to load class results sheet.');
    } finally {
      setLoadingSheet(false);
    }
  }, [apiFetch, sessionId, termId, classId, subjectId]);

  useEffect(() => {
    if (subTab === 'results' && sessionId && termId && classId && subjectId) {
      loadSheet();
    }
  }, [subTab, sessionId, termId, classId, subjectId, loadSheet]);

  const updateRowField = (studentId: number, field: keyof ScoreSheetRow, value: number | string | boolean) => {
    setSheet((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const next = { ...row, [field]: value };
        if (field === 'caScore' || field === 'examScore') {
          const total = Number(next.caScore) + Number(next.examScore);
          next.totalScore = total;
          next.grade =
            total >= 75 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : total >= 45 ? 'D' : total >= 40 ? 'E' : 'F';
        }
        return next;
      })
    );
  };

  const handleSaveRow = async (row: ScoreSheetRow) => {
    setMsg(null);
    try {
      await apiFetch('/api/admin/results/save', {
        method: 'POST',
        body: JSON.stringify({
          studentId: row.studentId,
          classId,
          sessionId,
          termId,
          subjectId,
          caScore: Number(row.caScore),
          examScore: Number(row.examScore),
          approvedByHeadteacher: row.approvedByHeadteacher,
        }),
      });
      await apiFetch('/api/admin/results/meta', {
        method: 'POST',
        body: JSON.stringify({
          studentId: row.studentId,
          classId,
          sessionId,
          termId,
          daysPresent: Number(row.daysPresent),
          daysOpened: Number(row.daysOpened),
          teacherRemark: row.teacherRemark,
          headteacherRemark: row.headteacherRemark,
          approved: row.approvedByHeadteacher,
        }),
      });
      setMsg(`Saved scores and remarks for ${row.fullName}.`);
      await loadSheet();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to save score.');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiFetch('/api/admin/assignments', {
        method: 'POST',
        body: JSON.stringify({
          classId: asgClassId,
          subjectId: asgSubjectId || null,
          title: asgTitle,
          type: asgType,
          description: asgDesc,
          dueDate: asgDue,
        }),
      });
      setAsgTitle('');
      setAsgDesc('');
      setAsgDue('');
      setMsg('Assignment / learning material posted to Student Portal.');
      await loadAcademics();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to post assignment.');
    }
  };

  const handleToggleClass = async (cls: SchoolClass) => {
    await apiFetch(`/api/admin/classes/${cls.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !cls.isActive }),
    });
    await loadAcademics();
    onChanged();
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/subjects', {
      method: 'POST',
      body: JSON.stringify({ name: newSubName, code: newSubCode, section: newSubSection }),
    });
    setNewSubName('');
    setNewSubCode('');
    await loadAcademics();
    onChanged();
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: newSessName }),
    });
    setNewSessName('');
    await loadAcademics();
    onChanged();
  };

  const handleAddCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/calendar', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        termName: calTerm,
        title: calTitle,
        eventDate: calDate,
      }),
    });
    setCalTitle('');
    setCalDate('');
    await loadAcademics();
    onChanged();
  };

  if (!acad) return <div className="p-6 text-sm text-slate-500">Loading academic module...</div>;

  return (
    <div className="space-y-6">
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => setSubTab('results')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
            subTab === 'results' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
          }`}
        >
          Results Entry & Approval
        </button>
        <button
          type="button"
          onClick={() => setSubTab('assignments')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
            subTab === 'assignments' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
          }`}
        >
          Homework & Learning Materials
        </button>
        {isLeader && (
          <button
            type="button"
            onClick={() => setSubTab('structure')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
              subTab === 'structure' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
            }`}
          >
            Classes, Sessions & Calendar
          </button>
        )}
      </div>

      {msg && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          {msg}
        </div>
      )}

      {subTab === 'results' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-display font-bold text-lg text-blue-950">
              Continuous Assessment & Examination Score Entry
            </h2>
            <p className="text-xs text-slate-500">
              CA (max 40) + Exam (max 60) automatically computes Total (100) and Grade (A–F).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={sessionId}
              onChange={(e) => setSessionId(Number(e.target.value))}
              className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {acad.sessions.map((s) => (
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
              {acad.terms
                .filter((t) => t.sessionId === sessionId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            <select
              value={classId}
              onChange={(e) => setClassId(Number(e.target.value))}
              className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {acad.classes.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(Number(e.target.value))}
              className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {acad.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {loadingSheet ? (
            <p className="text-sm text-slate-500">Loading class scores...</p>
          ) : sheet.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              No students found in this class (or you are not assigned to this class).
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Student</th>
                    <th className="px-3 py-3 font-semibold">CA /40</th>
                    <th className="px-3 py-3 font-semibold">Exam /60</th>
                    <th className="px-3 py-3 font-semibold text-center">Total / Grade</th>
                    <th className="px-3 py-3 font-semibold">Attendance</th>
                    <th className="px-3 py-3 font-semibold">Teacher Remark</th>
                    {isLeader && <th className="px-3 py-3 font-semibold">Approve</th>}
                    <th className="px-3 py-3 font-semibold text-right">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 tabular-nums">
                  {sheet.map((row) => (
                    <tr key={row.studentId}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="font-mono text-xs text-slate-500">{row.admissionNumber}</p>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={row.caScore}
                          onChange={(e) =>
                            updateRowField(row.studentId, 'caScore', Number(e.target.value))
                          }
                          className="w-16 px-2 py-1.5 border border-slate-300 rounded text-right"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={row.examScore}
                          onChange={(e) =>
                            updateRowField(row.studentId, 'examScore', Number(e.target.value))
                          }
                          className="w-16 px-2 py-1.5 border border-slate-300 rounded text-right"
                        />
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-blue-950">
                        {row.totalScore} ({row.grade})
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={row.daysPresent}
                            onChange={(e) =>
                              updateRowField(row.studentId, 'daysPresent', Number(e.target.value))
                            }
                            className="w-12 px-1.5 py-1 border border-slate-300 rounded text-right"
                            title="Days Present"
                          />
                          <span>/</span>
                          <input
                            type="number"
                            min={0}
                            value={row.daysOpened}
                            onChange={(e) =>
                              updateRowField(row.studentId, 'daysOpened', Number(e.target.value))
                            }
                            className="w-12 px-1.5 py-1 border border-slate-300 rounded text-right"
                            title="Days Opened"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={row.teacherRemark}
                          onChange={(e) =>
                            updateRowField(row.studentId, 'teacherRemark', e.target.value)
                          }
                          placeholder="Teacher comment"
                          className="w-40 px-2 py-1.5 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      {isLeader && (
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.approvedByHeadteacher}
                            onChange={(e) =>
                              updateRowField(
                                row.studentId,
                                'approvedByHeadteacher',
                                e.target.checked
                              )
                            }
                          />
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-800"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateAssignment}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display font-bold text-base text-blue-950">
              Post Assignment or Learning Material
            </h3>
            <select
              value={asgClassId}
              onChange={(e) => setAsgClassId(Number(e.target.value))}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {acad.classes.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={asgSubjectId}
              onChange={(e) => setAsgSubjectId(Number(e.target.value))}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {acad.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={asgType}
              onChange={(e) => setAsgType(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="Assignment">Homework / Assignment</option>
              <option value="Learning Material">Learning Material / Notes</option>
            </select>
            <input
              type="text"
              required
              value={asgTitle}
              onChange={(e) => setAsgTitle(e.target.value)}
              placeholder="Title *"
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={asgDue}
              onChange={(e) => setAsgDue(e.target.value)}
              placeholder="Due date (optional)"
              className="w-full min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <textarea
              rows={3}
              required
              value={asgDesc}
              onChange={(e) => setAsgDesc(e.target.value)}
              placeholder="Instructions or summary *"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg"
            >
              Publish to Portal
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-base text-blue-950 border-b border-slate-200 pb-2">
              Published Assignments & Materials
            </h3>
            <div className="divide-y divide-slate-200">
              {acad.assignments.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-blue-800 font-semibold">
                      {item.type} · {item.className} · {item.subjectName || 'General'}
                    </p>
                    <p className="font-medium text-sm text-slate-900">{item.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/assignments/${item.id}`, { method: 'DELETE' });
                      await loadAcademics();
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

      {subTab === 'structure' && isLeader && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activate / Deactivate Classes */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="font-display font-bold text-base text-blue-950">
              Class Activation (Nursery & Primary)
            </h3>
            <p className="text-xs text-slate-500">
              Activate or deactivate Nursery Three or any other class to match the school’s live structure.
            </p>
            <div className="divide-y divide-slate-200">
              {acad.classes.map((cls) => (
                <div key={cls.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{cls.name}</p>
                    <p className="text-xs text-slate-500">{cls.section} Section</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleClass(cls)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                      cls.isActive
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    {cls.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions, Terms, Subjects & Calendar */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-display font-bold text-base text-blue-950">
                Academic Sessions & Active Term
              </h3>
              <form onSubmit={handleAddSession} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newSessName}
                  onChange={(e) => setNewSessName(e.target.value)}
                  placeholder="New Session (e.g. 2026/2027)"
                  className="flex-1 min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-900 text-white rounded-lg"
                >
                  Add Session
                </button>
              </form>
              <div className="space-y-2">
                {acad.sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                    <span className="font-semibold">{s.name}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/sessions/${s.id}/current`, { method: 'PATCH' });
                        await loadAcademics();
                        onChanged();
                      }}
                      className={`text-xs font-semibold ${
                        s.isCurrent ? 'text-emerald-700' : 'text-blue-700 hover:underline'
                      }`}
                    >
                      {s.isCurrent ? 'Current Session' : 'Set Current'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {acad.terms
                  .filter((t) => t.sessionId === sessionId)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/terms/${t.id}/current`, { method: 'PATCH' });
                        await loadAcademics();
                        onChanged();
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                        t.isCurrent
                          ? 'bg-blue-900 border-blue-900 text-white'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      {t.name} {t.isCurrent ? '(Active)' : ''}
                    </button>
                  ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-display font-bold text-base text-blue-950">
                Add Subject or Calendar Event
              </h3>
              <form onSubmit={handleAddSubject} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="Subject Name"
                  className="sm:col-span-2 min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  required
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="Code"
                  className="min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-3 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-lg"
                >
                  Add Subject
                </button>
              </form>

              <form onSubmit={handleAddCalendar} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  required
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  placeholder="Calendar Event Title"
                  className="sm:col-span-2 min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  required
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                  placeholder="Date / Week"
                  className="min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-3 py-1.5 text-xs font-semibold bg-amber-400 text-slate-950 rounded-lg"
                >
                  Add Event
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
