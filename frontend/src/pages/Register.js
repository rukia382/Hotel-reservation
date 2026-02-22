import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api";

function Register({ onAuthSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingIntent = location.state?.bookingIntent || null;

  const [form, setForm] = useState({
    username: "",
    password: "",
    confirm_password: "",
    name: "",
    phone: "",
    national_id: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Password and confirm password do not match.");
      return;
    }

    const payload = {
      username: form.username,
      password: form.password,
      name: form.name,
      phone: form.phone,
      national_id: form.national_id,
    };

    api
      .post("/auth/register/", payload)
      .then((res) => {
        onAuthSuccess(res.data);
        navigate("/customer", {
          replace: true,
          state: bookingIntent ? { bookingIntent } : undefined,
        });
      })
      .catch((err) => {
        const data = err.response?.data;
        const firstError = data?.username?.[0] || data?.national_id?.[0] || data?.password?.[0] || "Registration failed.";
        setError(firstError);
      });
  };

  return (
    <section className="card auth-card">
      <h2>Register</h2>
      <p>All registered users are created as normal customers.</p>
      {bookingIntent && <p>Create your account to complete this booking.</p>}
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Username
          <input value={form.username} onChange={(e) => update("username", e.target.value)} required />
        </label>
        <label>
          Password
          <div className="password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              minLength={6}
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
        <label>
          Confirm Password
          <div className="password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirm_password}
              onChange={(e) => update("confirm_password", e.target.value)}
              minLength={6}
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
        <label>
          Full Name
          <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
        </label>
        <label>
          National ID
          <input value={form.national_id} onChange={(e) => update("national_id", e.target.value)} required />
        </label>
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login" state={bookingIntent ? { bookingIntent } : undefined}>Login</Link>
      </p>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}

export default Register;
