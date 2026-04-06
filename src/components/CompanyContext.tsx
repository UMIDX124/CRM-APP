"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

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
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

const STORAGE_KEY = "dp_active_company";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [activeCompany, setActiveCompanyState] = useState<Company>(companies[0]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const found = companies.find((c) => c.id === stored);
        if (found) setActiveCompanyState(found);
      }
    } catch {}
  }, []);

  const setActiveCompany = useCallback((company: Company) => {
    setActiveCompanyState(company);
    try {
      localStorage.setItem(STORAGE_KEY, company.id);
    } catch {}
  }, []);

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
