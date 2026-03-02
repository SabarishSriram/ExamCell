import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    applyToken(token);
    axios
      .get(`${API_BASE_URL}/auth/me`)
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("token");
        applyToken(null);
      })
      .finally(() => setLoading(false));
  }, [applyToken]);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    const { token, user: loggedInUser } = res.data;
    localStorage.setItem("token", token);
    applyToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
