import { Router } from 'express';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  academicCalendarItems,
  academicSessions,
  academicTerms,
  admissions,
  contactEnquiries,
  galleryItems,
  leadershipStaff,
  newsAndEvents,
  schoolClasses,
  schoolSettings,
  students,
  subjects,
  testimonials,
} from '../../db/schema.ts';
import { ensureSeeded } from '../seed.ts';

export const publicRouter = Router();

publicRouter.get('/bootstrap', async (_req, res) => {
  try {
    await ensureSeeded();

    const [settingsRows, leadershipRows, classRows, subjectRows, newsRows, galleryRows, testimonialRows, sessionRows, termRows, calendarRows] =
      await Promise.all([
        db.select().from(schoolSettings).limit(1),
        db.select().from(leadershipStaff).orderBy(asc(leadershipStaff.displayOrder)),
        db.select().from(schoolClasses).orderBy(asc(schoolClasses.levelOrder)),
        db.select().from(subjects).where(eq(subjects.isActive, true)).orderBy(asc(subjects.name)),
        db
          .select()
          .from(newsAndEvents)
          .where(eq(newsAndEvents.isPublished, true))
          .orderBy(desc(newsAndEvents.createdAt)),
        db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt)),
        db
          .select()
          .from(testimonials)
          .where(eq(testimonials.isPublished, true))
          .orderBy(desc(testimonials.createdAt)),
        db.select().from(academicSessions).orderBy(desc(academicSessions.isCurrent)),
        db.select().from(academicTerms).orderBy(asc(academicTerms.id)),
        db.select().from(academicCalendarItems).orderBy(asc(academicCalendarItems.id)),
      ]);

    const currentSession = sessionRows.find((s) => s.isCurrent) || sessionRows[0] || null;
    const currentTerm =
      termRows.find((t) => t.isCurrent && t.sessionId === currentSession?.id) ||
      termRows[0] ||
      null;

    res.json({
      settings: settingsRows[0] || null,
      leadership: leadershipRows,
      classes: classRows,
      subjects: subjectRows,
      news: newsRows,
      gallery: galleryRows,
      testimonials: testimonialRows,
      sessions: sessionRows,
      terms: termRows,
      currentSession,
      currentTerm,
      calendar: calendarRows,
    });
  } catch (error) {
    console.error('Public bootstrap failed:', error);
    res.status(500).json({ error: 'Unable to load school information.' });
  }
});

const admissionSchema = z.object({
  studentFullName: z.string().trim().min(2, 'Student full name is required').max(150),
  dateOfBirth: z.string().trim().min(4, 'Date of birth is required').max(30),
  gender: z.enum(['Male', 'Female']),
  applyingClassId: z.number().int().positive(),
  previousSchool: z.string().trim().max(160).optional().default(''),
  studentAddress: z.string().trim().min(4, 'Residential address is required').max(300),
  passportDataUrl: z.string().max(1_500_000).optional().default(''),
  parentFullName: z.string().trim().min(2, 'Parent/Guardian name is required').max(150),
  parentPhone: z.string().trim().min(6, 'Phone number is required').max(40),
  parentEmail: z.string().trim().email('Valid email required').or(z.literal('')).optional().default(''),
  parentAddress: z.string().trim().min(4, 'Parent address is required').max(300),
  relationship: z.string().trim().min(2, 'Relationship is required').max(60),
  medicalInfo: z.string().trim().max(1000).optional().default(''),
  emergencyContact: z.string().trim().min(5, 'Emergency contact is required').max(150),
  supportingDocName: z.string().trim().max(160).optional().default(''),
  supportingDocDataUrl: z.string().max(2_000_000).optional().default(''),
});

publicRouter.post('/admissions', async (req, res) => {
  try {
    await ensureSeeded();
    const parsed = admissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please check all required admission fields.',
      });
    }

    const data = parsed.data;
    const classRows = await db
      .select()
      .from(schoolClasses)
      .where(eq(schoolClasses.id, data.applyingClassId))
      .limit(1);

    if (classRows.length === 0 || !classRows[0].isActive) {
      return res.status(400).json({ error: 'Selected class is not currently open for admission.' });
    }

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const refNumber = `BBA-ADM-${year}-${randomSuffix}`;

    const [created] = await db
      .insert(admissions)
      .values({
        referenceNumber: refNumber,
        studentFullName: data.studentFullName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        applyingClassId: classRows[0].id,
        applyingClassName: classRows[0].name,
        previousSchool: data.previousSchool || null,
        studentAddress: data.studentAddress,
        passportDataUrl: data.passportDataUrl || null,
        parentFullName: data.parentFullName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail || null,
        parentAddress: data.parentAddress,
        relationship: data.relationship,
        medicalInfo: data.medicalInfo || null,
        emergencyContact: data.emergencyContact,
        supportingDocName: data.supportingDocName || null,
        supportingDocDataUrl: data.supportingDocDataUrl || null,
        status: 'Submitted',
      })
      .returning();

    res.status(201).json({
      application: {
        id: created.id,
        referenceNumber: created.referenceNumber,
        studentFullName: created.studentFullName,
        dateOfBirth: created.dateOfBirth,
        gender: created.gender,
        applyingClassName: created.applyingClassName,
        parentFullName: created.parentFullName,
        parentPhone: created.parentPhone,
        parentEmail: created.parentEmail,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error('Admission submission error:', error);
    res.status(500).json({ error: 'Unable to submit admission application right now.' });
  }
});

publicRouter.get('/admissions/status', async (req, res) => {
  try {
    await ensureSeeded();
    const ref = String(req.query.ref || '').trim().toUpperCase();
    if (!ref) {
      return res.status(400).json({ error: 'Please enter an application reference number.' });
    }

    const rows = await db
      .select()
      .from(admissions)
      .where(eq(admissions.referenceNumber, ref))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No admission application found with that reference number.' });
    }

    const appRecord = rows[0];
    let admittedAdmissionNumber: string | null = null;
    if (appRecord.admittedStudentId) {
      const stu = await db
        .select({ admissionNumber: students.admissionNumber })
        .from(students)
        .where(eq(students.id, appRecord.admittedStudentId))
        .limit(1);
      admittedAdmissionNumber = stu[0]?.admissionNumber || null;
    }

    // Return non-confidential status fields only (privacy-conscious NDPA handling)
    res.json({
      referenceNumber: appRecord.referenceNumber,
      studentFullName: appRecord.studentFullName,
      applyingClassName: appRecord.applyingClassName,
      parentFullName: appRecord.parentFullName,
      status: appRecord.status,
      adminNotes: appRecord.adminNotes,
      admittedAdmissionNumber,
      createdAt: appRecord.createdAt,
      updatedAt: appRecord.updatedAt,
    });
  } catch (error) {
    console.error('Admission status lookup error:', error);
    res.status(500).json({ error: 'Unable to check admission status.' });
  }
});

const contactSchema = z.object({
  senderName: z.string().trim().min(2, 'Your name is required').max(120),
  senderEmail: z.string().trim().email('Valid email required').or(z.literal('')).optional().default(''),
  senderPhone: z.string().trim().min(6, 'Phone number is required').max(40),
  subject: z.string().trim().min(2, 'Subject is required').max(150),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
});

publicRouter.post('/contact', async (req, res) => {
  try {
    await ensureSeeded();
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please complete all required enquiry fields.',
      });
    }

    const data = parsed.data;
    const [created] = await db
      .insert(contactEnquiries)
      .values({
        senderName: data.senderName,
        senderEmail: data.senderEmail || null,
        senderPhone: data.senderPhone,
        subject: data.subject,
        message: data.message,
      })
      .returning();

    res.status(201).json({ enquiryId: created.id, message: 'Enquiry received successfully.' });
  } catch (error) {
    console.error('Contact enquiry error:', error);
    res.status(500).json({ error: 'Unable to send your enquiry.' });
  }
});
