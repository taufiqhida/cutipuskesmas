import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cuti_token");
  // JANGAN kirim Authorization untuk endpoint login (biar tidak revalidate)
  const isLogin = (config.url || "").includes("/auth/login");
  if (token && !isLogin) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("cuti_token");
      localStorage.removeItem("cuti_user");
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/verify")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Terjadi kesalahan.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  if (typeof detail?.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
