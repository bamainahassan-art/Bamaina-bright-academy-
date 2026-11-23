import crypto from 'node:crypto';
import { Router } from 'express';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  schoolClasses,
  students,
  subjects,
  teacherAssignments,
  users,
} from '../../db/schema.ts';
import {
  AuthRequest,
  hashPassword,
  requireAuth,
  sanitizeUser,
  signAcademyToken,
  verifyPassword,
} from '../auth.ts';
import { ensureSeeded } from '../seed.ts';

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().trim().min(2, 'Email or ID is required'),
  password: z.string().min(4, 'Password is required'),
});

authRouter.post('/login', async (req, res) => {
  try {
    await ensureSeeded();
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials' });
    }

    const identifier = parsed.data.identifier.trim();
    const identifierLower = identifier.toLowerCase();

    const matched = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, identifierLower),
          eq(users.staffOrAdmissionId, identifier)
        )
      )
      .limit(1);

    if (matched.length === 0) {
      return res.status(401).json({ error: 'Invalid email/ID or password.' });
    }

    const userRow = matched[0];
    if (!userRow.isActive) {
      return res.status(403).json({ error: 'This account is inactive. Contact school administration.' });
    }

    if (!verifyPassword(parsed.data.password, userRow.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email/ID or password.' });
    }

    const token = signAcademyToken({
      userId: userRow.id,
      uid: userRow.uid,
      role: userRow.role,
    });

    res.json({ token, user: sanitizeUser(userRow) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

authRouter.post('/demo-login', async (req, res) => {
  try {
    await ensureSeeded();
    const uid = String(req.body?.uid || '').trim();
    const allowedDemoUids = [
      'demo_super_admin',
      'demo_headteacher',
      'demo_accountant',
      'demo_teacher',
      'demo_parent',
      'demo_student',
    ];
    if (!allowedDemoUids.includes(uid)) {
      return res.status(400).json({ error: 'Invalid demo role selection.' });
    }

    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.uid, uid), eq(users.isDemo, true)))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Sample demo accounts have been cleared. Sign in with a real staff, parent, or Google account.',
      });
    }

    const userRow = rows[0];
    const token = signAcademyToken({
      userId: userRow.id,
      uid: userRow.uid,
      role: userRow.role,
    });

    res.json({ token, user: sanitizeUser(userRow) });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Unable to start demo session.' });
  }
});

// First-run Super Admin setup status (checks if any non-demo super_admin exists)
authRouter.get('/bootstrap-status', async (_req, res) => {
  try {
    await ensureSeeded();
    const realAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'super_admin'), eq(users.isDemo, false)))
      .limit(1);
    res.json({ hasRealAdmin: realAdmins.length > 0 });
  } catch (error) {
    console.error('Bootstrap status error:', error);
    res.status(500).json({ error: 'Unable to check bootstrap status.' });
  }
});

const claimAdminSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

authRouter.post('/claim-admin', async (req, res) => {
  try {
    await ensureSeeded();
    const realAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'super_admin'), eq(users.isDemo, false)))
      .limit(1);

    if (realAdmins.length > 0) {
      return res.status(403).json({
        error: 'A primary Super Administrator account is already registered. Please sign in.',
      });
    }

    const parsed = claimAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid details' });
    }

    const emailLower = parsed.data.email.toLowerCase();
    const [created] = await db
      .insert(users)
      .values({
        uid: `local:${crypto.randomUUID()}`,
        email: emailLower,
        fullName: parsed.data.fullName,
        role: 'super_admin',
        staffOrAdmissionId: 'BBA/ADM/001',
        passwordHash: hashPassword(parsed.data.password),
        isActive: true,
        isDemo: false,
      })
      .returning();

    const token = signAcademyToken({
      userId: created.id,
      uid: created.uid,
      role: created.role,
    });

    res.status(201).json({ token, user: sanitizeUser(created) });
  } catch (error) {
    console.error('Claim admin error:', error);
    res.status(500).json({ error: 'Unable to register administrator account.' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const currentUser = req.appUser!;
    let linkedStudents: Array<typeof students.$inferSelect & { className: string | null }> = [];
    let assignments: Array<{
      id: number;
      classId: number;
      className: string;
      subjectId: number | null;
      subjectName: string | null;
    }> = [];

    if (currentUser.role === 'parent') {
      const rows = await db
        .select({
          student: students,
          className: schoolClasses.name,
        })
        .from(students)
        .leftJoin(schoolClasses, eq(students.classId, schoolClasses.id))
        .where(eq(students.parentUserId, currentUser.id));
      linkedStudents = rows.map((r) => ({ ...r.student, className: r.className }));
    } else if (currentUser.role === 'student') {
      const rows = await db
        .select({
          student: students,
          className: schoolClasses.name,
        })
        .from(students)
        .leftJoin(schoolClasses, eq(students.classId, schoolClasses.id))
        .where(eq(students.userId, currentUser.id));
      linkedStudents = rows.map((r) => ({ ...r.student, className: r.className }));
    } else if (currentUser.role === 'teacher') {
      const rows = await db
        .select({
          id: teacherAssignments.id,
          classId: teacherAssignments.classId,
          className: schoolClasses.name,
          subjectId: teacherAssignments.subjectId,
          subjectName: subjects.name,
        })
        .from(teacherAssignments)
        .innerJoin(schoolClasses, eq(teacherAssignments.classId, schoolClasses.id))
        .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
        .where(eq(teacherAssignments.teacherUserId, currentUser.id));
      assignments = rows;
    }

    res.json({
      user: currentUser,
      linkedStudents,
      assignments,
    });
  } catch (error) {
    console.error('Profile lookup error:', error);
    res.status(500).json({ error: 'Unable to load user profile.' });
  }
});
