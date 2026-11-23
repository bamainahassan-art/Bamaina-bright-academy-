import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  academicCalendarItems,
  academicSessions,
  academicTerms,
  assignmentsAndMaterials,
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
} from '../db/schema.ts';
import { hashPassword } from './auth.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

export async function runSeed(): Promise<void> {
  // 1. School settings (never invent actual stats, phone, email, or exact GPS coordinates)
  const existingSettings = await db.select().from(schoolSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schoolSettings).values({
      schoolName: 'Bamaina Bright Academy',
      tagline: 'Building Bright Minds, Inspiring Great Futures.',
      address: 'Bamaina Town, Birnin Kudu Local Government Area, Jigawa State, Nigeria',
      phone: '',
      email: '',
      whatsapp: '',
      mapsEmbedUrl: '',
      mapsQuery: 'Bamaina Town, Birnin Kudu LGA, Jigawa State, Nigeria',
      statStudents: '—',
      statTeachers: '—',
      statClasses: '—',
      statYears: '—',
      welcomeTitle: 'Nurturing Foundational Excellence in Bamaina Town',
      welcomeMessage:
        'At Bamaina Bright Academy, we are committed to providing quality foundational Nursery and Primary education that develops intellectual abilities, encourages creativity, builds lasting confidence, and promotes good moral values in a safe, supportive community.',
      aboutHistory:
        'Established to serve families across Bamaina Town and Birnin Kudu Local Government Area in Jigawa State, Bamaina Bright Academy combines disciplined foundational instruction with child-centred care. Official founding history and milestones can be updated directly from the School Administration Dashboard.',
      visionStatement:
        'To become a leading centre of foundational education, nurturing knowledgeable, confident, disciplined, and responsible future leaders.',
      missionStatement:
        'To provide accessible, quality, and child-centred education that develops intellectual ability, moral character, creativity, and lifelong learning skills.',
      philosophyStatement:
        'Every child learns best when high academic standards are paired with warm personal attention, moral discipline, hands-on discovery, and close collaboration with parents.',
      classPositionsEnabled: true,
    });
  }

  // 2. Editable leadership placeholders
  const existingLeadership = await db.select().from(leadershipStaff).limit(1);
  if (existingLeadership.length === 0) {
    await db.insert(leadershipStaff).values([
      {
        titleRole: 'Proprietor / School Director',
        fullName: 'To be updated by Administration',
        bio: 'Provides overall strategic direction, governance, and community partnership for Bamaina Bright Academy.',
        displayOrder: 1,
      },
      {
        titleRole: 'Headteacher',
        fullName: 'To be updated by Administration',
        bio: 'Oversees academic standards, teacher supervision, pupil welfare, and examination quality across Nursery and Primary levels.',
        displayOrder: 2,
      },
      {
        titleRole: 'Deputy Headteacher (Academics)',
        fullName: 'To be updated by Administration',
        bio: 'Coordinates curriculum implementation, continuous assessments, and instructional support.',
        displayOrder: 3,
      },
      {
        titleRole: 'School Bursar / Accountant',
        fullName: 'To be updated by Administration',
        bio: 'Manages termly fee administration, payment verification, receipts, and financial transparency.',
        displayOrder: 4,
      },
    ]);
  }

  // 3. Classes (Nursery 1-3, Primary 1-6)
  const existingClasses = await db.select().from(schoolClasses);
  if (existingClasses.length === 0) {
    await db.insert(schoolClasses).values([
      { name: 'Nursery One', section: 'Nursery', levelOrder: 1, isActive: true, description: 'Early childhood foundation, play-based phonics, and social development.' },
      { name: 'Nursery Two', section: 'Nursery', levelOrder: 2, isActive: true, description: 'Pre-reading fluency, number sense, creative expression, and moral habits.' },
      { name: 'Nursery Three', section: 'Nursery', levelOrder: 3, isActive: true, description: 'School-readiness bridge into Primary literacy and numeracy (can be toggled by admin).' },
      { name: 'Primary One', section: 'Primary', levelOrder: 4, isActive: true, description: 'Foundational English, Mathematics, Basic Science, and civic values.' },
      { name: 'Primary Two', section: 'Primary', levelOrder: 5, isActive: true, description: 'Structured reading comprehension, arithmetic operations, and computer awareness.' },
      { name: 'Primary Three', section: 'Primary', levelOrder: 6, isActive: true, description: 'Expanding scientific inquiry, language skills, and creative projects.' },
      { name: 'Primary Four', section: 'Primary', levelOrder: 7, isActive: true, description: 'Upper primary critical thinking, digital literacy, and collaborative problem-solving.' },
      { name: 'Primary Five', section: 'Primary', levelOrder: 8, isActive: true, description: 'Advanced primary curriculum mastery, leadership habits, and analytical writing.' },
      { name: 'Primary Six', section: 'Primary', levelOrder: 9, isActive: true, description: 'Primary completion readiness, examination preparation, and character leadership.' },
    ]);
  }

  // 4. Subjects
  const existingSubjects = await db.select().from(subjects);
  if (existingSubjects.length === 0) {
    await db.insert(subjects).values([
      { name: 'Early Literacy & Phonics', code: 'NUR-LIT', section: 'Nursery', isActive: true },
      { name: 'Early Numeracy & Shapes', code: 'NUR-NUM', section: 'Nursery', isActive: true },
      { name: 'Creative Play & Rhymes', code: 'NUR-CRE', section: 'Nursery', isActive: true },
      { name: 'English Language', code: 'PRI-ENG', section: 'Primary', isActive: true },
      { name: 'Mathematics', code: 'PRI-MTH', section: 'Primary', isActive: true },
      { name: 'Basic Science & Technology', code: 'PRI-BST', section: 'Primary', isActive: true },
      { name: 'Social & Civic Education', code: 'PRI-SCE', section: 'Primary', isActive: true },
      { name: 'Computer Education', code: 'PRI-CMP', section: 'Primary', isActive: true },
      { name: 'Religious & Moral Education', code: 'ALL-RME', section: 'Both', isActive: true },
      { name: 'Creative Arts', code: 'ALL-ART', section: 'Both', isActive: true },
    ]);
  }

  // 5. Academic Sessions & Terms
  let sessionId: number;
  let termId: number;
  const existingSessions = await db.select().from(academicSessions);
  if (existingSessions.length === 0) {
    const [sess] = await db
      .insert(academicSessions)
      .values({ name: '2025/2026', isCurrent: true })
      .returning();
    sessionId = sess.id;

    const insertedTerms = await db
      .insert(academicTerms)
      .values([
        { sessionId, name: 'First Term', startsAt: 'September', endsAt: 'December', isCurrent: true },
        { sessionId, name: 'Second Term', startsAt: 'January', endsAt: 'April', isCurrent: false },
        { sessionId, name: 'Third Term', startsAt: 'April', endsAt: 'July', isCurrent: false },
      ])
      .returning();
    termId = insertedTerms[0].id;
  } else {
    sessionId = existingSessions[0].id;
    const terms = await db.select().from(academicTerms).where(eq(academicTerms.sessionId, sessionId));
    termId = terms[0]?.id ?? 1;
  }

  // 6. Academic Calendar
  const existingCal = await db.select().from(academicCalendarItems).limit(1);
  if (existingCal.length === 0) {
    await db.insert(academicCalendarItems).values([
      { sessionId, termName: 'First Term', title: 'School Resumption & Orientation', eventDate: 'Week 1 (Term Start)', category: 'Resumption', description: 'Welcome assembly and class placement check for Nursery and Primary pupils.' },
      { sessionId, termName: 'First Term', title: 'Continuous Assessment & Open Day', eventDate: 'Week 6', category: 'PTA / Event', description: 'Mid-term progress review between parents and class teachers.' },
      { sessionId, termName: 'First Term', title: 'End-of-Term Examinations', eventDate: 'Week 11', category: 'Examination', description: 'Summative assessments across all approved subjects.' },
      { sessionId, termName: 'First Term', title: 'Report Card Publication & Closing', eventDate: 'Week 13', category: 'Holiday', description: 'Verified termly report cards released via the Parent and Student Portal.' },
    ]);
  }

  // 7. Gallery using generated school images
  const existingGallery = await db.select().from(galleryItems).limit(1);
  if (existingGallery.length === 0) {
    await db.insert(galleryItems).values([
      {
        title: 'Foundational Reading & Numeracy',
        category: 'Primary Classroom',
        caption: 'Pupils engaging with storybooks and wooden numeracy blocks in a sunlit classroom.',
        imageUrl: '/src/assets/images/hero_nursery_primary_1795434531980.jpg',
      },
      {
        title: 'Bamaina Bright Academy Courtyard',
        category: 'School Facilities',
        caption: 'Shaded campus courtyard designed for safe learning and outdoor movement.',
        imageUrl: '/src/assets/images/about_campus_courtyard_1795434565564.jpg',
      },
      {
        title: 'Early Childhood Discovery',
        category: 'Nursery Classroom',
        caption: 'Nursery pupils building early alphabet and counting confidence through guided play.',
        imageUrl: '/src/assets/images/nursery_learning_play_1795434531453.jpg',
      },
      {
        title: 'Basic Science & Computer Studies',
        category: 'Teachers & Students',
        caption: 'Primary pupils exploring science instruments and introductory computing with their teacher.',
        imageUrl: '/src/assets/images/primary_computer_science_1795434533097.jpg',
      },
      {
        title: 'Inter-House Teamwork & Field Day',
        category: 'Sports & Extracurricular',
        caption: 'Pupils participating in structured physical education and team games.',
        imageUrl: '/src/assets/images/sports_cultural_day_1795434531812.jpg',
      },
    ]);
  }

  // 8. News & Events
  const existingNews = await db.select().from(newsAndEvents).limit(1);
  if (existingNews.length === 0) {
    await db.insert(newsAndEvents).values([
      {
        title: 'Online Admission Portal Now Open for Nursery & Primary Classes',
        category: 'Admission',
        eventDate: 'Current Academic Session',
        location: 'Bamaina Bright Academy, Birnin Kudu LGA',
        summary: 'Parents and guardians can now submit admission applications online and track review status in real time.',
        content:
          'Families in Bamaina Town and surrounding communities in Birnin Kudu Local Government Area can complete the online admission form for Nursery and Primary classes, receive a unique reference number immediately, and download an official acknowledgement slip.',
        imageUrl: '/src/assets/images/about_campus_courtyard_1795434565564.jpg',
        isPublished: true,
      },
      {
        title: 'Parent-Teacher Academic Review & Orientation',
        category: 'Event',
        eventDate: 'Term Mid-Point',
        location: 'Main Assembly Hall, Bamaina Bright Academy',
        summary: 'Strengthening home-school partnership for pupil literacy, numeracy, and character development.',
        content:
          'All parents and guardians are invited to review termly continuous assessment milestones, attendance records, and homework routines with class teachers.',
        imageUrl: '/src/assets/images/nursery_learning_play_1795434531453.jpg',
        isPublished: true,
      },
      {
        title: 'Digital Results & Fee Receipt Portal Launched',
        category: 'Announcement',
        eventDate: 'Academic Update',
        location: 'Online School Portal',
        summary: 'Parents can view verified fee receipts, invoices, attendance, and downloadable PDF report cards online.',
        content:
          'Our secure Student and Parent Portal gives families convenient mobile access to approved examination results, payment verification status, and classroom learning materials.',
        imageUrl: '/src/assets/images/primary_computer_science_1795434533097.jpg',
        isPublished: true,
      },
    ]);
  }

  // 9. Clearly labelled Demo Mode sample accounts & sample records (only if no demo users exist yet)
  const existingDemoUsers = await db.select().from(users).where(eq(users.isDemo, true)).limit(1);
  if (existingDemoUsers.length === 0) {
    const demoPassHash = hashPassword('DemoAcademy2026!');

    const [demoAdmin] = await db
      .insert(users)
      .values({
        uid: 'demo_super_admin',
        email: 'demo.admin@bamainabright.demo',
        fullName: 'Sample Super Admin (Demo)',
        role: 'super_admin',
        staffOrAdmissionId: 'DEMO-ADM-01',
        passwordHash: demoPassHash,
        isActive: true,
        isDemo: true,
      })
      .returning();

    const [demoHead] = await db
      .insert(users)
      .values({
        uid: 'demo_headteacher',
        email: 'demo.headteacher@bamainabright.demo',
        fullName: 'Sample Headteacher (Demo)',
        role: 'headteacher',
        staffOrAdmissionId: 'DEMO-HT-01',
        passwordHash: demoPassHash,
        isActive: true,
        isDemo: true,
      })
      .returning();

    const [demoAccountant] = await db
      .insert(users)
      .values({
        uid: 'demo_accountant',
        email: 'demo.accountant@bamainabright.demo',
        fullName: 'Sample Bursar / Accountant (Demo)',
        role: 'accountant',
        staffOrAdmissionId: 'DEMO-ACC-01',
        passwordHash: demoPassHash,
        isActive: true,
        isDemo: true,
      })
      .returning();

    const [demoTeacher] = await db
      .insert(users)
      .values({
        uid: 'demo_teacher',
        email: 'demo.teacher@bamainabright.demo',
        fullName: 'Sample Class Teacher (Demo)',
        role: 'teacher',
        staffOrAdmissionId: 'DEMO-TCH-01',
        passwordHash: demoPassHash,
        isActive: true,
        isDemo: true,
      })
      .returning();

    const [demoParent] = await db
      .insert(users)
      .values({
        uid: 'demo_parent',
        email: 'demo.parent@bamainabright.demo',
        fullName: 'Sample Parent Account (Demo)',
        role: 'parent',
        staffOrAdmissionId: 'DEMO-PAR-01',
        address: 'Sample Address, Bamaina Town (Demo)',
        passwordHash: demoPassHash,
        isActive: true,
        isDemo: true,
      })
      .returning();

    const [demoStudentUser] = await db
      .insert(users)
      .values({
        uid: 'demo_student',
        email: 'demo.student@bamainabright.demo',
        fullName: 'Sample Pupil — Amina Bello (Demo)',
        role: 'student',
        staffOrAdmissionId: 'DEMO/BBA/2026/001',
        passwordHash: demoPassHash,
        isActive: true,
        isDemo: true,
      })
      .returning();

    const allClasses = await db.select().from(schoolClasses);
    const primaryFour = allClasses.find((c) => c.name === 'Primary Four') || allClasses[0];
    const nurseryTwo = allClasses.find((c) => c.name === 'Nursery Two') || allClasses[0];

    const allSubjects = await db.select().from(subjects);
    const eng = allSubjects.find((s) => s.code === 'PRI-ENG') || allSubjects[0];
    const mth = allSubjects.find((s) => s.code === 'PRI-MTH') || allSubjects[1];
    const bst = allSubjects.find((s) => s.code === 'PRI-BST') || allSubjects[2];
    const cmp = allSubjects.find((s) => s.code === 'PRI-CMP') || allSubjects[3];

    if (demoTeacher && primaryFour && eng && mth) {
      await db.insert(teacherAssignments).values([
        { teacherUserId: demoTeacher.id, classId: primaryFour.id, subjectId: eng.id },
        { teacherUserId: demoTeacher.id, classId: primaryFour.id, subjectId: mth.id },
        { teacherUserId: demoTeacher.id, classId: primaryFour.id, subjectId: bst?.id ?? null },
        { teacherUserId: demoTeacher.id, classId: primaryFour.id, subjectId: cmp?.id ?? null },
      ]);
    }

    const [demoStudent1] = await db
      .insert(students)
      .values({
        userId: demoStudentUser.id,
        parentUserId: demoParent.id,
        admissionNumber: 'DEMO/BBA/2026/001',
        fullName: 'Amina Bello [Sample Demo]',
        dateOfBirth: '2016-05-14',
        gender: 'Female',
        classId: primaryFour.id,
        residentialAddress: 'Sample Ward, Bamaina Town (Demo Record)',
        guardianName: 'Sample Parent Account (Demo)',
        guardianPhone: 'Sample Demo Contact',
        guardianEmail: 'demo.parent@bamainabright.demo',
        status: 'Active',
        isDemo: true,
      })
      .returning();

    const [demoStudent2] = await db
      .insert(students)
      .values({
        userId: null,
        parentUserId: demoParent.id,
        admissionNumber: 'DEMO/BBA/2026/002',
        fullName: 'Yusuf Bello [Sample Demo]',
        dateOfBirth: '2021-09-10',
        gender: 'Male',
        classId: nurseryTwo.id,
        residentialAddress: 'Sample Ward, Bamaina Town (Demo Record)',
        guardianName: 'Sample Parent Account (Demo)',
        guardianPhone: 'Sample Demo Contact',
        guardianEmail: 'demo.parent@bamainabright.demo',
        status: 'Active',
        isDemo: true,
      })
      .returning();

    // Sample fee structures (clearly labelled demo)
    const [nurFee] = await db
      .insert(feeStructures)
      .values({
        sessionId,
        termId,
        section: 'Nursery',
        title: 'Sample Nursery Term Fee Structure (Demo)',
        tuitionAmount: 18000,
        developmentLevy: 3000,
        booksAndMaterials: 4000,
        examFee: 1500,
        totalAmount: 26500,
        isDemo: true,
      })
      .returning();

    const [priFee] = await db
      .insert(feeStructures)
      .values({
        sessionId,
        termId,
        section: 'Primary',
        title: 'Sample Primary Term Fee Structure (Demo)',
        tuitionAmount: 22000,
        developmentLevy: 3500,
        booksAndMaterials: 5000,
        examFee: 2000,
        totalAmount: 32500,
        isDemo: true,
      })
      .returning();

    const [inv1] = await db
      .insert(feeInvoices)
      .values({
        invoiceNumber: 'DEMO-INV-2026-001',
        studentId: demoStudent1.id,
        sessionId,
        termId,
        feeStructureId: priFee.id,
        description: 'Sample Primary Four Termly Fees (Demo)',
        amountDue: 32500,
        amountPaid: 32500,
        status: 'Paid',
        dueDate: '2026-10-15',
        isDemo: true,
      })
      .returning();

    await db.insert(feeInvoices).values({
      invoiceNumber: 'DEMO-INV-2026-002',
      studentId: demoStudent2.id,
      sessionId,
      termId,
      feeStructureId: nurFee.id,
      description: 'Sample Nursery Two Termly Fees (Demo)',
      amountDue: 26500,
      amountPaid: 15000,
      status: 'Partial',
      dueDate: '2026-10-15',
      isDemo: true,
    });

    await db.insert(feePayments).values({
      receiptNumber: 'DEMO-RCP-2026-001',
      invoiceId: inv1.id,
      studentId: demoStudent1.id,
      amount: 32500,
      paymentMethod: 'Cash',
      reference: 'DEMO-CASH-001',
      verificationStatus: 'Verified',
      recordedByUserId: demoAccountant.id,
      verifiedByUserId: demoAccountant.id,
      notes: 'Sample verified cash payment for Demo Mode testing.',
      isDemo: true,
    });

    // Sample results for Demo Student 1
    const sampleScores = [
      { subjectId: eng.id, caScore: 34, examScore: 51, totalScore: 85, grade: 'A', remark: 'Excellent' },
      { subjectId: mth.id, caScore: 31, examScore: 47, totalScore: 78, grade: 'A', remark: 'Excellent' },
      { subjectId: bst.id, caScore: 29, examScore: 42, totalScore: 71, grade: 'B', remark: 'Very Good' },
      { subjectId: cmp.id, caScore: 35, examScore: 53, totalScore: 88, grade: 'A', remark: 'Excellent' },
    ];

    await db.insert(studentResults).values(
      sampleScores.map((s) => ({
        studentId: demoStudent1.id,
        sessionId,
        termId,
        classId: primaryFour.id,
        subjectId: s.subjectId,
        caScore: s.caScore,
        examScore: s.examScore,
        totalScore: s.totalScore,
        grade: s.grade,
        remark: s.remark,
        enteredByUserId: demoTeacher.id,
        approvedByHeadteacher: true,
        isDemo: true,
      }))
    );

    await db.insert(termReportMeta).values({
      studentId: demoStudent1.id,
      sessionId,
      termId,
      classId: primaryFour.id,
      daysPresent: 58,
      daysOpened: 60,
      teacherRemark: 'Sample Remark: Consistently attentive and cooperative in class activities.',
      headteacherRemark: 'Sample Remark: Commendable academic progress. Keep up the dedication.',
      approved: true,
      isDemo: true,
    });

    await db.insert(assignmentsAndMaterials).values([
      {
        classId: primaryFour.id,
        subjectId: eng.id,
        title: 'Sample Comprehension & Grammar Practice (Demo)',
        type: 'Assignment',
        description: 'Read Passage 4 and answer comprehension questions 1–5 in your English exercise book.',
        dueDate: 'Friday',
        postedByUserId: demoTeacher.id,
        isDemo: true,
      },
      {
        classId: primaryFour.id,
        subjectId: mth.id,
        title: 'Sample Fractions & Decimals Revision Guide (Demo)',
        type: 'Learning Material',
        description: 'Step-by-step classroom notes covering equivalent fractions and simple word problems.',
        postedByUserId: demoTeacher.id,
        isDemo: true,
      },
    ]);

    await db.insert(testimonials).values([
      {
        parentName: 'Sample Parent Feedback (Demo)',
        parentRole: 'Demo Parent · Primary Four',
        quote:
          'This clearly labelled sample testimonial illustrates how parents can share verified experiences once published by school administration.',
        isDemo: true,
        isPublished: true,
      },
    ]);

    void demoAdmin;
    void demoHead;
  }
}
