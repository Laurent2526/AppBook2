"use client";

import { useEffect, useState } from "react";

const storageKey = "appbook_admin_token";
const tokenEvent = "appbook-admin-token-change";

export function useAdminToken() {
  const [token, setTokenState] = useState("");

  useEffect(() => {
    const syncToken = () => setTokenState(window.localStorage.getItem(storageKey) || "");
    syncToken();
    window.addEventListener(tokenEvent, syncToken);
    return () => window.removeEventListener(tokenEvent, syncToken);
  }, []);

  const setToken = (value: string) => {
    setTokenState(value);
    window.localStorage.setItem(storageKey, value);
    window.dispatchEvent(new Event(tokenEvent));
  };

  return [token, setToken] as const;
}
