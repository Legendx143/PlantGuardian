import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL ?? (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? ''
    : 'http://localhost:5000'
);

interface User {
  email: string;
  name?: string;
}

interface ModalGetStartedProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: User) => void;
  initialMode?: 'signup' | 'signin';
}

export const ModalGetStarted: React.FC<ModalGetStartedProps> = ({ 
  isOpen, 
  onClose,
  onLoginSuccess,
  initialMode = 'signup'
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync mode with initialMode prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage('');
      setSuccessMessage('');
      setConfirmPassword('');
    }
  }, [isOpen, initialMode]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ──────────────────────────────────────────────────────────────────────────
  // Validation: email must be a valid format with a real provider domain
  // ──────────────────────────────────────────────────────────────────────────
  const isValidEmail = (val: string): boolean => {
    const normalized = val.trim().toLowerCase();
    // Accept any well-formed email address (user@domain.tld)
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalized);
  };


  // ──────────────────────────────────────────────────────────────────────────
  // Submit handler
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Validate email FIRST: If user writes anything other than a valid email, show "Enter a valid email"
    if (!email.trim() || !isValidEmail(email)) {
      setErrorMessage('Enter a valid email');
      return;
    }

    // 2. Mode-specific password validations
    if (mode === 'signup') {
      if (!password.trim() || !confirmPassword.trim()) {
        setErrorMessage('Please fill in all the details');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters');
        return;
      }
    } else {
      if (!password.trim()) {
        setErrorMessage('Please fill in all the details');
        return;
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Supabase is not configured. Check your environment variables.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // ── REGISTRATION ──────────────────────────────────────────────────
        // First register through the backend so it creates user in Supabase,
        // assigns email as primary key, and dispatches the welcome/confirmation email.
        let registered = false;
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              password,
            }),
          });
          const result = await res.json();
          if (!res.ok) {
            setErrorMessage(result.error || 'Unable to create account');
            setIsLoading(false);
            return;
          }
          registered = true;
        } catch {
          // If backend server is unreachable, fall back to direct Supabase sign up
          const { error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
          });
          if (error) {
            if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('exists')) {
              setErrorMessage('An account with this email already exists. Please sign in.');
            } else {
              setErrorMessage(error.message);
            }
            setIsLoading(false);
            return;
          }
          registered = true;
        }

        if (registered) {
          setIsLoading(false);
          setSuccessMessage(
            `You have registered in Pet-Care! An email has been sent to ${email.trim()}. Please sign in with your credentials.`
          );
          // Move user to the login window as requested
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        // ── LOGIN ──────────────────────────────────────────────────────────
        // Authenticate through the backend server connected with Supabase
        const trimmedEmail = email.trim().toLowerCase();
        let loginSuccess = false;
        let loggedInEmail = trimmedEmail;

        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: trimmedEmail,
              password,
            }),
          });

          const result = await res.json();

          if (res.ok && result.user?.email) {
            loginSuccess = true;
            loggedInEmail = result.user.email;
            if (result.session?.access_token) {
              localStorage.setItem('plantguardian_token', result.session.access_token);
            }
            localStorage.setItem('plantguardian_user', JSON.stringify(result.user));
          } else {
            setErrorMessage(result.error || 'Login Credentials Not Matched');
            setIsLoading(false);
            return;
          }
        } catch {
          // If backend server is unreachable, fall back to direct Supabase client
          if (supabase) {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            });
            if (!error && data.user?.email) {
              loginSuccess = true;
              loggedInEmail = data.user.email;
            }
          }
        }

        if (!loginSuccess) {
          setErrorMessage('Login Credentials Not Matched');
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        // User successfully matched credentials
        onLoginSuccess?.({ email: loggedInEmail });
        onClose();
      }
    } catch {
      setIsLoading(false);
      setErrorMessage(
        mode === 'signin' 
          ? 'Login Credentials Not Matched' 
          : 'Unable to create account. Please try again.'
      );
    }
  };

  const handleTabSwitch = (newMode: 'signup' | 'signin') => {
    setMode(newMode);
    setErrorMessage('');
    setSuccessMessage('');
    setConfirmPassword('');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Password strength indicator for signup
  // ──────────────────────────────────────────────────────────────────────────
  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: '', color: '', width: '0%' };
    if (pw.length < 6) return { label: 'Too short', color: '#ef4444', width: '20%' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: '#f59e0b', width: '40%' };
    if (score === 2) return { label: 'Fair', color: '#eab308', width: '60%' };
    if (score === 3) return { label: 'Good', color: '#84cc16', width: '80%' };
    return { label: 'Strong', color: '#22c55e', width: '100%' };
  };

  const pwStrength = mode === 'signup' ? getPasswordStrength(password) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dimmed backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8 text-white shadow-2xl transition-all duration-300 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(16, 32, 19, 0.95) 0%, rgba(10, 22, 13, 0.98) 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(199, 234, 107, 0.12)',
        }}
      >
        {/* Soft glowing ambient light */}
        <div 
          className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #c7ea6b 0%, transparent 70%)' }}
        />

        {/* Close Button at Top-Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer z-20"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              minHeight: '38px',
              maxWidth: '38px',
              maxHeight: '38px',
              borderRadius: '10px',
              border: '1px solid rgba(199, 234, 107, 0.35)',
              boxShadow: '0 0 12px rgba(199, 234, 107, 0.3)',
              backgroundColor: '#0a160d'
            }}
          >
            <img 
              src="/logo.png" 
              alt="PlantGuardian Logo" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-medium text-white leading-tight">
              {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs sm:text-sm text-white/70">
              {mode === 'signup' 
                ? 'Register with your email to join PlantGuardian' 
                : 'Sign in with your registered email and password'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl p-1 bg-white/5 border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => handleTabSwitch('signup')}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#c7ea6b] text-[#142816] shadow-md font-semibold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('signin')}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#c7ea6b] text-[#142816] shadow-md font-semibold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#c7ea6b]/20 border border-[#c7ea6b]/40 text-[#c7ea6b] text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#c7ea6b] shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col" style={{ gap: '1.25rem' }}>
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-medium text-white/90 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#c7ea6b]/70" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Enter your email address"
              className="input-auth"
              autoComplete="email"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-white/90 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#c7ea6b]/70" />
                Password
              </label>
              {mode === 'signin' && (
                <a
                  href="#forgot"
                  onClick={async (e) => { 
                    e.preventDefault(); 
                    if (!email.trim() || !isValidEmail(email)) {
                      setErrorMessage('Enter your valid email first, then click Forgot password.');
                      return;
                    }
                    try {
                      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email.trim().toLowerCase() }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setSuccessMessage(data.message || 'Password reset instructions sent to your email.');
                      } else {
                        setErrorMessage(data.error || 'Could not send reset instructions.');
                      }
                    } catch {
                      if (supabase) {
                        await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                          redirectTo: window.location.origin,
                        });
                        setSuccessMessage('Password reset instructions sent to your email.');
                      }
                    }
                  }}
                  className="text-xs text-[#c7ea6b] hover:underline cursor-pointer"
                >
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative w-full">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="••••••••"
                className="input-auth input-auth-password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="eye-toggle-btn"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator — signup only */}
            {mode === 'signup' && password.length > 0 && pwStrength && (
              <div className="flex flex-col gap-1 mt-1">
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: pwStrength.width, backgroundColor: pwStrength.color }}
                  />
                </div>
                <span className="text-[10px] font-medium" style={{ color: pwStrength.color }}>
                  {pwStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password Field — signup only */}
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-medium text-white/90 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#c7ea6b]/70" />
                Confirm Password
              </label>
              <div className="relative w-full">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className="input-auth input-auth-password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="eye-toggle-btn"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Real-time match indicator */}
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-[10px] text-green-400 font-medium">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span className="text-[10px] text-red-400 font-medium">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl btn-lime font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200"
            style={{ marginTop: '0.875rem' }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#183615] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-[#183615]">
                  {mode === 'signup' ? 'Create Free Account' : 'Sign In'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#183615]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
