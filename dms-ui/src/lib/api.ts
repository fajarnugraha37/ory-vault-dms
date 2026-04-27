import axios from "axios";
import useSWR from "swr";
import { toast } from "sonner";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.ory-vault.test";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// --- HTTP INTERCEPTOR (Session Expiry Handling) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid infinite toast loops on login page
      if (!window.location.pathname.includes("/auth/login")) {
        toast.error("SESSION_EXPIRED: Re-authentication protocol required.", {
            description: "Your secure session has ended. Redirecting...",
            duration: 3000,
        });
        setTimeout(() => {
            window.location.href = "/auth/login";
        }, 2000);
      }
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- useAuth Hook ---
export const useAuth = () => {
    const { data: user, error, mutate, isLoading } = useSWR("/api/me", fetcher, {
        shouldRetryOnError: false,
        revalidateOnFocus: true
    });

    return {
        user,
        isAuthenticated: !!user && !error,
        isLoading,
        error,
        logout: async () => {
            // Standard Ory Logout would go here via SDK, 
            // but we have a utility in Navbar too.
            mutate(null);
        }
    };
};
