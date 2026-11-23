import { jsPDF } from 'jspdf';
import type { InvoiceRecord, PaymentRecord, ResultSheetData, SchoolSettings } from './types';

function drawHeader(doc: jsPDF, title: string, settings?: SchoolSettings | null) {
  const schoolName = settings?.schoolName || 'BAMAINA BRIGHT ACADEMY';
  const tagline = settings?.tagline || 'Building Bright Minds, Inspiring Great Futures.';
  const address =
    settings?.address ||
    'Bamaina Town, Birnin Kudu Local Government Area, Jigawa State, Nigeria';

  doc.setFillColor(30, 58, 138); // Royal Blue
  doc.rect(0, 0, 210, 34, 'F');
  doc.setFillColor(245, 158, 11); // Golden Yellow accent bar
  doc.rect(0, 34, 210, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(schoolName.toUpperCase(), 105, 13, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(253, 230, 138);
  doc.text(tagline, 105, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(address, 105, 27, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 105, 47, { align: 'center' });
}

export function downloadAdmissionAcknowledgementPdf(
  application: {
    referenceNumber: string;
    studentFullName: string;
    dateOfBirth: string;
    gender: string;
    applyingClassName: string;
    parentFullName: string;
    parentPhone: string;
    parentEmail?: string | null;
    status: string;
    createdAt?: string;
  },
  settings?: SchoolSettings | null
) {
  const doc = new jsPDF();
  drawHeader(doc, 'ADMISSION APPLICATION ACKNOWLEDGEMENT', settings);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(18, 55, 174, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text(`Application Reference Number: ${application.referenceNumber}`, 24, 64);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Current Status: ${application.status}`, 24, 71);

  const rows: Array<[string, string]> = [
    ['Applicant Full Name', application.studentFullName],
    ['Date of Birth', application.dateOfBirth],
    ['Gender', application.gender],
    ['Class Applied For', application.applyingClassName],
    ['Parent / Guardian Name', application.parentFullName],
    ['Parent Phone Number', application.parentPhone],
    ['Parent Email', application.parentEmail || 'Not provided'],
    [
      'Date Submitted',
      application.createdAt
        ? new Date(application.createdAt).toLocaleDateString('en-NG')
        : new Date().toLocaleDateString('en-NG'),
    ],
  ];

  let y = 88;
  for (const [label, val] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 20, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, 85, y);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, y + 3, 190, y + 3);
    y += 11;
  }

  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Next Steps: Keep your Application Reference Number safely to track admission progress online via the Admissions page.',
    20,
    y + 10,
    { maxWidth: 170 }
  );

  doc.save(`${application.referenceNumber}-acknowledgement.pdf`);
}

export function downloadAdmissionLetterPdf(
  application: {
    referenceNumber: string;
    studentFullName: string;
    applyingClassName: string;
    parentFullName: string;
    admittedAdmissionNumber?: string | null;
    adminNotes?: string | null;
  },
  settings?: SchoolSettings | null
) {
  const doc = new jsPDF();
  drawHeader(doc, 'PROVISIONAL OFFER OF ADMISSION', settings);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  let y = 60;
  doc.text(`Date: ${new Date().toLocaleDateString('en-NG')}`, 20, y);
  y += 8;
  doc.text(`Reference: ${application.referenceNumber}`, 20, y);
  if (application.admittedAdmissionNumber) {
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`Assigned Admission Number: ${application.admittedAdmissionNumber}`, 20, y);
    doc.setFont('helvetica', 'normal');
  }

  y += 14;
  doc.text(`Dear ${application.parentFullName},`, 20, y);
  y += 10;

  const body = `We are pleased to inform you that following the review of your application (${application.referenceNumber}), ${application.studentFullName} has been offered admission into ${application.applyingClassName} at Bamaina Bright Academy.`;
  doc.text(body, 20, y, { maxWidth: 170 });
  y += 22;

  const instructions =
    application.adminNotes ||
    'Please report to the School Administration Office in Bamaina Town with copies of the pupil’s birth certificate and recent passport photographs for formal registration and uniform sizing.';
  doc.text(instructions, 20, y, { maxWidth: 170 });
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.text('Office of the Headteacher', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Bamaina Bright Academy, Birnin Kudu LGA, Jigawa State', 20, y + 6);

  doc.save(`${application.referenceNumber}-admission-letter.pdf`);
}

export function downloadFeeReceiptPdf(
  payment: PaymentRecord,
  invoice: InvoiceRecord | undefined,
  studentName: string,
  admissionNumber: string,
  settings?: SchoolSettings | null
) {
  const doc = new jsPDF();
  drawHeader(doc, 'OFFICIAL SCHOOL FEE PAYMENT RECEIPT', settings);

  if (payment.isDemo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 83, 9);
    doc.text('SAMPLE DEMONSTRATION RECEIPT — NOT A GENUINE FINANCIAL RECORD', 105, 55, {
      align: 'center',
    });
  }

  let y = 66;
  const rows: Array<[string, string]> = [
    ['Receipt Number', payment.receiptNumber],
    ['Student Name', studentName],
    ['Admission Number', admissionNumber],
    ['Invoice Reference', invoice?.invoiceNumber || payment.invoiceNumber || `INV-${payment.invoiceId}`],
    ['Description', invoice?.description || 'School Termly Fees'],
    ['Payment Method', payment.paymentMethod],
    ['Transaction Reference', payment.reference || 'N/A'],
    ['Verification Status', payment.verificationStatus],
    ['Amount Paid', `NGN ${payment.amount.toLocaleString('en-NG')}`],
    ['Date Recorded', new Date(payment.paidAt).toLocaleString('en-NG')],
  ];

  for (const [label, val] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 20, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, 85, y);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, y + 3, 190, y + 3);
    y += 11;
  }

  if (invoice) {
    const balance = Math.max(0, invoice.amountDue - invoice.amountPaid);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(
      `Invoice Total: NGN ${invoice.amountDue.toLocaleString('en-NG')}   |   Total Verified Paid: NGN ${invoice.amountPaid.toLocaleString('en-NG')}   |   Balance: NGN ${balance.toLocaleString('en-NG')}`,
      20,
      y
    );
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized by School Bursar / Accounts Office · Bamaina Bright Academy', 20, y + 18);

  doc.save(`${payment.receiptNumber}-receipt.pdf`);
}

export function downloadReportCardPdf(data: ResultSheetData) {
  const doc = new jsPDF();
  drawHeader(doc, 'TERMLY ACADEMIC REPORT CARD', data.settings);

  if (data.student.isDemo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9);
    doc.text('SAMPLE DEMO MODE REPORT CARD — DEMONSTRATION RECORD ONLY', 105, 54, {
      align: 'center',
    });
  }

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Student Name: ${data.student.fullName}`, 18, 63);
  doc.text(`Admission No: ${data.student.admissionNumber}`, 128, 63);
  doc.text(`Class: ${data.student.className}`, 18, 70);
  doc.text(
    `Session / Term: ${data.session?.name || ''} · ${data.term?.name || ''}`,
    128,
    70
  );

  const attendanceText = data.meta
    ? `${data.meta.daysPresent} / ${data.meta.daysOpened} days`
    : 'Not recorded';
  doc.setFont('helvetica', 'normal');
  doc.text(`Attendance: ${attendanceText}`, 18, 77);
  doc.text(`Overall Average: ${data.summary.averageScore}%`, 128, 77);

  if (data.summary.position !== null && data.summary.classTotalStudents !== null) {
    doc.text(
      `Class Position: ${data.summary.position} of ${data.summary.classTotalStudents}`,
      18,
      84
    );
  }

  // Table header
  let y = 94;
  doc.setFillColor(30, 58, 138);
  doc.rect(18, y, 174, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Subject', 21, y + 5.5);
  doc.text('CA (40)', 98, y + 5.5);
  doc.text('Exam (60)', 118, y + 5.5);
  doc.text('Total', 142, y + 5.5);
  doc.text('Grade', 158, y + 5.5);
  doc.text('Remark', 173, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  for (const row of data.results) {
    doc.text(row.subjectName.slice(0, 34), 21, y + 4);
    doc.text(String(row.caScore), 102, y + 4);
    doc.text(String(row.examScore), 124, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(String(row.totalScore), 144, y + 4);
    doc.text(row.grade, 161, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(row.remark, 173, y + 4);
    doc.setDrawColor(226, 232, 240);
    doc.line(18, y + 7, 192, y + 7);
    y += 9;
  }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text("Class Teacher's Remarks:", 18, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.meta?.teacherRemark || 'Pending teacher comment.', 18, y + 6, {
    maxWidth: 174,
  });

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text("Headteacher's Remarks:", 18, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.meta?.headteacherRemark || 'Pending headteacher review.', 18, y + 6, {
    maxWidth: 174,
  });

  doc.save(
    `${data.student.admissionNumber.replace(/[^a-zA-Z0-9]/g, '-')}-${data.term?.name || 'term'}-report.pdf`
  );
}
