import crypto from 'node:crypto';
import { Router } from 'express';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  academicCalendarItems,
  academicSessions,
  academicTerms,
  admissions,
  assignmentsAndMaterials,
  contactEnquiries,
  feeInvoices,
  feePayments,
  feeStructures,
  galleryItems,
  leadershipStaff,
  newsAndEvents,
  schoolClasses,
  schoolSettings,
  studentResults,
  students,
  subjects,
  teacherAssignments,
  termReportMeta,
  testimonials,
  users,
} from '../../db/schema.ts';
import { AuthRequest, hashPassword, requireAuth, requireRole, sanitizeUser } from '../auth.ts';

export const adminRouter = Router();

adminRouter.use(requireAuth);

function computeGradeAndRemark(total: number): { grade: string; remark: string } {
  if (total >= 75) return { grade: 'A', remark: 'Excellent' };
  if (total >= 65) return { grade: 'B', remark: 'Very Good' };
  if (total >= 50) return { grade: 'C', remark: 'Good' };
  if (total >= 45) return { grade: 'D', remark: 'Pass' };
  if (total >= 40) return { grade: 'E', remark: 'Fair' };
  return { grade: 'F', remark: 'Needs Improvement' };
}

async function recalculateInvoiceTotals(invoiceId: number) {
  const verifiedPayments = await db
    .select({ amount: feePayments.amount })
    .from(feePayments)
    .where(and(eq(feePayments.invoiceId, invoiceId), eq(feePayments.verificationStatus, 'Verified')));

  const totalPaid = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const invRows = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
  if (invRows.length === 0) return;

  const inv = invRows[0];
  const status = totalPaid <= 0 ? 'Unpaid' : totalPaid >= inv.amountDue ? 'Paid' : 'Partial';
  await db
    .update(feeInvoices)
    .set({ amountPaid: totalPaid, status })
    .where(eq(feeInvoices.id, invoiceId));
}

// 1. Dashboard overview (Staff roles)
adminRouter.get(
  '/dashboard',
  requireRole('super_admin', 'headteacher', 'accountant', 'teacher'),
  async (req: AuthRequest, res) => {
    try {
      const [
        allStudents,
        allUsers,
        allClasses,
        pendingAdmissions,
        allInvoices,
        recentPayments,
        recentAnnouncements,
        allEnquiries,
      ] = await Promise.all([
        db.select().from(students),
        db.select().from(users),
        db.select().from(schoolClasses).orderBy(asc(schoolClasses.levelOrder)),
        db.select().from(admissions).orderBy(desc(admissions.createdAt)),
        db.select().from(feeInvoices),
        db
          .select({
            payment: feePayments,
            studentName: students.fullName,
            admissionNumber: students.admissionNumber,
          })
          .from(feePayments)
          .innerJoin(students, eq(feePayments.studentId, students.id))
          .orderBy(desc(feePayments.paidAt))
          .limit(12),
        db.select().from(newsAndEvents).orderBy(desc(newsAndEvents.createdAt)).limit(6),
        db.select().from(contactEnquiries).orderBy(desc(contactEnquiries.createdAt)).limit(10),
      ]);

      const teachersCount = allUsers.filter((u) => u.role === 'teacher' && u.isActive).length;
      const activeClassesCount = allClasses.filter((c) => c.isActive).length;
      const pendingAdmCount = pendingAdmissions.filter(
        (a) => a.status === 'Submitted' || a.status === 'Under Review'
      ).length;

      const totalExpected = allInvoices.reduce((s, i) => s + i.amountDue, 0);
      const totalCollected = allInvoices.reduce((s, i) => s + i.amountPaid, 0);
      const totalOutstanding = Math.max(0, totalExpected - totalCollected);
      const fullyPaidInvoices = allInvoices.filter((i) => i.status === 'Paid').length;
      const outstandingInvoices = allInvoices.filter((i) => i.status !== 'Paid').length;

      res.json({
        role: req.appUser!.role,
        metrics: {
          totalStudents: allStudents.length,
          realStudents: allStudents.filter((s) => !s.isDemo).length,
          totalTeachers: teachersCount,
          activeClasses: activeClassesCount,
          pendingAdmissions: pendingAdmCount,
          totalExpected,
          totalCollected,
          totalOutstanding,
          fullyPaidInvoices,
          outstandingInvoices,
        },
        recentPayments: recentPayments.map((r) => ({
          ...r.payment,
          studentName: r.studentName,
          admissionNumber: r.admissionNumber,
        })),
        recentAnnouncements,
        pendingAdmissionsList: pendingAdmissions.slice(0, 6),
        enquiriesCount: allEnquiries.filter((e) => e.status === 'New').length,
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({ error: 'Unable to load dashboard metrics.' });
    }
  }
);

// 2. Admissions Management
adminRouter.get(
  '/admissions',
  requireRole('super_admin', 'headteacher'),
  async (_req, res) => {
    try {
      const rows = await db.select().from(admissions).orderBy(desc(admissions.createdAt));
      res.json(rows);
    } catch (error) {
      console.error('Fetch admissions error:', error);
      res.status(500).json({ error: 'Unable to load admissions.' });
    }
  }
);

adminRouter.patch(
  '/admissions/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '').trim();
      const adminNotes = String(req.body?.adminNotes || '').trim();
      const enrolStudent = Boolean(req.body?.enrolStudent);

      if (!['Submitted', 'Under Review', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid admission status.' });
      }

      const existingRows = await db.select().from(admissions).where(eq(admissions.id, id)).limit(1);
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Application not found.' });
      }
      const appRecord = existingRows[0];
      let admittedStudentId = appRecord.admittedStudentId;

      if (status === 'Approved' && enrolStudent && !admittedStudentId) {
        const year = new Date().getFullYear();
        const admNo = `BBA/${year}/${Math.floor(1000 + Math.random() * 9000)}`;

        // Link or create parent portal account if email supplied
        let parentUserId: number | null = null;
        if (appRecord.parentEmail) {
          const emailLower = appRecord.parentEmail.toLowerCase();
          const existingParent = await db
            .select()
            .from(users)
            .where(eq(users.email, emailLower))
            .limit(1);
          if (existingParent.length > 0) {
            parentUserId = existingParent[0].id;
          } else {
            const [newParent] = await db
              .insert(users)
              .values({
                uid: `local:${crypto.randomUUID()}`,
                email: emailLower,
                fullName: appRecord.parentFullName,
                role: 'parent',
                phone: appRecord.parentPhone,
                address: appRecord.parentAddress,
                isActive: true,
                isDemo: false,
              })
              .returning();
            parentUserId = newParent.id;
          }
        }

        const [newStudent] = await db
          .insert(students)
          .values({
            parentUserId,
            admissionNumber: admNo,
            fullName: appRecord.studentFullName,
            dateOfBirth: appRecord.dateOfBirth,
            gender: appRecord.gender,
            classId: appRecord.applyingClassId,
            residentialAddress: appRecord.studentAddress,
            guardianName: appRecord.parentFullName,
            guardianPhone: appRecord.parentPhone,
            guardianEmail: appRecord.parentEmail,
            passportDataUrl: appRecord.passportDataUrl,
            medicalNotes: appRecord.medicalInfo,
            emergencyContact: appRecord.emergencyContact,
            status: 'Active',
            isDemo: false,
          })
          .returning();

        admittedStudentId = newStudent.id;
      }

      const [updated] = await db
        .update(admissions)
        .set({
          status,
          adminNotes: adminNotes || null,
          admittedStudentId,
          updatedAt: new Date(),
        })
        .where(eq(admissions.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Update admission error:', error);
      res.status(500).json({ error: 'Unable to update admission application.' });
    }
  }
);

// 3. Student Management
adminRouter.get(
  '/students',
  requireRole('super_admin', 'headteacher', 'accountant', 'teacher'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.appUser!;
      let allowedClassIds: number[] | null = null;

      if (user.role === 'teacher') {
        const assigns = await db
          .select({ classId: teacherAssignments.classId })
          .from(teacherAssignments)
          .where(eq(teacherAssignments.teacherUserId, user.id));
        const classTeacherOf = await db
          .select({ id: schoolClasses.id })
          .from(schoolClasses)
          .where(eq(schoolClasses.classTeacherUserId, user.id));
        allowedClassIds = Array.from(
          new Set([...assigns.map((a) => a.classId), ...classTeacherOf.map((c) => c.id)])
        );
        if (allowedClassIds.length === 0) {
          return res.json([]);
        }
      }

      const rows = await db
        .select({
          student: students,
          className: schoolClasses.name,
          classSection: schoolClasses.section,
        })
        .from(students)
        .leftJoin(schoolClasses, eq(students.classId, schoolClasses.id))
        .where(
          allowedClassIds ? inArray(students.classId, allowedClassIds) : undefined
        )
        .orderBy(desc(students.createdAt));

      // Confidentiality: strip medicalNotes unless super_admin or headteacher
      const canSeeMedical = user.role === 'super_admin' || user.role === 'headteacher';
      res.json(
        rows.map((r) => ({
          ...r.student,
          medicalNotes: canSeeMedical ? r.student.medicalNotes : undefined,
          className: r.className,
          classSection: r.classSection,
        }))
      );
    } catch (error) {
      console.error('Fetch students error:', error);
      res.status(500).json({ error: 'Unable to load students.' });
    }
  }
);

const studentCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  admissionNumber: z.string().trim().max(50).optional().default(''),
  dateOfBirth: z.string().trim().min(4).max(30),
  gender: z.enum(['Male', 'Female']),
  classId: z.number().int().positive(),
  residentialAddress: z.string().trim().min(3).max(300),
  guardianName: z.string().trim().min(2).max(150),
  guardianPhone: z.string().trim().min(5).max(40),
  guardianEmail: z.string().trim().email().or(z.literal('')).optional().default(''),
  parentUserId: z.number().int().positive().nullable().optional(),
  createPortalLogin: z.boolean().optional().default(false),
  portalPassword: z.string().min(6).max(120).optional(),
  medicalNotes: z.string().trim().max(1000).optional().default(''),
  emergencyContact: z.string().trim().max(150).optional().default(''),
});

adminRouter.post(
  '/students',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const parsed = studentCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid student data' });
      }
      const d = parsed.data;
      const admNo =
        d.admissionNumber ||
        `BBA/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

      let studentUserId: number | null = null;
      if (d.createPortalLogin && d.portalPassword) {
        const studentEmail = `${admNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.bamainabright.local`;
        const [u] = await db
          .insert(users)
          .values({
            uid: `local:${crypto.randomUUID()}`,
            email: studentEmail,
            fullName: d.fullName,
            role: 'student',
            staffOrAdmissionId: admNo,
            passwordHash: hashPassword(d.portalPassword),
            isActive: true,
            isDemo: false,
          })
          .returning();
        studentUserId = u.id;
      }

      let resolvedParentId = d.parentUserId ?? null;
      if (!resolvedParentId && d.guardianEmail) {
        const pRows = await db
          .select()
          .from(users)
          .where(eq(users.email, d.guardianEmail.toLowerCase()))
          .limit(1);
        if (pRows.length > 0) resolvedParentId = pRows[0].id;
      }

      const [created] = await db
        .insert(students)
        .values({
          userId: studentUserId,
          parentUserId: resolvedParentId,
          admissionNumber: admNo,
          fullName: d.fullName,
          dateOfBirth: d.dateOfBirth,
          gender: d.gender,
          classId: d.classId,
          residentialAddress: d.residentialAddress,
          guardianName: d.guardianName,
          guardianPhone: d.guardianPhone,
          guardianEmail: d.guardianEmail || null,
          medicalNotes: d.medicalNotes || null,
          emergencyContact: d.emergencyContact || null,
          status: 'Active',
          isDemo: false,
        })
        .returning();

      res.status(201).json(created);
    } catch (error) {
      console.error('Create student error:', error);
      res.status(500).json({ error: 'Unable to register student.' });
    }
  }
);

adminRouter.patch(
  '/students/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body || {};
      const [updated] = await db
        .update(students)
        .set({
          fullName: body.fullName,
          classId: body.classId ? Number(body.classId) : undefined,
          status: body.status,
          residentialAddress: body.residentialAddress,
          guardianName: body.guardianName,
          guardianPhone: body.guardianPhone,
          guardianEmail: body.guardianEmail,
          parentUserId:
            body.parentUserId === null
              ? null
              : body.parentUserId
                ? Number(body.parentUserId)
                : undefined,
        })
        .where(eq(students.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Student not found.' });
      res.json(updated);
    } catch (error) {
      console.error('Update student error:', error);
      res.status(500).json({ error: 'Unable to update student.' });
    }
  }
);

// 4. User & Teacher Management
adminRouter.get(
  '/users',
  requireRole('super_admin', 'headteacher'),
  async (_req, res) => {
    try {
      const [allUsers, assigns] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db
          .select({
            id: teacherAssignments.id,
            teacherUserId: teacherAssignments.teacherUserId,
            classId: teacherAssignments.classId,
            className: schoolClasses.name,
            subjectId: teacherAssignments.subjectId,
            subjectName: subjects.name,
          })
          .from(teacherAssignments)
          .innerJoin(schoolClasses, eq(teacherAssignments.classId, schoolClasses.id))
          .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id)),
      ]);

      res.json({
        users: allUsers.map(sanitizeUser),
        teacherAssignments: assigns,
      });
    } catch (error) {
      console.error('Fetch users error:', error);
      res.status(500).json({ error: 'Unable to fetch user accounts.' });
    }
  }
);

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  role: z.enum(['super_admin', 'headteacher', 'accountant', 'teacher', 'parent', 'student']),
  phone: z.string().trim().max(40).optional().default(''),
  staffOrAdmissionId: z.string().trim().max(60).optional().default(''),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

adminRouter.post('/users', requireRole('super_admin'), async (req, res) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid user data.' });
    }
    const d = parsed.data;
    const emailLower = d.email.toLowerCase();

    const existing = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const [created] = await db
      .insert(users)
      .values({
        uid: `local:${crypto.randomUUID()}`,
        email: emailLower,
        fullName: d.fullName,
        role: d.role,
        phone: d.phone || null,
        staffOrAdmissionId: d.staffOrAdmissionId || null,
        passwordHash: hashPassword(d.password),
        isActive: true,
        isDemo: false,
      })
      .returning();

    res.status(201).json(sanitizeUser(created));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Unable to create user account.' });
  }
});

adminRouter.patch('/users/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role, isActive, fullName, password } = req.body || {};

    const updateFields: Partial<typeof users.$inferInsert> = {};
    if (role) updateFields.role = role;
    if (typeof isActive === 'boolean') updateFields.isActive = isActive;
    if (fullName) updateFields.fullName = fullName;
    if (password && String(password).length >= 6) {
      updateFields.passwordHash = hashPassword(String(password));
    }

    const [updated] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json(sanitizeUser(updated));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Unable to update user.' });
  }
});

adminRouter.post(
  '/teacher-assignments',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const teacherUserId = Number(req.body?.teacherUserId);
      const classId = Number(req.body?.classId);
      const subjectId = req.body?.subjectId ? Number(req.body.subjectId) : null;

      if (!teacherUserId || !classId) {
        return res.status(400).json({ error: 'Teacher and class are required.' });
      }

      const [created] = await db
        .insert(teacherAssignments)
        .values({ teacherUserId, classId, subjectId })
        .returning();

      res.status(201).json(created);
    } catch (error) {
      console.error('Assign teacher error:', error);
      res.status(500).json({ error: 'Unable to assign teacher.' });
    }
  }
);

adminRouter.delete(
  '/teacher-assignments/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(teacherAssignments).where(eq(teacherAssignments.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete teacher assignment error:', error);
      res.status(500).json({ error: 'Unable to remove teacher assignment.' });
    }
  }
);

// 5. Academic Structure, Sessions, Classes, Subjects, Assignments, Results
adminRouter.get(
  '/academics',
  requireRole('super_admin', 'headteacher', 'teacher', 'accountant'),
  async (_req, res) => {
    try {
      const [allClasses, allSubjects, allSessions, allTerms, allCalendar, allAssignments] =
        await Promise.all([
          db.select().from(schoolClasses).orderBy(asc(schoolClasses.levelOrder)),
          db.select().from(subjects).orderBy(asc(subjects.name)),
          db.select().from(academicSessions).orderBy(desc(academicSessions.isCurrent)),
          db.select().from(academicTerms).orderBy(asc(academicTerms.id)),
          db.select().from(academicCalendarItems).orderBy(asc(academicCalendarItems.id)),
          db
            .select({
              item: assignmentsAndMaterials,
              className: schoolClasses.name,
              subjectName: subjects.name,
            })
            .from(assignmentsAndMaterials)
            .leftJoin(schoolClasses, eq(assignmentsAndMaterials.classId, schoolClasses.id))
            .leftJoin(subjects, eq(assignmentsAndMaterials.subjectId, subjects.id))
            .orderBy(desc(assignmentsAndMaterials.createdAt)),
        ]);

      res.json({
        classes: allClasses,
        subjects: allSubjects,
        sessions: allSessions,
        terms: allTerms,
        calendar: allCalendar,
        assignments: allAssignments.map((a) => ({
          ...a.item,
          className: a.className,
          subjectName: a.subjectName,
        })),
      });
    } catch (error) {
      console.error('Fetch academics error:', error);
      res.status(500).json({ error: 'Unable to load academic structure.' });
    }
  }
);

adminRouter.patch(
  '/classes/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { isActive, description, classTeacherUserId } = req.body || {};
      const [updated] = await db
        .update(schoolClasses)
        .set({
          isActive: typeof isActive === 'boolean' ? isActive : undefined,
          description: typeof description === 'string' ? description : undefined,
          classTeacherUserId:
            classTeacherUserId === null
              ? null
              : classTeacherUserId
                ? Number(classTeacherUserId)
                : undefined,
        })
        .where(eq(schoolClasses.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Class not found.' });
      res.json(updated);
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({ error: 'Unable to update class.' });
    }
  }
);

adminRouter.post(
  '/subjects',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const code = String(req.body?.code || '').trim().toUpperCase();
      const section = String(req.body?.section || 'Primary').trim();
      if (!name || !code) return res.status(400).json({ error: 'Subject name and code are required.' });
      const [created] = await db.insert(subjects).values({ name, code, section }).returning();
      res.status(201).json(created);
    } catch (error) {
      console.error('Create subject error:', error);
      res.status(500).json({ error: 'Unable to create subject.' });
    }
  }
);

adminRouter.post(
  '/sessions',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Session name is required (e.g. 2026/2027).' });

      const [sess] = await db.insert(academicSessions).values({ name, isCurrent: false }).returning();
      await db.insert(academicTerms).values([
        { sessionId: sess.id, name: 'First Term', isCurrent: false },
        { sessionId: sess.id, name: 'Second Term', isCurrent: false },
        { sessionId: sess.id, name: 'Third Term', isCurrent: false },
      ]);

      res.status(201).json(sess);
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Unable to create academic session.' });
    }
  }
);

adminRouter.patch(
  '/sessions/:id/current',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.update(academicSessions).set({ isCurrent: false });
      const [updated] = await db
        .update(academicSessions)
        .set({ isCurrent: true })
        .where(eq(academicSessions.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error('Set current session error:', error);
      res.status(500).json({ error: 'Unable to set active session.' });
    }
  }
);

adminRouter.patch(
  '/terms/:id/current',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.update(academicTerms).set({ isCurrent: false });
      const [updated] = await db
        .update(academicTerms)
        .set({ isCurrent: true })
        .where(eq(academicTerms.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error('Set current term error:', error);
      res.status(500).json({ error: 'Unable to set active term.' });
    }
  }
);

adminRouter.post(
  '/calendar',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const { sessionId, termName, title, eventDate, category, description } = req.body || {};
      if (!title || !eventDate || !termName) {
        return res.status(400).json({ error: 'Term, title, and date are required.' });
      }
      const [created] = await db
        .insert(academicCalendarItems)
        .values({
          sessionId: sessionId ? Number(sessionId) : null,
          termName,
          title,
          eventDate,
          category: category || 'PTA / Event',
          description: description || null,
        })
        .returning();
      res.status(201).json(created);
    } catch (error) {
      console.error('Create calendar item error:', error);
      res.status(500).json({ error: 'Unable to add calendar entry.' });
    }
  }
);

adminRouter.delete(
  '/calendar/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      await db.delete(academicCalendarItems).where(eq(academicCalendarItems.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete calendar item error:', error);
      res.status(500).json({ error: 'Unable to delete calendar entry.' });
    }
  }
);

adminRouter.post(
  '/assignments',
  requireRole('super_admin', 'headteacher', 'teacher'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.appUser!;
      const classId = Number(req.body?.classId);
      const subjectId = req.body?.subjectId ? Number(req.body.subjectId) : null;
      const title = String(req.body?.title || '').trim();
      const type = String(req.body?.type || 'Assignment');
      const description = String(req.body?.description || '').trim();
      const dueDate = String(req.body?.dueDate || '').trim();

      if (!classId || !title || !description) {
        return res.status(400).json({ error: 'Class, title, and description are required.' });
      }

      if (user.role === 'teacher') {
        const assigned = await db
          .select()
          .from(teacherAssignments)
          .where(and(eq(teacherAssignments.teacherUserId, user.id), eq(teacherAssignments.classId, classId)))
          .limit(1);
        if (assigned.length === 0) {
          return res.status(403).json({ error: 'You are not assigned to this class.' });
        }
      }

      const [created] = await db
        .insert(assignmentsAndMaterials)
        .values({
          classId,
          subjectId,
          title,
          type,
          description,
          dueDate: dueDate || null,
          postedByUserId: user.id,
          isDemo: user.isDemo,
        })
        .returning();

      res.status(201).json(created);
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ error: 'Unable to post assignment or learning material.' });
    }
  }
);

adminRouter.delete(
  '/assignments/:id',
  requireRole('super_admin', 'headteacher', 'teacher'),
  async (req, res) => {
    try {
      await db.delete(assignmentsAndMaterials).where(eq(assignmentsAndMaterials.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete assignment error:', error);
      res.status(500).json({ error: 'Unable to delete item.' });
    }
  }
);

// Results Entry Sheet & Save
adminRouter.get(
  '/results/sheet',
  requireRole('super_admin', 'headteacher', 'teacher'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.appUser!;
      const classId = Number(req.query.classId);
      const sessionId = Number(req.query.sessionId);
      const termId = Number(req.query.termId);
      const subjectId = Number(req.query.subjectId);

      if (!classId || !sessionId || !termId || !subjectId) {
        return res.status(400).json({ error: 'Class, session, term, and subject are required.' });
      }

      if (user.role === 'teacher') {
        const assigned = await db
          .select()
          .from(teacherAssignments)
          .where(and(eq(teacherAssignments.teacherUserId, user.id), eq(teacherAssignments.classId, classId)))
          .limit(1);
        if (assigned.length === 0) {
          return res.status(403).json({ error: 'You can only access results for classes assigned to you.' });
        }
      }

      const [classStudents, existingScores, existingMeta] = await Promise.all([
        db.select().from(students).where(eq(students.classId, classId)).orderBy(asc(students.fullName)),
        db
          .select()
          .from(studentResults)
          .where(
            and(
              eq(studentResults.classId, classId),
              eq(studentResults.sessionId, sessionId),
              eq(studentResults.termId, termId),
              eq(studentResults.subjectId, subjectId)
            )
          ),
        db
          .select()
          .from(termReportMeta)
          .where(
            and(
              eq(termReportMeta.classId, classId),
              eq(termReportMeta.sessionId, sessionId),
              eq(termReportMeta.termId, termId)
            )
          ),
      ]);

      const scoreMap = new Map(existingScores.map((s) => [s.studentId, s]));
      const metaMap = new Map(existingMeta.map((m) => [m.studentId, m]));

      res.json(
        classStudents.map((stu) => {
          const score = scoreMap.get(stu.id);
          const meta = metaMap.get(stu.id);
          return {
            studentId: stu.id,
            fullName: stu.fullName,
            admissionNumber: stu.admissionNumber,
            isDemo: stu.isDemo,
            caScore: score?.caScore ?? 0,
            examScore: score?.examScore ?? 0,
            totalScore: score?.totalScore ?? 0,
            grade: score?.grade ?? '—',
            remark: score?.remark ?? '',
            approvedByHeadteacher: score?.approvedByHeadteacher ?? false,
            daysPresent: meta?.daysPresent ?? 0,
            daysOpened: meta?.daysOpened ?? 0,
            teacherRemark: meta?.teacherRemark ?? '',
            headteacherRemark: meta?.headteacherRemark ?? '',
          };
        })
      );
    } catch (error) {
      console.error('Results sheet error:', error);
      res.status(500).json({ error: 'Unable to load class results sheet.' });
    }
  }
);

const saveScoreSchema = z.object({
  studentId: z.number().int().positive(),
  classId: z.number().int().positive(),
  sessionId: z.number().int().positive(),
  termId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  caScore: z.number().int().min(0).max(40),
  examScore: z.number().int().min(0).max(60),
  approvedByHeadteacher: z.boolean().optional(),
});

adminRouter.post(
  '/results/save',
  requireRole('super_admin', 'headteacher', 'teacher'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.appUser!;
      const parsed = saveScoreSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Scores must be CA (0-40) and Exam (0-60).' });
      }
      const d = parsed.data;

      if (user.role === 'teacher') {
        const assigned = await db
          .select()
          .from(teacherAssignments)
          .where(and(eq(teacherAssignments.teacherUserId, user.id), eq(teacherAssignments.classId, d.classId)))
          .limit(1);
        if (assigned.length === 0) {
          return res.status(403).json({ error: 'Not authorized to enter results for this class.' });
        }
      }

      const totalScore = d.caScore + d.examScore;
      const { grade, remark } = computeGradeAndRemark(totalScore);
      const stuRows = await db.select().from(students).where(eq(students.id, d.studentId)).limit(1);
      const isDemo = stuRows[0]?.isDemo ?? false;

      const existing = await db
        .select()
        .from(studentResults)
        .where(
          and(
            eq(studentResults.studentId, d.studentId),
            eq(studentResults.sessionId, d.sessionId),
            eq(studentResults.termId, d.termId),
            eq(studentResults.subjectId, d.subjectId)
          )
        )
        .limit(1);

      const canApprove = user.role === 'headteacher' || user.role === 'super_admin';

      if (existing.length > 0) {
        const [updated] = await db
          .update(studentResults)
          .set({
            caScore: d.caScore,
            examScore: d.examScore,
            totalScore,
            grade,
            remark,
            enteredByUserId: user.id,
            approvedByHeadteacher:
              canApprove && typeof d.approvedByHeadteacher === 'boolean'
                ? d.approvedByHeadteacher
                : existing[0].approvedByHeadteacher,
            updatedAt: new Date(),
          })
          .where(eq(studentResults.id, existing[0].id))
          .returning();
        return res.json(updated);
      }

      const [created] = await db
        .insert(studentResults)
        .values({
          studentId: d.studentId,
          sessionId: d.sessionId,
          termId: d.termId,
          classId: d.classId,
          subjectId: d.subjectId,
          caScore: d.caScore,
          examScore: d.examScore,
          totalScore,
          grade,
          remark,
          enteredByUserId: user.id,
          approvedByHeadteacher: canApprove ? Boolean(d.approvedByHeadteacher) : false,
          isDemo,
        })
        .returning();

      res.status(201).json(created);
    } catch (error) {
      console.error('Save result error:', error);
      res.status(500).json({ error: 'Unable to save examination score.' });
    }
  }
);

adminRouter.post(
  '/results/meta',
  requireRole('super_admin', 'headteacher', 'teacher'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.appUser!;
      const studentId = Number(req.body?.studentId);
      const classId = Number(req.body?.classId);
      const sessionId = Number(req.body?.sessionId);
      const termId = Number(req.body?.termId);
      const daysPresent = Number(req.body?.daysPresent || 0);
      const daysOpened = Number(req.body?.daysOpened || 0);
      const teacherRemark = String(req.body?.teacherRemark || '').trim();
      const headteacherRemark = String(req.body?.headteacherRemark || '').trim();
      const approved = Boolean(req.body?.approved);

      if (!studentId || !classId || !sessionId || !termId) {
        return res.status(400).json({ error: 'Missing required report metadata fields.' });
      }

      const canApprove = user.role === 'headteacher' || user.role === 'super_admin';
      const existing = await db
        .select()
        .from(termReportMeta)
        .where(
          and(
            eq(termReportMeta.studentId, studentId),
            eq(termReportMeta.sessionId, sessionId),
            eq(termReportMeta.termId, termId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(termReportMeta)
          .set({
            daysPresent,
            daysOpened,
            teacherRemark: teacherRemark || existing[0].teacherRemark,
            headteacherRemark: canApprove ? headteacherRemark || existing[0].headteacherRemark : existing[0].headteacherRemark,
            approved: canApprove ? approved : existing[0].approved,
          })
          .where(eq(termReportMeta.id, existing[0].id))
          .returning();
        return res.json(updated);
      }

      const [created] = await db
        .insert(termReportMeta)
        .values({
          studentId,
          classId,
          sessionId,
          termId,
          daysPresent,
          daysOpened,
          teacherRemark: teacherRemark || null,
          headteacherRemark: canApprove ? headteacherRemark || null : null,
          approved: canApprove ? approved : false,
        })
        .returning();

      res.status(201).json(created);
    } catch (error) {
      console.error('Save term meta error:', error);
      res.status(500).json({ error: 'Unable to save attendance and remarks.' });
    }
  }
);

// 6. Finance & School Fees Management
adminRouter.get(
  '/finance',
  requireRole('super_admin', 'accountant', 'headteacher'),
  async (_req, res) => {
    try {
      const [structures, invoices, payments] = await Promise.all([
        db.select().from(feeStructures).orderBy(desc(feeStructures.createdAt)),
        db
          .select({
            invoice: feeInvoices,
            studentName: students.fullName,
            admissionNumber: students.admissionNumber,
            className: schoolClasses.name,
            sessionName: academicSessions.name,
            termName: academicTerms.name,
          })
          .from(feeInvoices)
          .innerJoin(students, eq(feeInvoices.studentId, students.id))
          .leftJoin(schoolClasses, eq(students.classId, schoolClasses.id))
          .innerJoin(academicSessions, eq(feeInvoices.sessionId, academicSessions.id))
          .innerJoin(academicTerms, eq(feeInvoices.termId, academicTerms.id))
          .orderBy(desc(feeInvoices.createdAt)),
        db
          .select({
            payment: feePayments,
            studentName: students.fullName,
            admissionNumber: students.admissionNumber,
            invoiceNumber: feeInvoices.invoiceNumber,
          })
          .from(feePayments)
          .innerJoin(students, eq(feePayments.studentId, students.id))
          .innerJoin(feeInvoices, eq(feePayments.invoiceId, feeInvoices.id))
          .orderBy(desc(feePayments.paidAt)),
      ]);

      const totalExpected = invoices.reduce((s, r) => s + r.invoice.amountDue, 0);
      const totalCollected = invoices.reduce((s, r) => s + r.invoice.amountPaid, 0);
      const totalOutstanding = Math.max(0, totalExpected - totalCollected);
      const paidStudentIds = new Set(
        invoices.filter((r) => r.invoice.status === 'Paid').map((r) => r.invoice.studentId)
      );
      const owingStudentIds = new Set(
        invoices.filter((r) => r.invoice.status !== 'Paid').map((r) => r.invoice.studentId)
      );

      res.json({
        summary: {
          totalExpected,
          totalCollected,
          totalOutstanding,
          fullyPaidStudents: paidStudentIds.size,
          studentsWithOutstanding: owingStudentIds.size,
        },
        structures,
        invoices: invoices.map((r) => ({
          ...r.invoice,
          studentName: r.studentName,
          admissionNumber: r.admissionNumber,
          className: r.className,
          sessionName: r.sessionName,
          termName: r.termName,
        })),
        payments: payments.map((p) => ({
          ...p.payment,
          studentName: p.studentName,
          admissionNumber: p.admissionNumber,
          invoiceNumber: p.invoiceNumber,
        })),
      });
    } catch (error) {
      console.error('Finance fetch error:', error);
      res.status(500).json({ error: 'Unable to load school fee records.' });
    }
  }
);

adminRouter.post(
  '/finance/structures',
  requireRole('super_admin', 'accountant'),
  async (req, res) => {
    try {
      const sessionId = Number(req.body?.sessionId);
      const termId = Number(req.body?.termId);
      const section = String(req.body?.section || 'Primary');
      const title = String(req.body?.title || '').trim();
      const tuitionAmount = Number(req.body?.tuitionAmount || 0);
      const developmentLevy = Number(req.body?.developmentLevy || 0);
      const booksAndMaterials = Number(req.body?.booksAndMaterials || 0);
      const examFee = Number(req.body?.examFee || 0);

      if (!sessionId || !termId || !title || tuitionAmount <= 0) {
        return res.status(400).json({ error: 'Session, term, title, and valid tuition amount are required.' });
      }

      const totalAmount = tuitionAmount + developmentLevy + booksAndMaterials + examFee;
      const [created] = await db
        .insert(feeStructures)
        .values({
          sessionId,
          termId,
          section,
          title,
          tuitionAmount,
          developmentLevy,
          booksAndMaterials,
          examFee,
          totalAmount,
          isDemo: false,
        })
        .returning();

      res.status(201).json(created);
    } catch (error) {
      console.error('Create fee structure error:', error);
      res.status(500).json({ error: 'Unable to create fee structure.' });
    }
  }
);

adminRouter.post(
  '/finance/invoices/generate',
  requireRole('super_admin', 'accountant'),
  async (req, res) => {
    try {
      const feeStructureId = Number(req.body?.feeStructureId);
      const studentId = req.body?.studentId ? Number(req.body.studentId) : null;
      const dueDate = String(req.body?.dueDate || '').trim();

      const structRows = await db
        .select()
        .from(feeStructures)
        .where(eq(feeStructures.id, feeStructureId))
        .limit(1);

      if (structRows.length === 0) {
        return res.status(404).json({ error: 'Fee structure not found.' });
      }
      const struct = structRows[0];

      let targetStudents: Array<typeof students.$inferSelect> = [];
      if (studentId) {
        targetStudents = await db.select().from(students).where(eq(students.id, studentId));
      } else {
        const classRows = await db
          .select()
          .from(schoolClasses)
          .where(eq(schoolClasses.section, struct.section));
        const sectionClassIds = classRows.map((c) => c.id);
        if (sectionClassIds.length > 0) {
          targetStudents = await db
            .select()
            .from(students)
            .where(and(inArray(students.classId, sectionClassIds), eq(students.status, 'Active')));
        }
      }

      if (targetStudents.length === 0) {
        return res.status(400).json({ error: 'No matching active students found for this fee structure.' });
      }

      const createdInvoices = [];
      for (const stu of targetStudents) {
        const invNo = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const [inv] = await db
          .insert(feeInvoices)
          .values({
            invoiceNumber: invNo,
            studentId: stu.id,
            sessionId: struct.sessionId,
            termId: struct.termId,
            feeStructureId: struct.id,
            description: struct.title,
            amountDue: struct.totalAmount,
            amountPaid: 0,
            status: 'Unpaid',
            dueDate: dueDate || null,
            isDemo: stu.isDemo,
          })
          .returning();
        createdInvoices.push(inv);
      }

      res.status(201).json({ count: createdInvoices.length, invoices: createdInvoices });
    } catch (error) {
      console.error('Generate invoices error:', error);
      res.status(500).json({ error: 'Unable to generate invoices.' });
    }
  }
);

adminRouter.post(
  '/finance/payments',
  requireRole('super_admin', 'accountant'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.appUser!;
      const invoiceId = Number(req.body?.invoiceId);
      const amount = Number(req.body?.amount);
      const paymentMethod = String(req.body?.paymentMethod || 'Cash');
      const reference = String(req.body?.reference || '').trim();
      const notes = String(req.body?.notes || '').trim();
      const verifyNow = Boolean(req.body?.verifyNow);

      if (!invoiceId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid invoice and payment amount are required.' });
      }

      const invRows = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
      if (invRows.length === 0) return res.status(404).json({ error: 'Invoice not found.' });
      const invoice = invRows[0];

      // Cash payments by accountant are Verified; Bank Transfers require explicit verification
      const verificationStatus =
        paymentMethod === 'Cash'
          ? 'Verified'
          : paymentMethod === 'Bank Transfer' && verifyNow
            ? 'Verified'
            : 'Pending Verification';

      const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const [payment] = await db
        .insert(feePayments)
        .values({
          receiptNumber,
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          amount,
          paymentMethod,
          reference: reference || null,
          verificationStatus,
          recordedByUserId: user.id,
          verifiedByUserId: verificationStatus === 'Verified' ? user.id : null,
          notes: notes || null,
          isDemo: invoice.isDemo,
        })
        .returning();

      if (verificationStatus === 'Verified') {
        await recalculateInvoiceTotals(invoice.id);
      }

      res.status(201).json(payment);
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({ error: 'Unable to record payment.' });
    }
  }
);

adminRouter.patch(
  '/finance/payments/:id/verify',
  requireRole('super_admin', 'accountant'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.appUser!;
      const id = Number(req.params.id);
      const verificationStatus = String(req.body?.status || '');

      if (!['Verified', 'Rejected'].includes(verificationStatus)) {
        return res.status(400).json({ error: 'Status must be Verified or Rejected.' });
      }

      const [updated] = await db
        .update(feePayments)
        .set({
          verificationStatus,
          verifiedByUserId: user.id,
        })
        .where(eq(feePayments.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Payment record not found.' });

      await recalculateInvoiceTotals(updated.invoiceId);
      res.json(updated);
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: 'Unable to update payment verification status.' });
    }
  }
);

// 7. Website CMS, Settings, News, Gallery, Testimonials, Enquiries
adminRouter.patch('/settings', requireRole('super_admin'), async (req, res) => {
  try {
    const existing = await db.select().from(schoolSettings).limit(1);
    const body = req.body || {};
    if (existing.length === 0) return res.status(404).json({ error: 'Settings missing.' });

    let safeMapsEmbedUrl = existing[0].mapsEmbedUrl;
    if (typeof body.mapsEmbedUrl === 'string') {
      const trimmedMap = body.mapsEmbedUrl.trim();
      if (trimmedMap === '') {
        safeMapsEmbedUrl = '';
      } else {
        try {
          const parsedUrl = new URL(trimmedMap);
          if (parsedUrl.protocol !== 'https:') {
            return res.status(400).json({ error: 'Google Maps Embed URL must use https://.' });
          }
          safeMapsEmbedUrl = trimmedMap;
        } catch {
          return res.status(400).json({ error: 'Invalid Google Maps Embed URL.' });
        }
      }
    }

    const [updated] = await db
      .update(schoolSettings)
      .set({
        schoolName: body.schoolName ?? existing[0].schoolName,
        tagline: body.tagline ?? existing[0].tagline,
        address: body.address ?? existing[0].address,
        phone: body.phone ?? existing[0].phone,
        email: body.email ?? existing[0].email,
        whatsapp: body.whatsapp ?? existing[0].whatsapp,
        mapsEmbedUrl: safeMapsEmbedUrl,
        mapsQuery: body.mapsQuery ?? existing[0].mapsQuery,
        statStudents: body.statStudents ?? existing[0].statStudents,
        statTeachers: body.statTeachers ?? existing[0].statTeachers,
        statClasses: body.statClasses ?? existing[0].statClasses,
        statYears: body.statYears ?? existing[0].statYears,
        welcomeTitle: body.welcomeTitle ?? existing[0].welcomeTitle,
        welcomeMessage: body.welcomeMessage ?? existing[0].welcomeMessage,
        aboutHistory: body.aboutHistory ?? existing[0].aboutHistory,
        visionStatement: body.visionStatement ?? existing[0].visionStatement,
        missionStatement: body.missionStatement ?? existing[0].missionStatement,
        philosophyStatement: body.philosophyStatement ?? existing[0].philosophyStatement,
        logoDataUrl: body.logoDataUrl !== undefined ? body.logoDataUrl : existing[0].logoDataUrl,
        paystackPublicKey: body.paystackPublicKey ?? existing[0].paystackPublicKey,
        paystackConfigured:
          typeof body.paystackConfigured === 'boolean'
            ? body.paystackConfigured
            : existing[0].paystackConfigured,
        classPositionsEnabled:
          typeof body.classPositionsEnabled === 'boolean'
            ? body.classPositionsEnabled
            : existing[0].classPositionsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(schoolSettings.id, existing[0].id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Unable to save school settings.' });
  }
});

adminRouter.put('/leadership/:id', requireRole('super_admin', 'headteacher'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { titleRole, fullName, bio } = req.body || {};
    const [updated] = await db
      .update(leadershipStaff)
      .set({ titleRole, fullName, bio })
      .where(eq(leadershipStaff.id, id))
      .returning();
    res.json(updated);
  } catch (error) {
    console.error('Update leadership error:', error);
    res.status(500).json({ error: 'Unable to update leadership entry.' });
  }
});

adminRouter.post(
  '/news',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const { title, category, eventDate, location, summary, content, imageUrl } = req.body || {};
      if (!title || !summary || !content) {
        return res.status(400).json({ error: 'Title, summary, and content are required.' });
      }
      const [created] = await db
        .insert(newsAndEvents)
        .values({
          title,
          category: category || 'Announcement',
          eventDate: eventDate || null,
          location: location || null,
          summary,
          content,
          imageUrl: imageUrl || null,
          isPublished: true,
        })
        .returning();
      res.status(201).json(created);
    } catch (error) {
      console.error('Create news error:', error);
      res.status(500).json({ error: 'Unable to publish news or event.' });
    }
  }
);

adminRouter.delete(
  '/news/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      await db.delete(newsAndEvents).where(eq(newsAndEvents.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete news error:', error);
      res.status(500).json({ error: 'Unable to delete news item.' });
    }
  }
);

adminRouter.post(
  '/gallery',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const { title, category, caption, imageUrl } = req.body || {};
      if (!title || !imageUrl) {
        return res.status(400).json({ error: 'Photo title and image are required.' });
      }
      const [created] = await db
        .insert(galleryItems)
        .values({
          title,
          category: category || 'Primary Classroom',
          caption: caption || null,
          imageUrl,
        })
        .returning();
      res.status(201).json(created);
    } catch (error) {
      console.error('Create gallery error:', error);
      res.status(500).json({ error: 'Unable to upload gallery photo.' });
    }
  }
);

adminRouter.delete(
  '/gallery/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      await db.delete(galleryItems).where(eq(galleryItems.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete gallery error:', error);
      res.status(500).json({ error: 'Unable to delete gallery photo.' });
    }
  }
);

adminRouter.post(
  '/testimonials',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const { parentName, parentRole, quote } = req.body || {};
      if (!parentName || !parentRole || !quote) {
        return res.status(400).json({ error: 'Parent name, role, and quote are required.' });
      }
      const [created] = await db
        .insert(testimonials)
        .values({ parentName, parentRole, quote, isDemo: false, isPublished: true })
        .returning();
      res.status(201).json(created);
    } catch (error) {
      console.error('Create testimonial error:', error);
      res.status(500).json({ error: 'Unable to add testimonial.' });
    }
  }
);

adminRouter.delete(
  '/testimonials/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      await db.delete(testimonials).where(eq(testimonials.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete testimonial error:', error);
      res.status(500).json({ error: 'Unable to delete testimonial.' });
    }
  }
);

adminRouter.get(
  '/enquiries',
  requireRole('super_admin', 'headteacher'),
  async (_req, res) => {
    try {
      const rows = await db
        .select()
        .from(contactEnquiries)
        .orderBy(desc(contactEnquiries.createdAt));
      res.json(rows);
    } catch (error) {
      console.error('Fetch enquiries error:', error);
      res.status(500).json({ error: 'Unable to load contact enquiries.' });
    }
  }
);

adminRouter.patch(
  '/enquiries/:id',
  requireRole('super_admin', 'headteacher'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || 'Reviewed');
      const [updated] = await db
        .update(contactEnquiries)
        .set({ status })
        .where(eq(contactEnquiries.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error('Update enquiry error:', error);
      res.status(500).json({ error: 'Unable to update enquiry status.' });
    }
  }
);

adminRouter.delete('/demo-data', requireRole('super_admin'), async (_req, res) => {
  try {
    await db.delete(feePayments).where(eq(feePayments.isDemo, true));
    await db.delete(feeInvoices).where(eq(feeInvoices.isDemo, true));
    await db.delete(feeStructures).where(eq(feeStructures.isDemo, true));
    await db.delete(studentResults).where(eq(studentResults.isDemo, true));
    await db.delete(termReportMeta).where(eq(termReportMeta.isDemo, true));
    await db.delete(assignmentsAndMaterials).where(eq(assignmentsAndMaterials.isDemo, true));
    await db.delete(students).where(eq(students.isDemo, true));
    await db.delete(testimonials).where(eq(testimonials.isDemo, true));
    await db.delete(users).where(eq(users.isDemo, true));
    res.json({ ok: true, message: 'Sample demonstration records have been cleared.' });
  } catch (error) {
    console.error('Clear demo data error:', error);
    res.status(500).json({ error: 'Unable to clear sample demonstration records.' });
  }
});
