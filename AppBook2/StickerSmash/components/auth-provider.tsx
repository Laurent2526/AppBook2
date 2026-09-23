import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

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
  login: (email: string, password: string) => void;
  register: (payload: {
    name: string;
    email: string;
    password: string;
  }) => void;
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

  const login = (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error("Vui lòng nhập email và mật khẩu.");
    }

    setUser({
      id: "demo-user",
      name: "Người dùng",
      email: email.trim(),
    });
  };

  const register = ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      throw new Error("Vui lòng điền đầy đủ thông tin.");
    }

    setUser({
      id: "demo-user",
      name: name.trim(),
      email: email.trim(),
    });
  };

  const logout = () => setUser(null);

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
      logout,
      readingHistory,
      recordReading,
    }),
    [user, readingHistory, recordReading],
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
