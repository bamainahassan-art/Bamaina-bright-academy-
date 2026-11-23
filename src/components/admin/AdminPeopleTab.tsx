import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AppUser, SchoolClass, StudentRecord, SubjectItem, UserRole } from '../../lib/types';

interface AdminPeopleTabProps {
  role: UserRole;
  classes: SchoolClass[];
  subjects: SubjectItem[];
  onChanged: () => void;
}

interface TeacherAssignmentRow {
  id: number;
  teacherUserId: number;
  classId: number;
  className: string;
  subjectId: number | null;
  subjectName: string | null;
}

export function AdminPeopleTab({
  role,
  classes,
  subjects,
  onChanged,
}: AdminPeopleTabProps) {
  const { apiFetch } = useAuth();
  const [subTab, setSubTab] = useState<'students' | 'staff'>('students');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  // New student form
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [stuName, setStuName] = useState('');
  const [stuDob, setStuDob] = useState('');
  const [stuGender, setStuGender] = useState<'Male' | 'Female'>('Male');
  const [stuClassId, setStuClassId] = useState<number>(classes[0]?.id || 1);
  const [stuAddress, setStuAddress] = useState('');
  const [stuGuardName, setStuGuardName] = useState('');
  const [stuGuardPhone, setStuGuardPhone] = useState('');
  const [stuGuardEmail, setStuGuardEmail] = useState('');
  const [stuCreateLogin, setStuCreateLogin] = useState(false);
  const [stuPassword, setStuPassword] = useState('');

  // New staff / user account form
  const [showAddUser, setShowAddUser] = useState(false);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<UserRole>('teacher');
  const [uPhone, setUPhone] = useState('');
  const [uStaffId, setUStaffId] = useState('');
  const [uPassword, setUPassword] = useState('');

  // Teacher assignment form
  const [assignTeacherId, setAssignTeacherId] = useState<number>(0);
  const [assignClassId, setAssignClassId] = useState<number>(classes[0]?.id || 1);
  const [assignSubjectId, setAssignSubjectId] = useState<number>(subjects[0]?.id || 0);

  const canManageStudents = role === 'super_admin' || role === 'headteacher';
  const canManageUsers = role === 'super_admin';

  const load = useCallback(async () => {
    const stuData = await apiFetch<StudentRecord[]>('/api/admin/students');
    setStudents(stuData);
    if (role === 'super_admin' || role === 'headteacher') {
      const usrData = await apiFetch<{
        users: AppUser[];
        teacherAssignments: TeacherAssignmentRow[];
      }>('/api/admin/users');
      setUsersList(usrData.users);
      setTeacherAssignments(usrData.teacherAssignments);
      const firstTeacher = usrData.users.find((u) => u.role === 'teacher');
      if (firstTeacher) setAssignTeacherId((p) => p || firstTeacher.id);
    }
  }, [apiFetch, role]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiFetch('/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName: stuName,
          dateOfBirth: stuDob,
          gender: stuGender,
          classId: Number(stuClassId),
          residentialAddress: stuAddress,
          guardianName: stuGuardName,
          guardianPhone: stuGuardPhone,
          guardianEmail: stuGuardEmail,
          createPortalLogin: stuCreateLogin,
          portalPassword: stuPassword || undefined,
        }),
      });
      setShowAddStudent(false);
      setStuName('');
      setStuDob('');
      setStuAddress('');
      setStuGuardName('');
      setStuGuardPhone('');
      setStuGuardEmail('');
      setStuPassword('');
      setMsg('Student registered successfully.');
      await load();
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to register student.');
    }
  };

  const handleUpdateStudentStatus = async (id: number, status: string) => {
    await apiFetch(`/api/admin/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: uName,
          email: uEmail,
          role: uRole,
          phone: uPhone,
          staffOrAdmissionId: uStaffId,
          password: uPassword,
        }),
      });
      setShowAddUser(false);
      setUName('');
      setUEmail('');
      setUPhone('');
      setUStaffId('');
      setUPassword('');
      setMsg('User account created successfully.');
      await load();
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to create user.');
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherId || !assignClassId) return;
    await apiFetch('/api/admin/teacher-assignments', {
      method: 'POST',
      body: JSON.stringify({
        teacherUserId: assignTeacherId,
        classId: assignClassId,
        subjectId: assignSubjectId || null,
      }),
    });
    setMsg('Teacher assignment added.');
    await load();
  };

  const handleRemoveAssignment = async (id: number) => {
    await apiFetch(`/api/admin/teacher-assignments/${id}`, { method: 'DELETE' });
    await load();
  };

  const handleToggleUserActive = async (u: AppUser) => {
    await apiFetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await load();
  };

  const handleChangeUserRole = async (u: AppUser, newRole: UserRole) => {
    await apiFetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    });
    await load();
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );

  const teachersList = usersList.filter((u) => u.role === 'teacher');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('students')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
              subTab === 'students' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
            }`}
          >
            Students ({students.length})
          </button>
          {(role === 'super_admin' || role === 'headteacher') && (
            <button
              type="button"
              onClick={() => setSubTab('staff')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md ${
                subTab === 'staff' ? 'bg-white text-blue-950 shadow-xs' : 'text-slate-600'
              }`}
            >
              Teachers & Accounts ({usersList.length})
            </button>
          )}
        </div>

        {subTab === 'students' && canManageStudents && (
          <button
            type="button"
            onClick={() => setShowAddStudent((p) => !p)}
            className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register Student</span>
          </button>
        )}

        {subTab === 'staff' && canManageUsers && (
          <button
            type="button"
            onClick={() => setShowAddUser((p) => !p)}
            className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Staff / User Account</span>
          </button>
        )}
      </div>

      {msg && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          {msg}
        </div>
      )}

      {subTab === 'students' ? (
        <div className="space-y-5">
          {showAddStudent && canManageStudents && (
            <form
              onSubmit={handleCreateStudent}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="font-display font-bold text-base text-blue-950">
                Register New Pupil
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={stuName}
                  onChange={(e) => setStuName(e.target.value)}
                  placeholder="Student Full Name *"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="date"
                  required
                  value={stuDob}
                  onChange={(e) => setStuDob(e.target.value)}
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <select
                  value={stuGender}
                  onChange={(e) => setStuGender(e.target.value as 'Male' | 'Female')}
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <select
                  value={stuClassId}
                  onChange={(e) => setStuClassId(Number(e.target.value))}
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={stuAddress}
                  onChange={(e) => setStuAddress(e.target.value)}
                  placeholder="Residential Address *"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm sm:col-span-2"
                />
                <input
                  type="text"
                  required
                  value={stuGuardName}
                  onChange={(e) => setStuGuardName(e.target.value)}
                  placeholder="Parent / Guardian Name *"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="tel"
                  required
                  value={stuGuardPhone}
                  onChange={(e) => setStuGuardPhone(e.target.value)}
                  placeholder="Guardian Phone *"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="email"
                  value={stuGuardEmail}
                  onChange={(e) => setStuGuardEmail(e.target.value)}
                  placeholder="Guardian Email (auto-links parent)"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={stuCreateLogin}
                    onChange={(e) => setStuCreateLogin(e.target.checked)}
                  />
                  <span>Create Student Portal Login</span>
                </label>
                {stuCreateLogin && (
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={stuPassword}
                    onChange={(e) => setStuPassword(e.target.value)}
                    placeholder="Initial student password"
                    className="min-h-[40px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-blue-900 text-white rounded-lg"
                >
                  Save Student Record
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student by name or admission number..."
                className="min-h-[40px] px-3.5 py-2 border border-slate-300 rounded-lg text-sm w-full sm:max-w-sm"
              />
              <span className="text-xs text-slate-500">
                Showing {filteredStudents.length} pupils
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Admission No</th>
                    <th className="px-4 py-3 font-semibold">Full Name</th>
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 font-semibold">Guardian</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-900">
                        {stu.admissionNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {stu.fullName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{stu.className || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {stu.guardianName} · {stu.guardianPhone}
                      </td>
                      <td className="px-4 py-3">
                        {canManageStudents ? (
                          <select
                            value={stu.status}
                            onChange={(e) => handleUpdateStudentStatus(stu.id, e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="Active">Active</option>
                            <option value="Graduated">Graduated</option>
                            <option value="Withdrawn">Withdrawn</option>
                            <option value="Suspended">Suspended</option>
                          </select>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700">
                            {stu.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Staff & User Accounts + Teacher Assignments */
        <div className="space-y-6">
          {showAddUser && canManageUsers && (
            <form
              onSubmit={handleCreateUser}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="font-display font-bold text-base text-blue-950">
                Create New Staff, Parent, or Student Account
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  placeholder="Full Name *"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  placeholder="Email Address *"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <select
                  value={uRole}
                  onChange={(e) => setURole(e.target.value as UserRole)}
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="teacher">Teacher</option>
                  <option value="headteacher">Headteacher</option>
                  <option value="accountant">Accountant</option>
                  <option value="parent">Parent</option>
                  <option value="student">Student</option>
                  <option value="super_admin">Super Administrator</option>
                </select>
                <input
                  type="tel"
                  value={uPhone}
                  onChange={(e) => setUPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={uStaffId}
                  onChange={(e) => setUStaffId(e.target.value)}
                  placeholder="Staff ID (e.g. BBA/STF/002)"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  placeholder="Password (min 6 chars) *"
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-blue-900 text-white rounded-lg"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Teacher Class & Subject Assignment */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-blue-950">
              Assign Teachers to Classes & Subjects
            </h3>
            <form onSubmit={handleAssignTeacher} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(Number(e.target.value))}
                className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
              <select
                value={assignClassId}
                onChange={(e) => setAssignClassId(Number(e.target.value))}
                className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={assignSubjectId}
                onChange={(e) => setAssignSubjectId(Number(e.target.value))}
                className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value={0}>All Subjects in Class</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 text-xs font-semibold bg-blue-900 text-white rounded-lg"
              >
                Assign Teacher
              </button>
            </form>

            <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
              {teacherAssignments.map((a) => {
                const teacher = usersList.find((u) => u.id === a.teacherUserId);
                return (
                  <div
                    key={a.id}
                    className="py-2.5 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <span>
                      <strong>{teacher?.fullName || 'Teacher'}</strong> · {a.className} ·{' '}
                      {a.subjectName || 'All Subjects'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(a.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      aria-label="Remove assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All Users Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {u.fullName}
                        {u.isDemo ? ' [DEMO]' : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        {canManageUsers ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeUserRole(u, e.target.value as UserRole)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="super_admin">super_admin</option>
                            <option value="headteacher">headteacher</option>
                            <option value="accountant">accountant</option>
                            <option value="teacher">teacher</option>
                            <option value="parent">parent</option>
                            <option value="student">student</option>
                          </select>
                        ) : (
                          <span className="text-xs font-mono">{u.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canManageUsers ? (
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u)}
                            className={`text-xs font-semibold ${
                              u.isActive ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {u.isActive ? 'Active (Click to disable)' : 'Inactive'}
                          </button>
                        ) : (
                          <span className="text-xs">{u.isActive ? 'Active' : 'Inactive'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
