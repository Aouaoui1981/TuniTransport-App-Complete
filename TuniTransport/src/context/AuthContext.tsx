// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — AuthContext (STEPS 4 & 14)
// Live mode: Supabase Auth. Demo mode: simulated auth via AsyncStorage.
// The public API is identical in both modes.
// ──────────────────────────────────────────────────────────────────────────
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, IS_LIVE } from '../services/supabase';
import { fetchProfile, updateProfile } from '../services/api';
import { MOCK_USERS } from '../services/mockData';
import { User, LoginPayload, RegisterPayload } from '../types';

const DEMO_SESSION_KEY = 'tt_demo_user';

export interface RegisterResult {
  /** true when the Supabase project requires e-mail confirmation before login */
  emailConfirmationRequired: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** true while the app is opened from a password-reset e-mail link */
  passwordRecovery: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  /** Sets a new password during the recovery flow, then clears it. */
  completePasswordReset: (newPassword: string) => Promise<void>;
  /** Abandons the recovery flow (signs out, returns to login). */
  cancelPasswordReset: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Demo helpers ─────────────────────────────────────────────────────────

function buildDemoUser(email: string): User {
  const isTransporter = email.toLowerCase().includes('transport');
  const base = isTransporter
    ? MOCK_USERS.find((u) => u.id === 'u-transporter-1')!
    : MOCK_USERS.find((u) => u.id === 'u-sender-1')!;
  return { ...base, email };
}

// ── Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const isMounted = React.useRef(true);

  // Restore session on mount
  useEffect(() => {
    isMounted.current = true;
    let unsub: (() => void) | undefined;

    async function restore() {
      try {
        if (IS_LIVE && supabase) {
          // Register the listener first: even if the initial profile fetch
          // fails (network hiccup), later auth events still reach the app.
          const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Opened from a reset-password e-mail: force the "new password"
            // screen before the user can use the app.
            if (event === 'PASSWORD_RECOVERY' && isMounted.current) {
              setPasswordRecovery(true);
            }
            if (session?.user) {
              const profile = await fetchProfile(session.user.id);
              if (profile && isMounted.current) {
                setUser({ ...profile, email: session.user.email ?? profile.email });
              }
            } else {
              if (isMounted.current) {
                setUser(null);
              }
            }
          });
          unsub = () => listener.subscription.unsubscribe();

          const { data } = await supabase.auth.getSession();
          const sessionUser = data.session?.user;
          if (sessionUser) {
            const profile = await fetchProfile(sessionUser.id);
            if (profile && isMounted.current) {
              setUser({ ...profile, email: sessionUser.email ?? profile.email });
            }
          }
        } else {
          const raw = await AsyncStorage.getItem(DEMO_SESSION_KEY);
          if (raw && isMounted.current) {
            setUser(JSON.parse(raw) as User);
          }
        }
      } catch {
        // Session restore is best-effort: a failure must never block the app.
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }

    restore();
    return () => {
      isMounted.current = false;
      unsub?.();
    };
  }, []);

  // ── login ──────────────────────────────────────────────────────────────

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    setIsLoading(true);
    try {
      if (IS_LIVE && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('E-mail ou mot de passe incorrect.');
        const profile = await fetchProfile(data.user.id);
        if (!profile) throw new Error('Profil introuvable.');
        setUser({ ...profile, email: data.user.email ?? profile.email });
      } else {
        // Demo mode: any credentials work; role inferred from the email.
        await new Promise((r) => setTimeout(r, 700));
        const demoUser = buildDemoUser(email);
        await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── register ───────────────────────────────────────────────────────────

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResult> => {
    setIsLoading(true);
    try {
      if (IS_LIVE && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            data: {
              first_name: payload.firstName,
              last_name: payload.lastName,
              phone: payload.phone,
              role: payload.role,
              // Transporteur : persistées dans payout_accounts par le trigger.
              ...(payload.role === 'transporter' && payload.payoutIban
                ? {
                    payout_iban: payload.payoutIban,
                    payout_holder: payload.payoutHolder ?? '',
                  }
                : {}),
            },
          },
        });
        if (error) throw new Error(error.message);
        if (data.session && data.user) {
          const profile = await fetchProfile(data.user.id);
          if (profile) setUser({ ...profile, email: data.user.email ?? payload.email });
          return { emailConfirmationRequired: false };
        }
        // E-mail confirmation flow enabled on the project: account created,
        // the user must confirm before logging in. Not an error.
        return { emailConfirmationRequired: true };
      }
      await new Promise((r) => setTimeout(r, 700));
      const demoUser: User = {
        id: `u-demo-${Date.now()}`,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        role: payload.role,
        rating: 0,
        totalRatings: 0,
        createdAt: new Date().toISOString(),
        identityStatus: 'unsubmitted',
      };
      await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return { emailConfirmationRequired: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    if (IS_LIVE && supabase) {
      await supabase.auth.signOut();
    } else {
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
    }
    setUser(null);
  }, []);

  // ── updateUser ─────────────────────────────────────────────────────────

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...updates };
        if (IS_LIVE) {
          updateProfile(prev.id, updates).catch(() => undefined);
        } else {
          AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(next)).catch(() => undefined);
        }
        return next;
      });
    },
    []
  );

  // ── password recovery ────────────────────────────────────────────────────

  const completePasswordReset = useCallback(async (newPassword: string) => {
    if (!IS_LIVE || !supabase) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    if (isMounted.current) setPasswordRecovery(false);
  }, []);

  const cancelPasswordReset = useCallback(async () => {
    if (isMounted.current) setPasswordRecovery(false);
    if (IS_LIVE && supabase) {
      await supabase.auth.signOut();
    }
    if (isMounted.current) setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      passwordRecovery,
      login,
      register,
      logout,
      updateUser,
      completePasswordReset,
      cancelPasswordReset,
    }),
    [
      user,
      isLoading,
      passwordRecovery,
      login,
      register,
      logout,
      updateUser,
      completePasswordReset,
      cancelPasswordReset,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}
