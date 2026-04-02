"use client";

import { useState, useEffect, useCallback } from "react";

// Generic hook to fetch data from API with fallback to mock data
// This is the bridge between components and the database

interface UseDataOptions<T> {
  apiUrl: string;
  mockData: T;
  params?: Record<string, string>;
}

interface UseDataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: (data: T | ((prev: T) => T)) => void;
  dbConnected: boolean;
}

export function useData<T>({ apiUrl, mockData, params }: UseDataOptions<T>): UseDataResult<T> {
  const [data, setData] = useState<T>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);

  const buildUrl = useCallback(() => {
    if (!params) return apiUrl;
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "ALL") searchParams.set(k, v);
    });
    const qs = searchParams.toString();
    return qs ? `${apiUrl}?${qs}` : apiUrl;
  }, [apiUrl, params]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setDbConnected(true);
      } else if (res.status === 401) {
        // Not authenticated — use mock data silently
        setData(mockData);
        setDbConnected(false);
      } else {
        throw new Error(`API error ${res.status}`);
      }
    } catch {
      // API not available — fallback to mock data
      setData(mockData);
      setDbConnected(false);
    }
    setLoading(false);
  }, [buildUrl, mockData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, setData, dbConnected };
}

// POST/PATCH/DELETE helper that falls back gracefully
export async function apiMutate<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    return { ok: false, error: err.error || `Error ${res.status}` };
  } catch {
    // API not available — return success anyway for demo mode
    return { ok: true, data: body as T };
  }
}
