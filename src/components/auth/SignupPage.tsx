import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { UserPlus, Mail, Lock, User as UserIcon, Building2 } from 'lucide-react';
import './Auth.css';

export const SignupPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const inviteToken = params.get('token');
  const inviteEmail = params.get('email');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupOpen, setSignupOpen] = useState<boolean | null>(inviteToken ? true : null);
  
  const signup = useAuthStore(state => state.signup);
  const acceptInvitationWithToken = useAuthStore(state => state.acceptInvitationWithToken);
  const isLoading = useAuthStore(state => state.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (inviteToken) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/signup-status');
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setSignupOpen(Boolean(data.open));
      } catch {
        if (!cancelled) setSignupOpen(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken || !inviteEmail) {
      toast.error('Invalid invitation link');
      return;
    }
    if (!password || password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await acceptInvitationWithToken(inviteToken, password);
      toast.success('Invitation accepted. Welcome!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      await signup(email, name, password);
      toast.success('Workspace created! You are now the Super Admin.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    }
  };

  if (inviteToken) {
    return (
      <div className="auth-container">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="auth-header">
            <div className="auth-logo">
              <UserPlus size={28} />
            </div>
            <h2>Accept Invitation</h2>
            <p>Set a password to join the workspace</p>
          </div>

          <form onSubmit={handleAccept} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-icon-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  id="email"
                  type="email"
                  value={inviteEmail || ''}
                  disabled
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-icon-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-icon-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="auth-actions">
              <label className="terms">
                <input type="checkbox" required />
                <span>I agree to the Terms & Conditions</span>
              </label>
            </div>

            <button type="submit" className="auth-btn" disabled={isLoading}>
              {isLoading ? <span className="loader"></span> : 'Accept Invitation'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Invite expired or wrong link?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (signupOpen === null) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!signupOpen) {
    return (
      <div className="auth-container">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="auth-header">
            <div className="auth-logo">
              <Building2 size={28} />
            </div>
            <h2>Invite only</h2>
            <p>A workspace already exists on this server.</p>
          </div>
          <div className="signup-role-info">
            <p className="role-info-desc">
              Ask a Super Admin or Department Admin to send you an invitation link.
              You cannot create another Super Admin from this page.
            </p>
          </div>
          <div className="auth-footer">
            <p>
              Already invited? Check your email/link, or{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-header">
          <div className="auth-logo">
            <Building2 size={28} />
          </div>
          <h2>Create Your Workspace</h2>
          <p>Set up your team management hub</p>
        </div>

        <div className="signup-role-info">
          <div className="role-info-badge">
            <UserPlus size={16} />
            <span>You'll be the <strong>Super Admin</strong></span>
          </div>
          <p className="role-info-desc">
            As Super Admin, you'll manage departments, invite team members, and control payroll.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-icon-wrapper">
              <UserIcon className="input-icon" size={18} />
              <input 
                id="name"
                type="text" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" size={18} />
              <input 
                id="email"
                type="email" 
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" size={18} />
              <input 
                id="password"
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" size={18} />
              <input 
                id="confirmPassword"
                type="password" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="auth-actions">
            <label className="terms">
              <input type="checkbox" required />
              <span>I agree to the Terms & Conditions</span>
            </label>
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? <span className="loader"></span> : 'Create Workspace'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </motion.div>
    </div>
  );
};
