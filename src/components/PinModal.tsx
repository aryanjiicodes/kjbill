import React, { useState } from 'react';
import { UserRole, ShopSettings } from '../types';
import { ShieldCheck, User, X, KeyRound } from 'lucide-react';

interface Props {
  currentRole: UserRole;
  settings: ShopSettings;
  onSelectRole: (role: UserRole) => void;
  onClose: () => void;
}

export const PinModal: React.FC<Props> = ({ currentRole, settings, onSelectRole, onClose }) => {
  const [targetRole, setTargetRole] = useState<UserRole>(currentRole === 'Owner' ? 'Staff' : 'Owner');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleVerify = () => {
    if (targetRole === 'Owner') {
      const correctPin = settings.ownerPin || '1234';
      if (pin === correctPin) {
        onSelectRole('Owner');
        onClose();
      } else {
        setError('Incorrect Owner PIN. (Default: 1234)');
        setPin('');
      }
    } else {
      const correctPin = settings.staffPin || '0000';
      if (pin === correctPin || pin === '') {
        onSelectRole('Staff');
        onClose();
      } else {
        setError('Incorrect Staff PIN. (Default: 0000)');
        setPin('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-base">Counter Switch PIN</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-5">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2">
              Select Operating Mode
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTargetRole('Owner');
                  setPin('');
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  targetRole === 'Owner'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Owner ({settings.ownerName?.split(' ')[0] || 'Dhananjay'})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetRole('Staff');
                  setPin('');
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  targetRole === 'Staff'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Sales Staff</span>
              </button>
            </div>
          </div>

          {/* PIN Dots */}
          <div className="flex justify-center items-center gap-3 mb-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-amber-600 border-amber-600 scale-110'
                    : 'border-stone-300 bg-stone-50'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="text-center text-rose-600 text-xs font-semibold mb-3">
              {error}
            </div>
          )}

          {/* Number Pad for Counter Ease */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-12 text-lg font-bold text-stone-800 bg-stone-50 hover:bg-amber-50 active:bg-amber-100 rounded-xl border border-stone-200 transition-colors"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 text-xs font-semibold text-stone-500 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200"
            >
              Clear
            </button>
            <button
              key="0"
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-12 text-lg font-bold text-stone-800 bg-stone-50 hover:bg-amber-50 rounded-xl border border-stone-200"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-12 text-xs font-semibold text-rose-600 bg-stone-50 hover:bg-rose-50 rounded-xl border border-stone-200"
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
          >
            Unlock & Switch Mode
          </button>
          <div className="text-center text-[11px] text-stone-400 mt-2">
            Default Owner PIN: 1234 · Staff PIN: 0000
          </div>
        </div>
      </div>
    </div>
  );
};
