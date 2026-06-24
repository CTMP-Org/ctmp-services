"use client";

import { useCallback, useMemo } from "react";
import { useMsal } from "@azure/msal-react";
import { apiScopes, API_BASE_URL } from "@/lib/msal-config";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiClient {
  request: <T = unknown>(endpoint: string, options?: ApiRequestOptions) => Promise<T>;
  get: <T = unknown>(endpoint: string) => Promise<T>;
  post: <T = unknown>(endpoint: string, body?: unknown) => Promise<T>;
  put: <T = unknown>(endpoint: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(endpoint: string, body?: unknown) => Promise<T>;
  del: <T = unknown>(endpoint: string) => Promise<T>;
  getDownload: (endpoint: string, filename: string) => Promise<void>;
}

export function useApiClient(): ApiClient {
  const { instance, accounts } = useMsal();

  const getAccessToken = useCallback(async (): Promise<string> => {
    // 1. Check local session token first
    if (typeof window !== "undefined") {
      const localToken = localStorage.getItem("ctmp_token");
      if (localToken) {
        return localToken;
      }
    }

    // 2. Fallback to MSAL
    if (accounts.length === 0) {
      throw new Error("No authenticated account found");
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...apiScopes,
        account: accounts[0],
      });
      return response.idToken;
    } catch {
      const response = await instance.acquireTokenPopup(apiScopes);
      return response.idToken;
    }
  }, [instance, accounts]);

  const request = useCallback(
    async <T = unknown>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> => {
      const token = await getAccessToken();
      const { method = "GET", body, headers = {} } = options;

      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error ${response.status}: ${errorBody}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    },
    [getAccessToken]
  );

  const getDownload = useCallback(
    async (endpoint: string, filename: string): Promise<void> => {
      const token = await getAccessToken();
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },
    [getAccessToken]
  );

  const get = useCallback(<T = unknown>(endpoint: string) => request<T>(endpoint), [request]);
  const post = useCallback(
    <T = unknown>(endpoint: string, body?: unknown) =>
      request<T>(endpoint, { method: "POST", body }),
    [request]
  );
  const put = useCallback(
    <T = unknown>(endpoint: string, body?: unknown) =>
      request<T>(endpoint, { method: "PUT", body }),
    [request]
  );
  const patch = useCallback(
    <T = unknown>(endpoint: string, body?: unknown) =>
      request<T>(endpoint, { method: "PATCH", body }),
    [request]
  );
  const del = useCallback(
    <T = unknown>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
    [request]
  );

  return useMemo(
    () => ({ request, get, post, put, patch, del, getDownload }),
    [request, get, post, put, patch, del, getDownload]
  );
}
