import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import '../styles/theme.css';

export default function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { register, isLoading, error: apiError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    try {
      await register({ username, email, password });
      navigate('/dashboard'); // Redirect to dashboard after successful signup
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
          <h1>Every idea starts as a scribble.</h1>
          <p>Create an account, open a room, and hand the link to whoever you're building this with.</p>
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
          <rect x="24" y="54" width="46" height="46" rx="3" stroke="#8A93A0" strokeWidth="2" />
          <rect x="90" y="20" width="46" height="46" rx="3" stroke="#3654F4" strokeWidth="2" />
          <line x1="70" y1="77" x2="90" y2="43" stroke="#C6CDDB" strokeWidth="2" strokeLinecap="round" />
          <circle cx="182" cy="60" r="4" fill="#3654F4" />
          <circle cx="150" cy="95" r="4" fill="#8A93A0" />
        </svg>
      </div>

      <div className="cs-form-side">
        <div className="cs-form-card">
          <h2>Create your account</h2>
          <p className="cs-form-sub">Takes a minute. No credit card, no waiting on an invite.</p>

          {(validationError || apiError) && (
            <div className="cs-error">{validationError || apiError}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="cs-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="How your teammates will see you"
                autoComplete="username"
              />
            </div>

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
                autoComplete="new-password"
              />
            </div>

            <div className="cs-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Type it again"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="cs-btn cs-btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <p className="cs-form-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}