"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
  type ReactNode,
} from "react";

export interface Company {
  id: string;
  name: string;
  code: string;
  accent: string;
}

export const companies: Company[] = [
  { id: "dpl", name: "Digital Point LLC", code: "DPL", accent: "#22C55E" },
  { id: "vcs", name: "Virtual Customer Solution", code: "VCS", accent: "#FF6B00" },
  { id: "bsl", name: "Backup Solutions LLC", code: "BSL", accent: "#3B82F6" },
];

interface CompanyContextValue {
  activeCompany: Company;
  setActiveCompany: (company: Company) => void;
  isPending: boolean;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

const STORAGE_KEY = "dp_active_company";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [activeCompany, setActiveCompanyState] = useState<Company>(companies[0]);
  const [isPending, startTransition] = useTransition();
  const initialized = useRef(false);

  // Load persisted company on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const found = companies.find((c) => c.id === stored);
        if (found) setActiveCompanyState(found);
      }
    } catch {
      // localStorage unavailable — use default
    }
  }, []);

  const setActiveCompany = useCallback((company: Company) => {
    // Persist immediately (synchronous)
    try {
      localStorage.setItem(STORAGE_KEY, company.id);
    } catch {
      // localStorage unavailable — skip persist
    }

    // Wrap the state update in startTransition so downstream re-renders
    // (data refetches across the whole app) don't block the UI thread.
    // This fixes the INP issue where switching company froze the UI for 3s+.
    startTransition(() => {
      setActiveCompanyState(company);
    });
  }, []);

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, isPending }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
