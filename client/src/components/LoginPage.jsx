import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { api } from "@/lib/api";

const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/login", { email, password });
      sessionStorage.setItem("token", data.token);
      onLoginSuccess?.();
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Invalid email or password"
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/30 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex flex-col items-center mb-8">
            <img
              src="https://scet.berkeley.edu/wp-content/uploads/8.-SRM-Logo.png"
              alt=""
              className="w-14 h-14"
            />{" "}
            <h1 className="text-2xl font-bold text-slate-900">ExamCell</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <button
              type="submit"
              className="inline-flex items-center justify-center h-11 w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
