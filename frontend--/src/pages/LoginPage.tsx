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
      setValidationError('Password must be at least 6 characters long.');
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
    <div className="cs-auth-shell">
      {/* Ambient background glow mesh */}
      <div className="cs-bento-bg-mesh">
        <div className="cs-mesh-orb cs-orb-1" style={{ width: 500, height: 500, top: '-10%', left: '-5%' }} />
        <div className="cs-mesh-orb cs-orb-2" style={{ width: 450, height: 450, bottom: '-10%', right: '-5%' }} />
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
          <h1 className="cs-auth-title">Welcome back to CanvasSync</h1>
          <p className="cs-auth-subtitle">Sign in to your real-time collaborative workspace</p>
        </div>

        {(validationError || apiError) && (
          <div className="cs-error" style={{ marginBottom: 16 }}>
            {validationError || apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="cs-auth-form">
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
              placeholder="••••••••"
              autoComplete="current-password"
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
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign in &rarr;</span>
            )}
          </button>
        </form>

        <div className="cs-auth-footer">
          <p>
            Don't have an account yet? <Link to="/register" className="cs-auth-link">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}