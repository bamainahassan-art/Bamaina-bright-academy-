import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('parent'),
  phone: text('phone'),
  address: text('address'),
  passwordHash: text('password_hash'),
  staffOrAdmissionId: text('staff_or_admission_id').unique(),
  isActive: boolean('is_active').notNull().default(true),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const schoolSettings = pgTable('school_settings', {
  id: serial('id').primaryKey(),
  schoolName: text('school_name').notNull().default('Bamaina Bright Academy'),
  tagline: text('tagline')
    .notNull()
    .default('Building Bright Minds, Inspiring Great Futures.'),
  address: text('address')
    .notNull()
    .default(
      'Bamaina Town, Birnin Kudu Local Government Area, Jigawa State, Nigeria'
    ),
  phone: text('phone').default(''),
  email: text('email').default(''),
  whatsapp: text('whatsapp').default(''),
  mapsEmbedUrl: text('maps_embed_url').default(''),
  mapsQuery: text('maps_query')
    .notNull()
    .default('Bamaina Town, Birnin Kudu LGA, Jigawa State, Nigeria'),
  statStudents: text('stat_students').notNull().default('—'),
  statTeachers: text('stat_teachers').notNull().default('—'),
  statClasses: text('stat_classes').notNull().default('—'),
  statYears: text('stat_years').notNull().default('—'),
  welcomeTitle: text('welcome_title')
    .notNull()
    .default('Nurturing Foundational Excellence in Bamaina Town'),
  welcomeMessage: text('welcome_message')
    .notNull()
    .default(
      'Bamaina Bright Academy is committed to providing quality foundational Nursery and Primary education that develops intellectual abilities, encourages creativity, builds lasting confidence, and promotes strong moral values in a safe, supportive community.'
    ),
  aboutHistory: text('about_history')
    .notNull()
    .default(
      'Established to serve families across Bamaina Town and Birnin Kudu Local Government Area in Jigawa State, Bamaina Bright Academy combines disciplined foundational instruction with child-centred care. Historical milestones and founding dates can be updated directly by the school administration.'
    ),
  visionStatement: text('vision_statement')
    .notNull()
    .default(
      'To become a leading centre of foundational education, nurturing knowledgeable, confident, disciplined, and responsible future leaders.'
    ),
  missionStatement: text('mission_statement')
    .notNull()
    .default(
      'To provide accessible, quality, and child-centred education that develops intellectual ability, moral character, creativity, and lifelong learning skills.'
    ),
  philosophyStatement: text('philosophy_statement')
    .notNull()
    .default(
      'We believe every child thrives when clear academic structure is paired with warmth, curiosity, ethical guidance, and active partnership between teachers and parents.'
    ),
  logoDataUrl: text('logo_data_url'),
  paystackPublicKey: text('paystack_public_key').default(''),
  paystackConfigured: boolean('paystack_configured').notNull().default(false),
  classPositionsEnabled: boolean('class_positions_enabled')
    .notNull()
    .default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leadershipStaff = pgTable('leadership_staff', {
  id: serial('id').primaryKey(),
  titleRole: text('title_role').notNull(),
  fullName: text('full_name').notNull(),
  bio: text('bio'),
  displayOrder: integer('display_order').notNull().default(0),
});

export const academicSessions = pgTable('academic_sessions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  isCurrent: boolean('is_current').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const academicTerms = pgTable('academic_terms', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => academicSessions.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  startsAt: text('starts_at'),
  endsAt: text('ends_at'),
  isCurrent: boolean('is_current').notNull().default(false),
});

export const schoolClasses = pgTable('school_classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  section: text('section').notNull(),
  levelOrder: integer('level_order').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  classTeacherUserId: integer('class_teacher_user_id').references(
    () => users.id,
    { onDelete: 'set null' }
  ),
  description: text('description'),
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  section: text('section').notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const teacherAssignments = pgTable('teacher_assignments', {
  id: serial('id').primaryKey(),
  teacherUserId: integer('teacher_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  classId: integer('class_id')
    .references(() => schoolClasses.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: integer('subject_id').references(() => subjects.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  parentUserId: integer('parent_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  admissionNumber: text('admission_number').notNull().unique(),
  fullName: text('full_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  gender: text('gender').notNull(),
  classId: integer('class_id').references(() => schoolClasses.id, {
    onDelete: 'set null',
  }),
  residentialAddress: text('residential_address').notNull(),
  guardianName: text('guardian_name').notNull(),
  guardianPhone: text('guardian_phone').notNull(),
  guardianEmail: text('guardian_email'),
  passportDataUrl: text('passport_data_url'),
  medicalNotes: text('medical_notes'),
  emergencyContact: text('emergency_contact'),
  status: text('status').notNull().default('Active'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const admissions = pgTable('admissions', {
  id: serial('id').primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  studentFullName: text('student_full_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  gender: text('gender').notNull(),
  applyingClassId: integer('applying_class_id').references(
    () => schoolClasses.id,
    { onDelete: 'set null' }
  ),
  applyingClassName: text('applying_class_name').notNull(),
  previousSchool: text('previous_school'),
  studentAddress: text('student_address').notNull(),
  passportDataUrl: text('passport_data_url'),
  parentFullName: text('parent_full_name').notNull(),
  parentPhone: text('parent_phone').notNull(),
  parentEmail: text('parent_email'),
  parentAddress: text('parent_address').notNull(),
  relationship: text('relationship').notNull(),
  medicalInfo: text('medical_info'),
  emergencyContact: text('emergency_contact').notNull(),
  supportingDocName: text('supporting_doc_name'),
  supportingDocDataUrl: text('supporting_doc_data_url'),
  status: text('status').notNull().default('Submitted'),
  adminNotes: text('admin_notes'),
  admittedStudentId: integer('admitted_student_id').references(
    () => students.id,
    { onDelete: 'set null' }
  ),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const feeStructures = pgTable('fee_structures', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => academicSessions.id, { onDelete: 'cascade' })
    .notNull(),
  termId: integer('term_id')
    .references(() => academicTerms.id, { onDelete: 'cascade' })
    .notNull(),
  section: text('section').notNull(),
  classId: integer('class_id').references(() => schoolClasses.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  tuitionAmount: integer('tuition_amount').notNull(),
  developmentLevy: integer('development_levy').notNull().default(0),
  booksAndMaterials: integer('books_and_materials').notNull().default(0),
  examFee: integer('exam_fee').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feeInvoices = pgTable('fee_invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: integer('session_id')
    .references(() => academicSessions.id, { onDelete: 'cascade' })
    .notNull(),
  termId: integer('term_id')
    .references(() => academicTerms.id, { onDelete: 'cascade' })
    .notNull(),
  feeStructureId: integer('fee_structure_id').references(
    () => feeStructures.id,
    { onDelete: 'set null' }
  ),
  description: text('description').notNull(),
  amountDue: integer('amount_due').notNull(),
  amountPaid: integer('amount_paid').notNull().default(0),
  status: text('status').notNull().default('Unpaid'),
  dueDate: text('due_date'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feePayments = pgTable('fee_payments', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  invoiceId: integer('invoice_id')
    .references(() => feeInvoices.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  reference: text('reference'),
  verificationStatus: text('verification_status').notNull(),
  recordedByUserId: integer('recorded_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  verifiedByUserId: integer('verified_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  notes: text('notes'),
  isDemo: boolean('is_demo').notNull().default(false),
  paidAt: timestamp('paid_at').defaultNow(),
});

export const studentResults = pgTable('student_results', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: integer('session_id')
    .references(() => academicSessions.id, { onDelete: 'cascade' })
    .notNull(),
  termId: integer('term_id')
    .references(() => academicTerms.id, { onDelete: 'cascade' })
    .notNull(),
  classId: integer('class_id')
    .references(() => schoolClasses.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: integer('subject_id')
    .references(() => subjects.id, { onDelete: 'cascade' })
    .notNull(),
  caScore: integer('ca_score').notNull().default(0),
  examScore: integer('exam_score').notNull().default(0),
  totalScore: integer('total_score').notNull().default(0),
  grade: text('grade').notNull(),
  remark: text('remark').notNull(),
  enteredByUserId: integer('entered_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  approvedByHeadteacher: boolean('approved_by_headteacher')
    .notNull()
    .default(false),
  isDemo: boolean('is_demo').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const termReportMeta = pgTable('term_report_meta', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: integer('session_id')
    .references(() => academicSessions.id, { onDelete: 'cascade' })
    .notNull(),
  termId: integer('term_id')
    .references(() => academicTerms.id, { onDelete: 'cascade' })
    .notNull(),
  classId: integer('class_id')
    .references(() => schoolClasses.id, { onDelete: 'cascade' })
    .notNull(),
  daysPresent: integer('days_present').notNull().default(0),
  daysOpened: integer('days_opened').notNull().default(0),
  teacherRemark: text('teacher_remark'),
  headteacherRemark: text('headteacher_remark'),
  approved: boolean('approved').notNull().default(false),
  isDemo: boolean('is_demo').notNull().default(false),
});

export const assignmentsAndMaterials = pgTable('assignments_and_materials', {
  id: serial('id').primaryKey(),
  classId: integer('class_id')
    .references(() => schoolClasses.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: integer('subject_id').references(() => subjects.id, {
    onDelete: 'set null',
  }),
  title: text('title').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  dueDate: text('due_date'),
  attachmentName: text('attachment_name'),
  attachmentDataUrl: text('attachment_data_url'),
  postedByUserId: integer('posted_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const academicCalendarItems = pgTable('academic_calendar_items', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => academicSessions.id, {
    onDelete: 'cascade',
  }),
  termName: text('term_name').notNull(),
  title: text('title').notNull(),
  eventDate: text('event_date').notNull(),
  category: text('category').notNull(),
  description: text('description'),
});

export const newsAndEvents = pgTable('news_and_events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  eventDate: text('event_date'),
  location: text('location'),
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const galleryItems = pgTable('gallery_items', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  caption: text('caption'),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  parentName: text('parent_name').notNull(),
  parentRole: text('parent_role').notNull(),
  quote: text('quote').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contactEnquiries = pgTable('contact_enquiries', {
  id: serial('id').primaryKey(),
  senderName: text('sender_name').notNull(),
  senderEmail: text('sender_email'),
  senderPhone: text('sender_phone').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('New'),
  createdAt: timestamp('created_at').defaultNow(),
});
