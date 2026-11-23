import { Router } from 'express';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  academicSessions,
  academicTerms,
  assignmentsAndMaterials,
  feeInvoices,
  feePayments,
  newsAndEvents,
  schoolClasses,
  schoolSettings,
  studentResults,
  students,
  subjects,
  termReportMeta,
} from '../../db/schema.ts';
import { AuthRequest, requireAuth } from '../auth.ts';

export const portalRouter = Router();

portalRouter.use(requireAuth);

portalRouter.get('/overview', async (req: AuthRequest, res) => {
  try {
    const user = req.appUser!;
    let childrenRows: Array<typeof students.$inferSelect & { className: string | null; classSection: string | null }> = [];

    if (user.role === 'parent') {
      const rows = await db
        .select({
          student: students,
          className: schoolClasses.name,
          classSection: schoolClasses.section,
        })
        .from(students)
        .leftJoin(schoolClasses, eq(students.classId, schoolClasses.id))
        .where(eq(students.parentUserId, user.id))
        .orderBy(asc(students.fullName));
      childrenRows = rows.map((r) => ({
        ...r.student,
        className: r.className,
        classSection: r.classSection,
      }));
    } else if (user.role === 'student') {
      const rows = await db
        .select({
          student: students,
          className: schoolClasses.name,
          classSection: schoolClasses.section,
        })
        .from(students)
        .leftJoin(schoolClasses, eq(students.classId, schoolClasses.id))
        .where(eq(students.userId, user.id));
      childrenRows = rows.map((r) => ({
        ...r.student,
        className: r.className,
        classSection: r.classSection,
      }));
    }

    const studentIds = childrenRows.map((c) => c.id);
    const classIds = Array.from(
      new Set(childrenRows.map((c) => c.classId).filter((id): id is number => id !== null))
    );

    const [invoices, payments, assignments, announcements, sessions, terms, settingsRows] =
      await Promise.all([
        studentIds.length > 0
          ? db
              .select()
              .from(feeInvoices)
              .where(inArray(feeInvoices.studentId, studentIds))
              .orderBy(desc(feeInvoices.createdAt))
          : Promise.resolve([]),
        studentIds.length > 0
          ? db
              .select()
              .from(feePayments)
              .where(inArray(feePayments.studentId, studentIds))
              .orderBy(desc(feePayments.paidAt))
          : Promise.resolve([]),
        classIds.length > 0
          ? db
              .select({
                item: assignmentsAndMaterials,
                subjectName: subjects.name,
                className: schoolClasses.name,
              })
              .from(assignmentsAndMaterials)
              .leftJoin(subjects, eq(assignmentsAndMaterials.subjectId, subjects.id))
              .leftJoin(schoolClasses, eq(assignmentsAndMaterials.classId, schoolClasses.id))
              .where(inArray(assignmentsAndMaterials.classId, classIds))
              .orderBy(desc(assignmentsAndMaterials.createdAt))
          : Promise.resolve([]),
        db
          .select()
          .from(newsAndEvents)
          .where(eq(newsAndEvents.isPublished, true))
          .orderBy(desc(newsAndEvents.createdAt))
          .limit(6),
        db.select().from(academicSessions).orderBy(desc(academicSessions.isCurrent)),
        db.select().from(academicTerms).orderBy(asc(academicTerms.id)),
        db.select().from(schoolSettings).limit(1),
      ]);

    res.json({
      students: childrenRows,
      invoices,
      payments,
      assignments: assignments.map((a) => ({
        ...a.item,
        subjectName: a.subjectName,
        className: a.className,
      })),
      announcements,
      sessions,
      terms,
      settings: settingsRows[0] || null,
    });
  } catch (error) {
    console.error('Portal overview error:', error);
    res.status(500).json({ error: 'Unable to load portal data.' });
  }
});

portalRouter.get('/results', async (req: AuthRequest, res) => {
  try {
    const user = req.appUser!;
    const studentId = Number(req.query.studentId);
    const sessionId = Number(req.query.sessionId);
    const termId = Number(req.query.termId);

    if (!studentId || !sessionId || !termId) {
      return res.status(400).json({ error: 'Student, academic session, and term are required.' });
    }

    const studentRows = await db
      .select({
        student: students,
        className: schoolClasses.name,
        classSection: schoolClasses.section,
      })
      .from(students)
      .leftJoin(schoolClasses, eq(students.classId, schoolClasses.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const targetStudent = studentRows[0].student;

    // Strict ownership & RBAC verification
    if (user.role === 'student' && targetStudent.userId !== user.id) {
      return res.status(403).json({ error: 'You may only view your own examination results.' });
    }
    if (user.role === 'parent' && targetStudent.parentUserId !== user.id) {
      return res.status(403).json({
        error: 'Access denied: Parents may only view results of children linked to their account.',
      });
    }

    const [resultRows, metaRows, sessionRows, termRows, settingsRows] = await Promise.all([
      db
        .select({
          result: studentResults,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          className: schoolClasses.name,
        })
        .from(studentResults)
        .innerJoin(subjects, eq(studentResults.subjectId, subjects.id))
        .innerJoin(schoolClasses, eq(studentResults.classId, schoolClasses.id))
        .where(
          and(
            eq(studentResults.studentId, studentId),
            eq(studentResults.sessionId, sessionId),
            eq(studentResults.termId, termId)
          )
        )
        .orderBy(asc(subjects.name)),
      db
        .select()
        .from(termReportMeta)
        .where(
          and(
            eq(termReportMeta.studentId, studentId),
            eq(termReportMeta.sessionId, sessionId),
            eq(termReportMeta.termId, termId)
          )
        )
        .limit(1),
      db.select().from(academicSessions).where(eq(academicSessions.id, sessionId)).limit(1),
      db.select().from(academicTerms).where(eq(academicTerms.id, termId)).limit(1),
      db.select().from(schoolSettings).limit(1),
    ]);

    const settings = settingsRows[0];
    const effectiveClassId =
      resultRows[0]?.result.classId ?? targetStudent.classId ?? null;

    // Optional class position calculation when enabled
    let position: number | null = null;
    let classTotalStudents: number | null = null;

    if (settings?.classPositionsEnabled && effectiveClassId && resultRows.length > 0) {
      const classAllResults = await db
        .select({
          studentId: studentResults.studentId,
          totalScore: studentResults.totalScore,
        })
        .from(studentResults)
        .where(
          and(
            eq(studentResults.classId, effectiveClassId),
            eq(studentResults.sessionId, sessionId),
            eq(studentResults.termId, termId)
          )
        );

      const totalsMap = new Map<number, number>();
      for (const row of classAllResults) {
        totalsMap.set(row.studentId, (totalsMap.get(row.studentId) || 0) + row.totalScore);
      }

      const sorted = Array.from(totalsMap.entries()).sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([sid]) => sid === studentId);
      if (idx !== -1) {
        position = idx + 1;
        classTotalStudents = sorted.length;
      }
    }

    const totalScoreSum = resultRows.reduce((acc, r) => acc + r.result.totalScore, 0);
    const averageScore =
      resultRows.length > 0 ? Number((totalScoreSum / resultRows.length).toFixed(1)) : 0;

    res.json({
      student: {
        id: targetStudent.id,
        fullName: targetStudent.fullName,
        admissionNumber: targetStudent.admissionNumber,
        gender: targetStudent.gender,
        className: resultRows[0]?.className || studentRows[0].className || 'Assigned Class',
        isDemo: targetStudent.isDemo,
      },
      session: sessionRows[0] || null,
      term: termRows[0] || null,
      results: resultRows.map((r) => ({
        id: r.result.id,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        caScore: r.result.caScore,
        examScore: r.result.examScore,
        totalScore: r.result.totalScore,
        grade: r.result.grade,
        remark: r.result.remark,
        approvedByHeadteacher: r.result.approvedByHeadteacher,
      })),
      meta: metaRows[0] || null,
      summary: {
        totalScoreSum,
        averageScore,
        subjectCount: resultRows.length,
        position,
        classTotalStudents,
      },
      settings,
    });
  } catch (error) {
    console.error('Portal results error:', error);
    res.status(500).json({ error: 'Unable to load examination results.' });
  }
});

const transferSubmitSchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: z.number().int().positive(),
  reference: z.string().trim().min(3, 'Bank transfer reference is required').max(120),
  notes: z.string().trim().max(300).optional().default(''),
});

portalRouter.post('/payments/submit-transfer', async (req: AuthRequest, res) => {
  try {
    const user = req.appUser!;
    const parsed = transferSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid transfer details.' });
    }

    const { invoiceId, amount, reference, notes } = parsed.data;
    const invRows = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
    if (invRows.length === 0) {
      return res.status(404).json({ error: 'Fee invoice not found.' });
    }

    const invoice = invRows[0];
    const stuRows = await db.select().from(students).where(eq(students.id, invoice.studentId)).limit(1);
    if (stuRows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (user.role === 'parent' && stuRows[0].parentUserId !== user.id) {
      return res.status(403).json({ error: 'You can only submit payment references for your own children.' });
    }
    if (user.role === 'student' && stuRows[0].userId !== user.id) {
      return res.status(403).json({ error: 'You can only submit payment references for your own invoice.' });
    }

    const receiptNumber = `TRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Bank transfer ALWAYS starts as 'Pending Verification' — NEVER automatically marked paid!
    const [payment] = await db
      .insert(feePayments)
      .values({
        receiptNumber,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount,
        paymentMethod: 'Bank Transfer',
        reference,
        verificationStatus: 'Pending Verification',
        recordedByUserId: user.id,
        notes: notes || 'Submitted via Parent Portal awaiting Bursar verification.',
        isDemo: invoice.isDemo,
      })
      .returning();

    res.status(201).json({
      payment,
      message:
        'Bank transfer reference submitted. It remains Pending Verification until confirmed by the School Accountant.',
    });
  } catch (error) {
    console.error('Transfer submission error:', error);
    res.status(500).json({ error: 'Unable to submit transfer reference.' });
  }
});

portalRouter.post('/payments/paystack-verify', async (req: AuthRequest, res) => {
  try {
    const user = req.appUser!;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return res.status(400).json({
        error:
          'Online Paystack payment is not yet configured. Set PAYSTACK_SECRET_KEY in environment secrets or submit a Bank Transfer for verification.',
      });
    }

    const invoiceId = Number(req.body?.invoiceId);
    const reference = String(req.body?.reference || '').trim();
    if (!invoiceId || !reference) {
      return res.status(400).json({ error: 'Invoice ID and Paystack reference are required.' });
    }

    const invRows = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
    if (invRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const invoice = invRows[0];

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      }
    );
    const verifyData = (await verifyRes.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number };
    };

    if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== 'success') {
      return res.status(400).json({ error: 'Paystack transaction could not be verified as paid.' });
    }

    const paidNaira = Math.round((verifyData.data.amount || 0) / 100);
    const receiptNumber = `PSK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const [payment] = await db
      .insert(feePayments)
      .values({
        receiptNumber,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount: paidNaira,
        paymentMethod: 'Paystack',
        reference,
        verificationStatus: 'Verified',
        recordedByUserId: user.id,
        verifiedByUserId: user.id,
        notes: 'Verified via Paystack API.',
        isDemo: invoice.isDemo,
      })
      .returning();

    const newPaid = invoice.amountPaid + paidNaira;
    const newStatus = newPaid >= invoice.amountDue ? 'Paid' : 'Partial';
    await db
      .update(feeInvoices)
      .set({ amountPaid: newPaid, status: newStatus })
      .where(eq(feeInvoices.id, invoice.id));

    res.json({ payment });
  } catch (error) {
    console.error('Paystack verification error:', error);
    res.status(500).json({ error: 'Unable to verify Paystack payment.' });
  }
});
