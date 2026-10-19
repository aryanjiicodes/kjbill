import React, { useState } from 'react';
import { MetalRates, MetalRateHistoryEntry } from '../types';
import { StorageService } from '../services/storage';
import { TrendingUp, Save, Clock, History, ShieldAlert } from 'lucide-react';

interface Props {
  rates: MetalRates;
  rateHistory: MetalRateHistoryEntry[];
  currentStaffName: string;
  onRefresh: () => void;
}

export const MetalRatesView: React.FC<Props> = ({
  rates,
  rateHistory,
  currentStaffName,
  onRefresh,
}) => {
  const [gold24k, setGold24k] = useState(rates.gold24k);
  const [gold22k, setGold22k] = useState(rates.gold22k);
  const [gold18k, setGold18k] = useState(rates.gold18k);
  const [gold14k, setGold14k] = useState(rates.gold14k);
  const [silver999, setSilver999] = useState(rates.silver999);
  const [silver925, setSilver925] = useState(rates.silver925);
  const [platinum, setPlatinum] = useState(rates.platinum);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleUpdateRates = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedRates: MetalRates = {
      gold24k,
      gold22k,
      gold18k,
      gold14k,
      silver999,
      silver925,
      platinum,
      updatedAt: new Date().toISOString(),
      updatedBy: currentStaffName,
    };

    StorageService.saveRates(updatedRates, currentStaffName);
    onRefresh();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Quick helper to calculate 22k and 18k from 24k standard formula if desired
  const handleAutoCalcGold = (val24k: number) => {
    setGold24k(val24k);
    if (val24k > 0) {
      setGold22k(Math.round(val24k * 0.916));
      setGold18k(Math.round(val24k * 0.75));
      setGold14k(Math.round(val24k * 0.585));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Daily Delhi Bullion Rates
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Daily Metal Rates & Price History
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure live counter selling rates for gold and silver. Historical rates are permanently preserved in every transaction.
          </p>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300">
            Rates Updated & Stamped Successfully!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Update Form (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Set Today's Selling Rates (Per Gram)
            </h2>
          </div>

          <form onSubmit={handleUpdateRates} className="space-y-4">
            {/* Gold Rates */}
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center justify-between">
                <span>Gold Rates (₹ / Gram)</span>
                <span className="text-[11px] text-amber-700 font-normal">Delhi Bullion Standard</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    Gold 24K (Pure 999) *
                  </label>
                  <input
                    type="number"
                    required
                    value={gold24k}
                    onChange={(e) => handleAutoCalcGold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-lg text-amber-950"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Type 24K to auto-suggest 22K/18K
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    Gold 22K (Hallmark 916) *
                  </label>
                  <input
                    type="number"
                    required
                    value={gold22k}
                    onChange={(e) => setGold22k(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-lg text-amber-900"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Default for bridal jewellery
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Gold 18K (Hallmark 750)
                  </label>
                  <input
                    type="number"
                    value={gold18k}
                    onChange={(e) => setGold18k(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Gold 14K (Hallmark 585)
                  </label>
                  <input
                    type="number"
                    value={gold14k}
                    onChange={(e) => setGold14k(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Silver & Platinum Rates */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Silver & Platinum Rates (₹ / Gram)
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Silver 999 (Pure)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={silver999}
                    onChange={(e) => setSilver999(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Silver 925 (Sterling)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={silver925}
                    onChange={(e) => setSilver925(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Platinum 950
                  </label>
                  <input
                    type="number"
                    value={platinum}
                    onChange={(e) => setPlatinum(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-300/60 p-3 rounded-xl flex items-start gap-2 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Audit Guarantee:</strong> When an invoice or advance deposit is created, today's rate is frozen into that document permanently. Updating rates here will never alter past customer invoices or receipts.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save & Broadcast Today's Daily Rates</span>
            </button>
          </form>
        </div>

        {/* Right Col: Historical Rate Audit Log (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Permanent Rate Audit Ledger
              </h3>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">
              Last saved by {rates.updatedBy}
            </span>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Metal & Purity</th>
                  <th className="py-2.5 px-3 text-right">Rate / Gram</th>
                  <th className="py-2.5 px-3">Updated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rateHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 text-stone-600 font-mono">
                      <div>{entry.date}</div>
                      <div className="text-[10px] text-stone-400">{entry.time}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-stone-800">
                      {entry.metalType} ({entry.purity})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                      ₹{entry.ratePerGram}/g
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 text-[11px]">
                      {entry.updatedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
