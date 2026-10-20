import React, { useState } from 'react';
import { ShopSettings, UserRole } from '../types';
import { Lock, ShieldCheck, User, Eye, EyeOff, Sparkles, KeyRound, ArrowRight } from 'lucide-react';

interface Props {
  settings: ShopSettings;
  onUnlock: (role: UserRole, remember: boolean) => void;
}

export const AuthLockScreen: React.FC<Props> = ({ settings, onUnlock }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Owner');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isShake, setIsShake] = useState(false);

  const handleKeyClick = (char: string) => {
    setError('');
    setPassword((prev) => prev + char);
  };

  const handleBackspace = () => {
    setError('');
    setPassword((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPassword('');
  };

  const triggerShake = (errMsg: string) => {
    setError(errMsg);
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
    setPassword('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password / PIN');
      return;
    }

    const ownerPin = settings.ownerPin || '1234';
    const staffPin = settings.staffPin || '0000';

    if (selectedRole === 'Owner') {
      if (password === ownerPin) {
        onUnlock('Owner', rememberMe);
      } else {
        triggerShake('Incorrect Owner Password. (Default: 1234)');
      }
    } else {
      if (password === staffPin) {
        onUnlock('Staff', rememberMe);
      } else {
        triggerShake('Incorrect Staff Password. (Default: 0000)');
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-amber-500/20 selection:text-amber-300">
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.12)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Emblem & Heading */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-serif font-bold text-2xl shadow-lg shadow-amber-950/40">
            KJ
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-amber-100">
            {settings.businessName}
          </h1>
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-amber-400/80 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Counter Billing & POS Terminal</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xs text-stone-400">
            Please enter your PIN / Password to access the terminal
          </p>
        </div>

        {/* Lock Card */}
        <div className={`bg-stone-900/90 border border-stone-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-5 transition-transform ${
          isShake ? 'animate-shake' : ''
        }`}>
          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-stone-950/80 p-1.5 rounded-xl border border-stone-800/80">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Owner');
                setPassword('');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                selectedRole === 'Owner'
                  ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Owner Access</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('Staff');
                setPassword('');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                selectedRole === 'Staff'
                  ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Counter Staff</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input with Toggle Visibility */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedRole === 'Owner' ? 'Owner Password / PIN' : 'Staff Password / PIN'}</span>
                </span>
                <span className="text-[11px] text-stone-500">
                  {selectedRole === 'Owner' ? 'Default: 1234' : 'Default: 0000'}
                </span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setError('');
                    setPassword(e.target.value);
                  }}
                  autoFocus
                  placeholder="Enter Password / PIN"
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-amber-200 placeholder:text-stone-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-rose-400 text-center font-medium pt-1 animate-fadeIn">
                  {error}
                </p>
              )}
            </div>

            {/* Quick Touch Numpad (Perfect for Counter Touchscreens & Fast Entry) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyClick(num)}
                  className="py-3 bg-stone-950/70 hover:bg-stone-800 active:scale-95 text-stone-200 font-mono font-bold text-base rounded-xl border border-stone-800/80 transition-all"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3 bg-stone-950/40 hover:bg-stone-800/80 active:scale-95 text-stone-400 font-semibold text-xs rounded-xl border border-stone-800/60 transition-all uppercase"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('0')}
                className="py-3 bg-stone-950/70 hover:bg-stone-800 active:scale-95 text-stone-200 font-mono font-bold text-base rounded-xl border border-stone-800/80 transition-all"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3 bg-stone-950/40 hover:bg-stone-800/80 active:scale-95 text-stone-400 font-semibold text-xs rounded-xl border border-stone-800/60 transition-all"
              >
                ⌫
              </button>
            </div>

            {/* Remember Device Checkbox */}
            <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-500/20"
                />
                <span>Remember on this device</span>
              </label>
              <span className="text-[11px] text-stone-500">Auto-unlocks next time</span>
            </div>

            {/* Submit Unlock Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 stroke-[2.5]" />
              <span>Unlock Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Security Note Footer */}
        <div className="text-center text-[11px] text-stone-500 space-y-1">
          <p>Protected by Kamakhya Jewellers Security Access</p>
          <p>Owner can update PINs anytime inside Settings.</p>
        </div>
      </div>
    </div>
  );
};
