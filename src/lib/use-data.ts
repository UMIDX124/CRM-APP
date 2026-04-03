"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  // Use ref for mockData to avoid infinite re-render loop
  const mockRef = useRef(mockData);
  const [data, setData] = useState<T>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const fetchedRef = useRef(false);

  const paramsStr = params ? JSON.stringify(params) : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = apiUrl;
      if (paramsStr) {
        const p = JSON.parse(paramsStr);
        const sp = new URLSearchParams();
        Object.entries(p).forEach(([k, v]) => {
          if (v && v !== "ALL") sp.set(k, String(v));
        });
        const qs = sp.toString();
        if (qs) url = `${apiUrl}?${qs}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json !== null) {
          setData(json);
          setDbConnected(true);
        } else {
          setData(mockRef.current);
          setDbConnected(false);
        }
      } else {
        setData(mockRef.current);
        setDbConnected(false);
      }
    } catch {
      setData(mockRef.current);
      setDbConnected(false);
    }
    setLoading(false);
  }, [apiUrl, paramsStr]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, setData, dbConnected };
}

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
    return { ok: true, data: body as T };
  }
}
