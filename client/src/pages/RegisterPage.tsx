import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../CardSymbols';
import './AuthPages.css';

function validate(
  username: string,
  email: string,
  password: string,
  confirm: string,
): string | null {
  if (username.length < 3 || username.length > 24) {
    return 'Username must be 3–24 characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username may only contain letters, numbers, and underscores';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (password !== confirm) {
    return 'Passwords do not match';
  }
  return null;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate(username, email, password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register(username, email, password);
      navigate('/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Logo className="auth-logo-icon" />
          <span className="auth-logo-text">MindLoop</span>
        </div>
        <h1>Create account</h1>
        <p className="auth-subtitle">Join the MindLoop arena</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <label className="auth-label">
            <span>Username</span>
            <input
              type="text"
              className="auth-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={24}
              required
            />
          </label>

          <label className="auth-label">
            <span>Email</span>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-label">
            <span>Password</span>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className="auth-label">
            <span>Confirm password</span>
            <input
              type="password"
              className="auth-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <button type="submit" className="btn-primary btn-large auth-submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
