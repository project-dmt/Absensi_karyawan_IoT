import axios from "axios";

const envBaseUrl = import.meta.env.VITE_API_URL;
const isLocalBaseUrl =
  !envBaseUrl || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(envBaseUrl);

const baseURL = isLocalBaseUrl
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : envBaseUrl;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
