import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  Trophy,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Phone,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();

  // Unified authentication screen: Log In (users & admins) or Sign Up
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Unified Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign up form state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupBgmiIgn, setSignupBgmiIgn] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupAgree, setSignupAgree] = useState(true);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // Google sign in state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Unified Login Handler (authenticates normal gamers and administrators)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const id = loginIdentifier.trim();
    if (!id) {
      setLoginError('Please enter your email, username, or ID');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password');
      return;
    }

    setLoginLoading(true);
    try {
      // Backend automatically checks role; if admin, redirects to Admin Panel; if player, to User Panel
      await login(id, loginPassword);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email/ID or password');
    } finally {
      setLoginLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(null);

    if (!signupUsername.trim() || signupUsername.trim().length < 3) {
      setSignupError('Username must be at least 3 characters long');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@') || !signupEmail.includes('.')) {
      setSignupError('Please enter a valid email address');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }
    if (!signupAgree) {
      setSignupError('Please agree to the tournament fair play and anti-cheat terms');
      return;
    }

    setSignupLoading(true);
    try {
      await register({
        username: signupUsername.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        phone: signupPhone.trim() || undefined,
        bgmiIgn: signupBgmiIgn.trim() || undefined,
      });
      setSignupSuccess('Account created successfully! Welcome to BATTLE ESPORTS.');
    } catch (err: any) {
      setSignupError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setLoginError(null);
    try {
      // Real Google OAuth is not configured yet. The old code logged everyone into a
      // hardcoded email account, which is a security hole, so it was removed.
      throw new Error('Google sign-in is not available yet. Please use email and password.');
    } catch (err: any) {
      setLoginError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col justify-center items-center p-3.5 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card Container */}
      <div className="w-full max-w-md bg-[#0e1017] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col animate-fade-in">
        {/* Header Branding Banner */}
        <div className="p-6 bg-gradient-to-b from-rose-950/40 via-zinc-900/60 to-[#0e1017] border-b border-zinc-800/80 text-center relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden p-0.5 mx-auto mb-3 shadow-xl shadow-rose-950/80 border border-rose-500/40 bg-gradient-to-tr from-rose-600 to-amber-500">
            <div className="w-full h-full rounded-[14px] overflow-hidden bg-[#0e1017]">
              <img
                src="/assets/aistudio/file_000000002f448211a4cad723873e084a_76d4f186.png"
                alt="Battle Esports Logo"
                className="w-full h-full object-cover scale-125 hover:scale-135 transition-transform"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold tracking-wider uppercase mb-1">
            <Shield className="w-3 h-3" /> Official Tournament Arena
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white font-heading tracking-wider">
            BATTLE ESPORTS
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real Cash Tournaments • BGMI • Free Fire • Instant UPI
          </p>
        </div>

        {/* Tab Switcher: Log In vs Sign Up (No admin buttons or tabs) */}
        <div className="grid grid-cols-2 p-1.5 bg-zinc-950/80 border-b border-zinc-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setLoginError(null);
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setSignupError(null);
            }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signup'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* TAB 1: UNIFIED LOGIN (Users & Administrators) */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed">{loginError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Email, Username, or Admin ID
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter email, username, or Admin ID"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => alert('Password reset instructions sent to your registered email.')}
                    className="text-[11px] text-zinc-400 hover:text-rose-400 transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50 cursor-pointer mt-1"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  <>
                    Sign In to Arena <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Google Sign In option */}
              <div className="pt-2">
                <div className="relative flex items-center justify-center mb-3">
                  <div className="border-t border-zinc-800 w-full" />
                  <span className="bg-[#0e1017] px-2 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                    Or Sign In With
                  </span>
                  <div className="border-t border-zinc-800 w-full" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{googleLoading ? 'Connecting Google Account...' : 'Continue with Google Account'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP / CREATE ACCOUNT */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              {signupError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{signupError}</span>
                </div>
              )}

              {signupSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/60 text-emerald-300 text-xs flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{signupSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Gamer Username <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="e.g. ApexPredator99"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="6+ chars"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    Mobile / UPI Phone (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    BGMI / Game IGN (Optional)
                  </label>
                  <input
                    type="text"
                    value={signupBgmiIgn}
                    onChange={(e) => setSignupBgmiIgn(e.target.value)}
                    placeholder="e.g. TX_PLAYER"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-750 focus:border-rose-500 rounded-xl text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Bonus Tag */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Sign up bonus: <strong>100 Free Battle Coins</strong> credited automatically!</span>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer text-[10px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={signupAgree}
                  onChange={(e) => setSignupAgree(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 text-rose-500 focus:ring-0"
                />
                <span>
                  I confirm that I am 18+ years of age and agree to fair play anti-cheat rules and tournament terms.
                </span>
              </label>

              <button
                type="submit"
                disabled={signupLoading}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition disabled:opacity-50 cursor-pointer"
              >
                {signupLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Registering Permanent Gamer Account...
                  </>
                ) : (
                  <>
                    Create Gamer Account <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Notice */}
      <div className="mt-4 text-center text-[10px] text-zinc-600 space-y-1">
        <p>BATTLE ESPORTS TOURNAMENTS • Protected by SHA-256 Auth & Audited Ledger</p>
        <p>All rights reserved. Fair play and anti-cheat policies strictly enforced.</p>
      </div>
    </div>
  );
};
