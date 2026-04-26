import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.ory-vault.test";

// Centralized Axios instance with base URL and credentials enabled
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Standard fetcher for SWR
export const fetcher = (url: string) => api.get(url).then((res) => res.data);
