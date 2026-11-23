import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

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

export interface AuthRequest extends Request {
  appUser?: AppUser;
}

const INITIAL_SUPER_ADMIN_EMAIL = 'bamainahassan@gmail.com';

// Read signing secret from process.env with a secure in-memory random fallback
const RUNTIME_SESSION_SECRET =
  process.env.ACADEMY_SESSION_SECRET && process.env.ACADEMY_SESSION_SECRET.length >= 16
    ? process.env.ACADEMY_SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) {
    return false;
  }
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

export function signAcademyToken(payload: { userId: number; uid: string; role: string }): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const body = Buffer.from(
    JSON.stringify({ userId: payload.userId, uid: payload.uid, role: payload.role, exp }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', RUNTIME_SESSION_SECRET)
    .update(body)
    .digest('base64url');
  return `bba.${body}.${sig}`;
}

export function verifyAcademyToken(token: string): { userId: number; uid: string; role: string } | null {
  if (!token.startsWith('bba.')) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [, body, sig] = parts;
  if (!body || !sig) {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', RUNTIME_SESSION_SECRET)
    .update(body)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!decoded.exp || Date.now() > decoded.exp) {
      return null;
    }
    return { userId: Number(decoded.userId), uid: String(decoded.uid), role: String(decoded.role) };
  } catch {
    return null;
  }
}

export function sanitizeUser(row: typeof users.$inferSelect): AppUser {
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    fullName: row.fullName,
    role: row.role as UserRole,
    phone: row.phone,
    address: row.address,
    staffOrAdmissionId: row.staffOrAdmissionId,
    isActive: row.isActive,
    isDemo: row.isDemo,
  };
}

async function resolveFirebaseUser(idToken: string): Promise<AppUser | null> {
  const decoded = await adminAuth.verifyIdToken(idToken);
  const email = (decoded.email || '').toLowerCase();
  const displayName = decoded.name || (email ? email.split('@')[0] : 'Academy User');

  // Check if user exists by uid first, then by email
  const byUid = await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1);
  if (byUid.length > 0) {
    return sanitizeUser(byUid[0]);
  }

  if (email) {
    const byEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (byEmail.length > 0) {
      const updated = await db
        .update(users)
        .set({ uid: decoded.uid })
        .where(eq(users.id, byEmail[0].id))
        .returning();
      return sanitizeUser(updated[0]);
    }
  }

  // Determine initial role: initial owner email or first non-demo super_admin gets super_admin
  const existingRealAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'super_admin'));
  const hasRealAdmin = existingRealAdmins.length > 0;
  const isOwnerEmail = email === INITIAL_SUPER_ADMIN_EMAIL.toLowerCase();
  const assignedRole: UserRole = isOwnerEmail || !hasRealAdmin ? 'super_admin' : 'parent';

  const inserted = await db
    .insert(users)
    .values({
      uid: decoded.uid,
      email: email || `${decoded.uid}@users.bamainabright.local`,
      fullName: displayName,
      role: assignedRole,
      isActive: true,
      isDemo: false,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: email || `${decoded.uid}@users.bamainabright.local`,
      },
    })
    .returning();

  return sanitizeUser(inserted[0]);
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is empty.' });
  }

  try {
    if (token.startsWith('bba.')) {
      const parsed = verifyAcademyToken(token);
      if (!parsed) {
        return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      }
      const rows = await db.select().from(users).where(eq(users.id, parsed.userId)).limit(1);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'User account not found.' });
      }
      if (!rows[0].isActive) {
        return res.status(403).json({ error: 'Account has been deactivated by school administration.' });
      }
      req.appUser = sanitizeUser(rows[0]);
      return next();
    }

    const fbUser = await resolveFirebaseUser(token);
    if (!fbUser) {
      return res.status(401).json({ error: 'Invalid Firebase authentication token.' });
    }
    if (!fbUser.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated by school administration.' });
    }
    req.appUser = fbUser;
    return next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(401).json({ error: 'Unauthorized: Unable to verify credentials.' });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.appUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.appUser.role)) {
      return res.status(403).json({
        error: 'Access denied: Your role does not have permission for this action.',
      });
    }
    return next();
  };
};
