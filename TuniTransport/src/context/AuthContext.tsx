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
import { fetchProfile, updateProfile, deleteOwnAccount, applyReferralCode } from '../services/api';
import { MOCK_USERS } from '../services/mockData';
import {
  signInWithGoogleNatively,
  signOutFromGoogleNatively,
} from '../services/googleSignIn';
import { User, LoginPayload, RegisterPayload, OAuthProvider, UserRole } from '../types';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { showAlert } from '../utils/alert';
import { COLORS } from '../utils/theme';

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
  /** Social login (Google / Apple / Facebook) via Supabase OAuth. */
  signInWithProvider: (provider: OAuthProvider, preferredRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  /** Supprime définitivement le compte courant, puis déconnecte. */
  deleteAccount: () => Promise<void>;
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
  // Rôle coché sur l'écran d'inscription avant d'ouvrir Google. Il ne sert
  // qu'à savoir quoi dire si le compte existait déjà : un compte Google
  // déjà inscrit garde son rôle.
  const preferredRoleRef = React.useRef<UserRole | null>(null);

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
              if (profile?.suspended) {
                // Le chemin mot de passe explique la suspension (login()) ; ici
                // — connexion Google/Apple — la déconnexion était silencieuse,
                // et se lisait comme « la connexion Google ne marche pas ».
                await supabase!.auth.signOut();
                if (isMounted.current) setUser(null);
                showAlert(
                  'Compte suspendu',
                  'Votre compte a été suspendu. Contactez le support.'
                );
              } else if (profile && isMounted.current) {
                setUser({ ...profile, email: session.user.email ?? profile.email });
                // L'utilisateur venait de l'écran d'inscription et avait coché
                // un rôle, mais ce compte Google existait déjà : on le dit.
                // Sans ce message, il croyait s'être inscrit comme
                // transporteur et se retrouvait expéditeur, sans explication.
                const wanted = preferredRoleRef.current;
                preferredRoleRef.current = null;
                if (wanted && profile.onboarded !== false && profile.role !== wanted) {
                  showAlert(
                    'Compte déjà existant',
                    `Ce compte Google est déjà inscrit sur THL en tant que ${
                      profile.role === 'sender' ? 'expéditeur' : 'transporteur'
                    }. Vous y avez été connecté — le rôle choisi à l'inscription n'a pas été appliqué.`
                  );
                }
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
            // Même garde que dans le listener : une session déjà stockée ne
            // doit pas rouvrir l'app à un compte suspendu entre-temps.
            if (profile?.suspended) {
              await supabase.auth.signOut();
              if (isMounted.current) setUser(null);
            } else if (profile && isMounted.current) {
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
        if (profile.suspended) {
          await supabase.auth.signOut();
          throw new Error('Votre compte a été suspendu. Contactez le support.');
        }
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
            },
          },
        });
        if (error) throw new Error(error.message);
        if (data.session && data.user) {
          // Code de parrainage (facultatif) — best-effort, ne bloque jamais l'inscription.
          if (payload.referralCode?.trim()) {
            try {
              await applyReferralCode(payload.referralCode.trim());
            } catch (e) {
              console.warn('Code de parrainage non appliqué:', e);
            }
          }
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

  // ── social login (OAuth) ─────────────────────────────────────────────────

  const signInWithProvider = useCallback(async (provider: OAuthProvider, preferredRole?: UserRole) => {
    preferredRoleRef.current = preferredRole ?? null;
    if (!IS_LIVE || !supabase) {
      throw new Error('La connexion sociale est disponible sur l’application en ligne.');
    }

    // ── Google : demander le jeton d'identité sans quitter l'application ──
    // Sur mobile, c'est le sélecteur de comptes du système ; sur le web, une
    // fenêtre Google intitulée du nom du site. Les deux évitent la page
    // affichant « to continue to <projet>.supabase.co » — une chaîne
    // technique montrée à l'endroit exact où l'on demande son compte à
    // quelqu'un.
    //
    // Toute indisponibilité — services Google Play absents, script bloqué,
    // origine non déclarée — retombe sur la redirection Supabase ci-dessous.
    // Une connexion qui passe par un écran laid vaut mieux qu'une connexion
    // qui ne passe pas.
    if (provider === 'google') {
      const direct = await signInWithGoogleNatively();
      if (direct.status === 'cancelled') return;
      if (direct.status === 'ok') {
        const { error: idTokenError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: direct.idToken,
        });
        if (idTokenError) throw new Error(idTokenError.message);
        return;
      }
    }

    // ── Web : redirection classique ────────────────────────────────────────
    // Supabase envoie l'utilisateur chez le fournisseur puis le ramène sur
    // l'origine de l'app, où detectSessionInUrl établit la session ; le
    // listener onAuthStateChange prend le relais.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
      return;
    }

    // ── Natif : session d'authentification + lien profond ──────────────────
    // Sans redirectTo, Supabase renverrait vers l'URL du site : le navigateur
    // afficherait l'app web et l'app native ne recevrait jamais la session.
    // On ouvre donc le fournisseur dans une session d'auth système et on
    // récupère les jetons sur le lien profond de retour (schéma `tunitransport`).
    const redirectTo = Linking.createURL('auth-callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw new Error(error.message);
    if (!data?.url) {
      throw new Error("Le fournisseur n'a pas renvoyé d'URL d'autorisation.");
    }

    // Le navigateur s'ouvrait avec son habillage par defaut : barre claire au
    // dessus d'une page vide, le temps que Supabase redirige vers Google. Sur
    // un fond sombre, cette page d'attente ressemblait a un ecran casse. On
    // l'habille aux couleurs de l'app pour qu'elle se lise comme une etape du
    // parcours. `createTask: false` garde la fenetre dans la tache de
    // l'application : le retour arriere ramene a l'ecran de connexion au lieu
    // de sortir vers le navigateur.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      toolbarColor: COLORS.background,
      controlsColor: COLORS.secondary,
      showTitle: false,
      enableBarCollapsing: false,
      createTask: false,
      preferEphemeralSession: true,
    });
    if (result.type !== 'success') {
      // 'cancel' / 'dismiss' : l'utilisateur a fermé la fenêtre — pas une erreur.
      return;
    }

    // Supabase place les jetons dans le fragment (#) ; certains fournisseurs
    // utilisent la query (?). On lit les deux.
    const url = new URL(result.url);
    const params = new URLSearchParams(
      url.hash.startsWith('#') ? url.hash.slice(1) : url.search
    );
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) {
      throw new Error(params.get('error_description') ?? 'Connexion sociale incomplète.');
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw new Error(sessionError.message);
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    if (IS_LIVE && supabase) {
      await supabase.auth.signOut();
    } else {
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
    }
    // Sans cela, Google garderait le compte choisi : la prochaine connexion
    // repartirait en silence sur le même, et changer de compte deviendrait
    // impossible depuis l'application.
    await signOutFromGoogleNatively();
    setUser(null);
  }, []);

  // ── deleteAccount ────────────────────────────────────────────────────────

  const deleteAccount = useCallback(async () => {
    if (!IS_LIVE || !supabase) {
      // Mode démo : pas de compte serveur, on efface simplement la session.
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      if (isMounted.current) setUser(null);
      return;
    }
    // Supprime le compte côté serveur (peut lever une erreur métier :
    // envoi en cours, retrait en attente…), puis déconnecte localement.
    await deleteOwnAccount();
    await supabase.auth.signOut();
    if (isMounted.current) setUser(null);
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
    // Sign the user out so they re-authenticate with the new password instead
    // of landing silently inside the account.
    await supabase.auth.signOut();
    if (isMounted.current) {
      setPasswordRecovery(false);
      setUser(null);
    }
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
      signInWithProvider,
      logout,
      deleteAccount,
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
      signInWithProvider,
      logout,
      deleteAccount,
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
