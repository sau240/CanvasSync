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
      navigate('/dashboard');
    } catch {
      // Handled by auth store
    }
  };

  return (
    <div className="cs-auth-shell">
      {/* Ambient background glow mesh */}
      <div className="cs-bento-bg-mesh">
        <div className="cs-mesh-orb cs-orb-1" style={{ width: 520, height: 520, top: '-10%', left: '-5%' }} />
        <div className="cs-mesh-orb cs-orb-2" style={{ width: 480, height: 480, bottom: '-10%', right: '-5%' }} />
      </div>

      <div className="cs-auth-card">
        {/* Brand Header */}
        <div className="cs-auth-brand">
          <div className="cs-brand-icon" style={{ margin: '0 auto 12px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="2" fill="#3B82F6" />
              <rect x="14" y="3" width="7" height="7" rx="2" fill="#8B5CF6" />
              <rect x="3" y="14" width="7" height="7" rx="2" fill="#10B981" />
              <rect x="14" y="14" width="7" height="7" rx="2" fill="#F59E0B" />
            </svg>
          </div>
          <h1 className="cs-auth-title">Create your studio account</h1>
          <p className="cs-auth-subtitle">Start collaborating in real-time in seconds</p>
        </div>

        {(validationError || apiError) && (
          <div className="cs-error" style={{ marginBottom: 16 }}>
            {validationError || apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="cs-auth-form">
          <div className="cs-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="alex_designer"
              autoComplete="username"
              className="cs-auth-input"
            />
          </div>

          <div className="cs-field">
            <label htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@studio.com"
              autoComplete="email"
              className="cs-auth-input"
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
              className="cs-auth-input"
            />
          </div>

          <div className="cs-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="cs-auth-input"
            />
          </div>

          <button
            type="submit"
            className="cs-bento-primary-btn cs-auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="cs-spinner-sm" />
                <span>Creating account…</span>
              </>
            ) : (
              <span>Get Started Free &rarr;</span>
            )}
          </button>
        </form>

        <div className="cs-auth-footer">
          <p>
            Already have an account? <Link to="/login" className="cs-auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}