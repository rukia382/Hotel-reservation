import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api";

function Login({ onAuthSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingIntent = location.state?.bookingIntent || null;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    api
      .post("/auth/login/", { username, password })
      .then((res) => {
        onAuthSuccess(res.data);

        if (res.data.role === "admin") {
          navigate("/admin", { replace: true });
          return;
        }

        navigate("/customer", {
          replace: true,
          state: bookingIntent ? { bookingIntent } : undefined,
        });
      })
      .catch((err) => {
        setError(err.response?.data?.non_field_errors?.[0] || "Invalid username or password.");
      });
  };

  return (
    <section className="card auth-card">
      <h2>Login</h2>
      {bookingIntent && <p>Please log in to continue your room booking.</p>}
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <div className="password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                  <path
                    d="M3 3l18 18m-9.05-2C7.2 19 3.73 16.11 2 12c.79-1.88 2.02-3.5 3.55-4.76M9.88 9.88a3 3 0 104.24 4.24M14.12 14.12L9.88 9.88M10.73 5.08A10.94 10.94 0 0112 5c4.75 0 8.27 2.89 10 7a11.8 11.8 0 01-3.06 4.21"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                  <path
                    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zm10 3a3 3 0 100-6 3 3 0 000 6z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </label>
        <button type="submit">Login</button>
      </form>
      <p>
        No account? <Link to="/register" state={bookingIntent ? { bookingIntent } : undefined}>Sign up</Link>
      </p>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default Login;
