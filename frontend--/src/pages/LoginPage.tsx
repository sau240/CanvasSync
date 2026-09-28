import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import '../styles/theme.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { login, isLoading, error: apiError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 6) {
      setValidationError('Password length must be at least 6 characters');
      return;
    }

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch {
      // API error state is handled directly by useAuthStore (apiError)
    }
  };

  return (
    <div className="cs-split">
      <div className="cs-hero">
        <span className="cs-wordmark">
          <span className="cs-dot" />
          CanvasSync
        </span>

        <div className="cs-hero-copy">
          <h1>Pick up the pencil where you left off.</h1>
          <p>Every room keeps drawing while you're away. Sign in and your team's board is exactly how you left it.</p>
        </div>

        <svg
          className="cs-hero-sketch"
          width="220"
          height="120"
          viewBox="0 0 220 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="18" y="20" width="64" height="46" rx="3" stroke="#3654F4" strokeWidth="2" />
          <circle cx="150" cy="38" r="24" stroke="#8A93A0" strokeWidth="2" />
          <path d="M100 90 L130 60 L160 90" stroke="#C6CDDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="95" r="4" fill="#3654F4" />
          <circle cx="185" cy="80" r="4" fill="#8A93A0" />
        </svg>
      </div>

      <div className="cs-form-side">
        <div className="cs-form-card">
          <h2>Sign in</h2>
          <p className="cs-form-sub">Enter your details to reach your rooms.</p>

          {(validationError || apiError) && (
            <div className="cs-error">{validationError || apiError}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="cs-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@studio.com"
                autoComplete="email"
              />
            </div>

            <div className="cs-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="cs-btn cs-btn-primary" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="cs-form-foot">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}