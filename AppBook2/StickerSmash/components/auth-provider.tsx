import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { authApi, clearAuthTokens, setAuthTokens } from "@/lib/api-client";
import { registerPushNotificationsForSession } from "@/lib/push-notifications";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type ReadingHistoryItem = {
  id: string;
  title: string;
  chapter: string;
  time: string;
  color: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    username: string;
  }) => Promise<{ target: string; debugOtp?: string }>;
  verifyOtp: (target: string, code: string) => Promise<void>;
  logout: () => void;
  readingHistory: ReadingHistoryItem[];
  recordReading: (item: Omit<ReadingHistoryItem, "time">) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(
    [],
  );
  const [pendingRegistration, setPendingRegistration] = useState<{
    identifier: string;
    password: string;
  } | null>(null);

  const accountToUser = (account: Record<string, unknown>): AuthUser => ({
    id: String(account.id),
    name: String(account.full_name || account.username || "Người dùng"),
    email: String(account.email || ""),
  });

  const login = useCallback(async (identifier: string, password: string) => {
    if (!identifier.trim() || !password.trim()) {
      throw new Error("Vui lòng nhập email và mật khẩu.");
    }
    const result = await authApi.login({
      identifier: identifier.trim(),
      password,
      platform: "other",
    });
    setAuthTokens(result);
    setUser(accountToUser(result.account));
    void registerPushNotificationsForSession().catch((error) =>
      console.warn("push token registration failed", error),
    );
  }, []);

  const register = useCallback(
    async ({
      name,
      email,
      password,
      username,
    }: {
      name: string;
      email: string;
      password: string;
      username: string;
    }): Promise<{ target: string; debugOtp?: string }> => {
      if (
        !name.trim() ||
        !email.trim() ||
        !password.trim() ||
        !username.trim()
      ) {
        throw new Error("Vui lòng điền đầy đủ thông tin.");
      }
      const result = await authApi.register({
        username: username.trim(),
        fullName: name.trim(),
        email: email.trim(),
        password,
        channel: "email",
      });
      setPendingRegistration({ identifier: email.trim(), password });
      return result;
    },
    [],
  );

  const verifyOtp = useCallback(
    async (target: string, code: string) => {
      const result = await authApi.verifyOtp({ target, code });
      if (pendingRegistration) {
        const loginResult = await authApi.login({
          identifier: pendingRegistration.identifier,
          password: pendingRegistration.password,
          platform: "other",
        });
        setAuthTokens(loginResult);
        setUser(accountToUser(loginResult.account));
        void registerPushNotificationsForSession().catch((error) =>
          console.warn("push token registration failed", error),
        );
        setPendingRegistration(null);
      } else {
        setUser(accountToUser(result.account));
      }
    },
    [pendingRegistration],
  );

  const logout = useCallback(() => {
    clearAuthTokens();
    setUser(null);
  }, []);

  const recordReading = useCallback(
    (item: Omit<ReadingHistoryItem, "time">) => {
      setReadingHistory((current) => [
        { ...item, time: "Vừa đọc" },
        ...current.filter((entry) => entry.id !== item.id),
      ]);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      verifyOtp,
      logout,
      readingHistory,
      recordReading,
    }),
    [user, readingHistory, recordReading, login, register, verifyOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }

  return context;
}
