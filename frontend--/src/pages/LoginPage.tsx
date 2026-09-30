import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import '../styles/theme.css';
import '../styles/auth.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { login, isLoading, error: apiError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email.trim()) {
      setValidationError('Please enter your work email.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch {
      // Handled by auth store
    }
  };

  return (
    <div className="cs-dual-stage">
      {/* 2-Color Stage Glow Orbs */}
      <div className="cs-stage-glow cs-glow-top" />
      <div className="cs-stage-glow cs-glow-bottom" />

      {/* Dual-Tone Auth Card */}
      <div className="cs-dual-card">
        {/* Stage Header */}
        <div className="cs-dual-header">
          <div className="cs-dual-badge">
            <span className="cs-badge-dot" />
            <span>Dual Stage Security</span>
          </div>

          <div className="cs-dual-logo-wrap">
            <div className="cs-dual-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
          </div>

          <h1 className="cs-dual-title">
            Sign In to <span className="cs-dual-title-gradient">CanvasSync</span>
          </h1>
          <p className="cs-dual-subtitle">
            Experience lightning-fast collaborative canvas streaming in real-time.
          </p>
        </div>

        {/* Error Feedback */}
        {(validationError || apiError) && (
          <div className="cs-dual-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{validationError || apiError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="cs-dual-form">
          <div className="cs-dual-field">
            <label className="cs-dual-label" htmlFor="login-email">
              Work Email
            </label>
            <div className="cs-dual-input-wrap">
              <span className="cs-dual-input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                autoComplete="email"
                className="cs-dual-input"
              />
            </div>
          </div>

          <div className="cs-dual-field">
            <div className="cs-dual-label-row">
              <label className="cs-dual-label" htmlFor="login-password">
                Password
              </label>
            </div>
            <div className="cs-dual-input-wrap">
              <span className="cs-dual-input-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="cs-dual-input"
              />
              <button
                type="button"
                className="cs-dual-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="cs-dual-btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="cs-dual-spinner" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>Enter Studio</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Studio Highlights */}
        <div className="cs-dual-features">
          <div className="cs-dual-feature-item">
            <span className="cs-feature-cyan-dot" />
            <span>0 ms broadcast delay</span>
          </div>
          <div className="cs-dual-feature-item">
            <span className="cs-feature-cyan-dot" />
            <span>Vector SVG sync</span>
          </div>
        </div>

        {/* Footer */}
        <div className="cs-dual-footer">
          <span>New to CanvasSync?</span>
          <Link to="/register" className="cs-dual-link">
            Create an account &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}