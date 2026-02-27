import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function isAuthenticated() {
  return !!sessionStorage.getItem("token");
}

export function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
