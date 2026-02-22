import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Link, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import api from "./api";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import Login from "./pages/Login";
import PublicHome from "./pages/PublicHome";
import Register from "./pages/Register";

function ProtectedRoute({ token, role, allowedRole, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === "admin" ? "/admin" : "/customer"} replace />;
  }

  return children;
}

function App() {
  const [auth, setAuth] = useState({
    token: localStorage.getItem("token") || "",
    role: localStorage.getItem("role") || "",
    username: localStorage.getItem("username") || "",
  });

  const isLoggedIn = useMemo(() => Boolean(auth.token), [auth.token]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }

    api
      .get("/auth/me/")
      .then((res) => {
        const next = {
          token: auth.token,
          role: res.data.role,
          username: res.data.username,
        };
        localStorage.setItem("role", next.role);
        localStorage.setItem("username", next.username);
        setAuth(next);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        setAuth({ token: "", role: "", username: "" });
      });
  }, [auth.token]);

  const onAuthSuccess = (payload) => {
    const next = {
      token: payload.token,
      role: payload.role,
      username: payload.username,
    };

    localStorage.setItem("token", next.token);
    localStorage.setItem("role", next.role);
    localStorage.setItem("username", next.username);
    setAuth(next);
  };

  const logout = () => {
    api
      .post("/auth/logout/")
      .catch(() => null)
      .finally(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        setAuth({ token: "", role: "", username: "" });
      });
  };

  return (
    <Router>
      <div className="app-shell">
        <header className="app-header">
          <h1>Hotel Reservation System</h1>
          {isLoggedIn ? (
            <>
              <p>
                Logged in as <strong>{auth.username}</strong> ({auth.role})
              </p>
              <nav>
                <Link to="/">Home</Link>
                {auth.role === "admin" ? <Link to="/admin">Admin Dashboard</Link> : <Link to="/customer">Customer Dashboard</Link>}
                <button onClick={logout}>Logout</button>
              </nav>
            </>
          ) : (
            <nav>
              <Link to="/">Home</Link>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </nav>
          )}
        </header>

        <main className="page-wrap">
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/login" element={<Login onAuthSuccess={onAuthSuccess} />} />
            <Route path="/register" element={<Register onAuthSuccess={onAuthSuccess} />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute token={auth.token} role={auth.role} allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer"
              element={
                <ProtectedRoute token={auth.token} role={auth.role} allowedRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
