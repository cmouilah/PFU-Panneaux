import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../lib/api';
import { Profile } from '../types/database';

interface User {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      const savedProfile = localStorage.getItem('profile');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));

          if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
          } else {
            // Fetch profile if missing
            const { data } = await auth.getMe();
            setProfile(data);
            localStorage.setItem('profile', JSON.stringify(data));
          }
        } catch (e) {
          console.error('Auth initialization error:', e);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('profile');
        }
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { data } = await auth.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('profile', JSON.stringify(data.profile));

      setUser(data.user);
      setProfile(data.profile);
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      await auth.register({ email, password, fullName });
      await signIn(email, password);
    } catch (error) {
      throw error;
    }
  }

  async function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
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
