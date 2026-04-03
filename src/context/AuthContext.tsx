'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

type Role = 'user' | 'admin' | 'teacher' | null;

interface AuthContextType {
  role: Role;
  username: string | null;
  setRole: (role: Role) => void;
  isAuthenticated: boolean;
  login: (role: Role, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Restore session from localStorage on first load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('username');
      const savedRole = localStorage.getItem('role') as Role;
      if (savedUser && savedRole) {
        setUsername(savedUser);
        setRole(savedRole);
        setIsAuthenticated(true);
        // Sync role from Firebase in background
        get(ref(db, `users/${savedUser}/role`)).then(snap => {
          if (snap.exists()) {
            const dbRole = snap.val() as Role;
            setRole(dbRole);
            localStorage.setItem('role', dbRole || 'user');
          }
        }).catch(() => {});
      }
      setHydrated(true);
    }
  }, []);

  // Routing guard — wait for hydration first
  useEffect(() => {
    if (!hydrated) return;
    const publicPaths = ['/login', '/register'];
    const isPublicExam = pathname?.startsWith('/ujian/public');
    if (!isAuthenticated && !publicPaths.includes(pathname) && !isPublicExam) {
      router.push('/login');
    }
  }, [isAuthenticated, pathname, router, hydrated]);

  const login = async (newRole: Role, usernameInput: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('username', usernameInput);
    }
    setUsername(usernameInput);

    // Admin override by suffix
    let resolvedRole: Role = newRole;
    if (usernameInput.endsWith('999') || usernameInput === 'admin') {
      resolvedRole = 'admin';
    } else {
      // Fetch role from Firebase
      try {
        const snap = await get(ref(db, `users/${usernameInput}/role`));
        if (snap.exists()) resolvedRole = snap.val() as Role;
      } catch { /* use fallback role */ }
    }

    setRole(resolvedRole);
    localStorage.setItem('role', resolvedRole || 'user');
    setIsAuthenticated(true);
  };

  const logout = () => {
    setRole(null);
    setUsername(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('username');
      localStorage.removeItem('role');
    }
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ role, username, setRole, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
