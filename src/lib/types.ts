export type UserRole =
  | 'super_admin'
  | 'headteacher'
  | 'accountant'
  | 'teacher'
  | 'parent'
  | 'student';

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  staffOrAdmissionId: string | null;
  isActive: boolean;
  isDemo: boolean;
}

export interface SchoolSettings {
  id: number;
  schoolName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  mapsEmbedUrl: string;
  mapsQuery: string;
  statStudents: string;
  statTeachers: string;
  statClasses: string;
  statYears: string;
  welcomeTitle: string;
  welcomeMessage: string;
  aboutHistory: string;
  visionStatement: string;
  missionStatement: string;
  philosophyStatement: string;
  logoDataUrl: string | null;
  paystackPublicKey: string;
  paystackConfigured: boolean;
  classPositionsEnabled: boolean;
}

export interface LeadershipItem {
  id: number;
  titleRole: string;
  fullName: string;
  bio: string | null;
  displayOrder: number;
}

export interface SchoolClass {
  id: number;
  name: string;
  section: 'Nursery' | 'Primary';
  levelOrder: number;
  isActive: boolean;
  classTeacherUserId: number | null;
  description: string | null;
}

export interface SubjectItem {
  id: number;
  name: string;
  code: string;
  section: 'Nursery' | 'Primary' | 'Both';
  isActive: boolean;
}

export interface SessionItem {
  id: number;
  name: string;
  isCurrent: boolean;
}

export interface TermItem {
  id: number;
  sessionId: number;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  isCurrent: boolean;
}

export interface CalendarItem {
  id: number;
  sessionId: number | null;
  termName: string;
  title: string;
  eventDate: string;
  category: string;
  description: string | null;
}

export interface NewsItem {
  id: number;
  title: string;
  category: string;
  eventDate: string | null;
  location: string | null;
  summary: string;
  content: string;
  imageUrl: string | null;
  isPublished: boolean;
  createdAt: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  caption: string | null;
  imageUrl: string;
  createdAt: string;
}

export interface TestimonialItem {
  id: number;
  parentName: string;
  parentRole: string;
  quote: string;
  isDemo: boolean;
  isPublished: boolean;
}

export interface PublicBootstrap {
  settings: SchoolSettings;
  leadership: LeadershipItem[];
  classes: SchoolClass[];
  subjects: SubjectItem[];
  news: NewsItem[];
  gallery: GalleryItem[];
  testimonials: TestimonialItem[];
  sessions: SessionItem[];
  terms: TermItem[];
  currentSession: SessionItem | null;
  currentTerm: TermItem | null;
  calendar: CalendarItem[];
}

export interface StudentRecord {
  id: number;
  userId: number | null;
  parentUserId: number | null;
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  classId: number | null;
  className?: string | null;
  classSection?: string | null;
  residentialAddress: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  passportDataUrl: string | null;
  medicalNotes?: string | null;
  emergencyContact: string | null;
  status: string;
  isDemo: boolean;
}

export interface InvoiceRecord {
  id: number;
  invoiceNumber: string;
  studentId: number;
  studentName?: string;
  admissionNumber?: string;
  className?: string | null;
  sessionId: number;
  sessionName?: string;
  termId: number;
  termName?: string;
  description: string;
  amountDue: number;
  amountPaid: number;
  status: 'Unpaid' | 'Partial' | 'Paid';
  dueDate: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  receiptNumber: string;
  invoiceId: number;
  invoiceNumber?: string;
  studentId: number;
  studentName?: string;
  admissionNumber?: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Paystack';
  reference: string | null;
  verificationStatus: 'Verified' | 'Pending Verification' | 'Rejected';
  notes: string | null;
  isDemo: boolean;
  paidAt: string;
}

export interface ResultSheetData {
  student: {
    id: number;
    fullName: string;
    admissionNumber: string;
    gender: string;
    className: string;
    isDemo: boolean;
  };
  session: SessionItem | null;
  term: TermItem | null;
  results: Array<{
    id: number;
    subjectName: string;
    subjectCode: string;
    caScore: number;
    examScore: number;
    totalScore: number;
    grade: string;
    remark: string;
    approvedByHeadteacher: boolean;
  }>;
  meta: {
    daysPresent: number;
    daysOpened: number;
    teacherRemark: string | null;
    headteacherRemark: string | null;
    approved: boolean;
  } | null;
  summary: {
    totalScoreSum: number;
    averageScore: number;
    subjectCount: number;
    position: number | null;
    classTotalStudents: number | null;
  };
  settings: SchoolSettings | null;
}
