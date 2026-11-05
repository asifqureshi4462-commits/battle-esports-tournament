import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

const REMEMBER_KEY = 'battle_esports_remember_username';

function readRemembered(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) || '';
  } catch {
    return '';
  }
}

export const AuthScreen: React.FC = () => {
  const { login } = useAuth();

  const remembered = readRemembered();
  const [identifier, setIdentifier] = useState(remembered);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(remembered !== '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const id = identifier.trim();
    const nextErrors: typeof errors = {};
    if (!id) nextErrors.identifier = 'Please enter your username or email';
    if (!password) nextErrors.password = 'Please enter your password';
    setErrors(nextErrors);
    if (nextErrors.identifier || nextErrors.password) return;

    setLoading(true);
    try {
      try {
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, id);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // ignore storage errors
      }
      await login(id, password);
    } catch (err: any) {
      setErrors({ form: err?.message || 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full py-2.5 bg-zinc-900 border rounded-xl text-white text-sm outline-none transition focus:border-rose-500';

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col justify-center items-center p-3.5 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0e1017] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-fade-in">
        {/* Branding */}
        <div className="px-6 pt-8 pb-5 bg-gradient-to-b from-rose-950/40 via-zinc-900/60 to-[#0e1017] border-b border-zinc-800/80 text-center">
          <img
            src="/assets/aistudio/file_000000002f448211a4cad723873e084a_76d4f186.png"
            alt="Battle Esports Tournament Logo"
            className="w-28 h-28 rounded-3xl mx-auto mb-4 shadow-xl shadow-purple-950/60 border border-zinc-700/60 object-cover"
          />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold tracking-wider uppercase mb-2">
            <Shield className="w-3 h-3" /> Official Tournament Arena
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white font-heading tracking-wide leading-snug">
            Welcome to Battle Esports Tournament
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Play • Compete • Win</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errors.form}</span>
            </div>
          )}

          {notice && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{notice}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-identifier" className="text-xs font-semibold text-zinc-300 block mb-1">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <User className="w-4 h-4" />
              </span>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) setErrors((p) => ({ ...p, identifier: undefined }));
                }}
                placeholder="Enter username or email"
                className={`${inputBase} pl-9 pr-3 ${errors.identifier ? 'border-rose-500' : 'border-zinc-700'}`}
              />
            </div>
            {errors.identifier && <p className="text-[11px] text-rose-400 mt-1">{errors.identifier}</p>}
          </div>

          <div>
            <label htmlFor="login-password" className="text-xs font-semibold text-zinc-300 block mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="Enter password"
                className={`${inputBase} pl-9 pr-10 ${errors.password ? 'border-rose-500' : 'border-zinc-700'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[11px] text-rose-400 mt-1">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-zinc-700 accent-rose-500"
              />
              Remember Me
            </label>
            <button
              type="button"
              onClick={() =>
                setNotice('Testing mode: password reset is not available. Enter any username and password to log in.')
              }
              className="text-[11px] text-zinc-400 hover:text-rose-400 transition cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Logging in...
              </>
            ) : (
              <>
                Login <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-zinc-500">
            Testing mode • any non-empty username/email and password will work
          </p>
        </form>
      </div>
    </div>
  );
};
