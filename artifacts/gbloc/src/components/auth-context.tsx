import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthUserData = {
  id: string;
  email: string;
};

type AuthUserView = AuthUserData & {
  primaryEmailAddressId: string;
  primaryEmailAddress: { emailAddress: string };
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification: { status: "verified" };
  }>;
};

type AuthContextValue = {
  user: AuthUserView | null;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(value: AuthUserData | null): AuthUserView | null {
  if (!value) return null;
  return {
    ...value,
    primaryEmailAddressId: "primary",
    primaryEmailAddress: { emailAddress: value.email },
    emailAddresses: [{
      id: "primary",
      emailAddress: value.email,
      verification: { status: "verified" },
    }],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserView | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Could not load the current session.");
      const data = await response.json() as { user: AuthUserData | null };
      setUser(toAuthUser(data.user));
    } catch {
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const signOut = useCallback(async (options?: { redirectUrl?: string }) => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
    if (options?.redirectUrl) window.location.replace(options.redirectUrl);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, isLoaded, refresh, signOut }),
    [user, isLoaded, refresh, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Authentication hooks must be used inside AuthProvider.");
  return value;
}

export function useUser() {
  const { user, isLoaded } = useAuthContext();
  return { user, isLoaded, isSignedIn: isLoaded && Boolean(user) };
}

export function useAuthActions() {
  const { refresh, signOut } = useAuthContext();
  return { refresh, signOut };
}

export function Show({
  when,
  children,
}: {
  when: "signed-in" | "signed-out";
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  return (when === "signed-in" ? isSignedIn : !isSignedIn) ? children : null;
}
