import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import type { AppUser, StudentRecord } from '../lib/types';

export interface TeacherAssignmentItem {
  id: number;
  classId: number;
  className: string;
  subjectId: number | null;
  subjectName: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  token: string | null;
  linkedStudents: StudentRecord[];
  assignments: TeacherAssignmentItem[];
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<AppUser | null>;
  loginWithCredentials: (identifier: string, password: string) => Promise<AppUser>;
  loginDemoRole: (uid: string) => Promise<AppUser>;
  claimInitialAdmin: (fullName: string, email: string, password: string) => Promise<AppUser>;
  refreshProfile: (overrideToken?: string) => Promise<AppUser | null>;
  logout: () => Promise<void>;
  apiFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<StudentRecord[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchMe = useCallback(async (activeToken: string): Promise<AppUser | null> => {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to verify session');
    }
    const data = await res.json();
    setUser(data.user);
    setLinkedStudents(data.linkedStudents || []);
    setAssignments(data.assignments || []);
    return data.user as AppUser;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          await fetchMe(idToken);
        } catch (err) {
          console.error('Firebase session sync error:', err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchMe]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    setToken(idToken);
    return await fetchMe(idToken);
  }, [fetchMe]);

  const loginWithCredentials = useCallback(
    async (identifier: string, password: string) => {
      setAuthError(null);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }
      setToken(data.token);
      const loadedUser = await fetchMe(data.token);
      return loadedUser!;
    },
    [fetchMe]
  );

  const loginDemoRole = useCallback(
    async (uid: string) => {
      setAuthError(null);
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to launch demo session.');
      }
      setToken(data.token);
      const loadedUser = await fetchMe(data.token);
      return loadedUser!;
    },
    [fetchMe]
  );

  const claimInitialAdmin = useCallback(
    async (fullName: string, email: string, password: string) => {
      setAuthError(null);
      const res = await fetch('/api/auth/claim-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to create administrator account.');
      }
      setToken(data.token);
      const loadedUser = await fetchMe(data.token);
      return loadedUser!;
    },
    [fetchMe]
  );

  const refreshProfile = useCallback(
    async (overrideToken?: string) => {
      const t = overrideToken || token;
      if (!t) return null;
      return await fetchMe(t);
    },
    [token, fetchMe]
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setLinkedStudents([]);
    setAssignments([]);
    if (auth.currentUser) {
      await fbSignOut(auth);
    }
  }, []);

  const apiFetch = useCallback(
    async <T = unknown>(url: string, init: RequestInit = {}): Promise<T> => {
      let activeToken = token;
      if (auth.currentUser && (!activeToken || !activeToken.startsWith('bba.'))) {
        activeToken = await auth.currentUser.getIdToken();
        setToken(activeToken);
      }

      const headers = new Headers(init.headers || {});
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const res = await fetch(url, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [token]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        linkedStudents,
        assignments,
        loading,
        authError,
        signInWithGoogle,
        loginWithCredentials,
        loginDemoRole,
        claimInitialAdmin,
        refreshProfile,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
