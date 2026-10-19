import React, { useState } from 'react';
import { InventoryItem, MetalRates, ShopSettings, MetalType, MakingChargeType } from '../types';
import { formatINR, formatGrams } from '../utils/numberToWords';
import { StorageService } from '../services/storage';
import { Package, Plus, Search, Printer, X, Tag, AlertTriangle } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  rates: MetalRates;
  settings: ShopSettings;
  onRefresh: () => void;
}

export const InventoryView: React.FC<Props> = ({ inventory, rates, settings, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [metalFilter, setMetalFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [tagNumber, setTagNumber] = useState(`KJ-TAG-${String(inventory.length + 1).padStart(3, '0')}`);
  const [productName, setProductName] = useState('');
  const [metalType, setMetalType] = useState<MetalType>('Gold');
  const [purity, setPurity] = useState('22K');
  const [grossWeight, setGrossWeight] = useState<number>(10);
  const [stoneWeight, setStoneWeight] = useState<number>(0);
  const [makingChargeRate, setMakingChargeRate] = useState<number>(200);
  const [makingChargeType, setMakingChargeType] = useState<MakingChargeType>('per_gram');
  const [purchaseCost, setPurchaseCost] = useState<number>(65000);
  const [sellingEstimate, setSellingEstimate] = useState<number>(75000);
  const [supplier, setSupplier] = useState('Karol Bagh Artisan');
  const [quantity, setQuantity] = useState<number>(1);

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMetal = metalFilter === 'All' || item.metalType === metalFilter;
    return matchesSearch && matchesMetal;
  });

  const totalGoldWeight = inventory
    .filter((i) => i.metalType === 'Gold')
    .reduce((s, i) => s + (i.netWeight * i.quantity), 0);

  const totalSilverWeight = inventory
    .filter((i) => i.metalType === 'Silver')
    .reduce((s, i) => s + (i.netWeight * i.quantity), 0);

  const totalValuation = inventory.reduce(
    (s, i) => s + (i.sellingPriceEstimate * i.quantity),
    0
  );

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    const netWeight = Math.max(0, grossWeight - stoneWeight);

    const newItem: InventoryItem = {
      id: 'inv_item_' + Date.now(),
      tagNumber,
      productName: productName.trim(),
      metalType,
      purity,
      grossWeight,
      stoneWeight,
      netWeight,
      makingChargeRate,
      makingChargeType,
      ratePerGram:
        metalType === 'Gold'
          ? (purity === '24K' ? rates.gold24k : purity === '18K' ? rates.gold18k : purity === '14K' ? rates.gold14k : rates.gold22k)
          : metalType === 'Silver'
          ? (purity === '925' ? rates.silver925 : rates.silver999)
          : rates.platinum,
      purchaseCost,
      sellingPriceEstimate: sellingEstimate,
      hsnCode: metalType === 'Silver' ? '711311' : '711319',
      supplier: supplier.trim(),
      inStock: quantity > 0,
      quantity,
      createdAt: new Date().toISOString().split('T')[0],
    };

    StorageService.saveInventoryItem(newItem);
    onRefresh();
    setShowAddModal(false);
    setProductName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Stock Register & Physical Valuation
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Jewellery Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Track hallmarked stock, gram weight balances, tag numbers, and low inventory warnings
          </p>
        </div>

        <button
          onClick={() => {
            setTagNumber(`KJ-TAG-${String(inventory.length + 1).padStart(3, '0')}`);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stock Item</span>
        </button>
      </div>

      {/* Stock Weight KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-stone-500 mb-1">
            Total Gold Stock Weight
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-900">
            {formatGrams(totalGoldWeight)}
          </div>
          <div className="text-xs text-stone-500 mt-1">22K & 24K pure metal balance</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-stone-500 mb-1">
            Total Silver Stock Weight
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-700">
            {formatGrams(totalSilverWeight)}
          </div>
          <div className="text-xs text-stone-500 mt-1">925 & 999 silver articles</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-stone-500 mb-1">
            Total Showroom Valuation
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
            {formatINR(totalValuation)}
          </div>
          <div className="text-xs text-stone-500 mt-1">Estimated market value of stock</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by tag #, item name, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Filter Metal:</span>
          <select
            value={metalFilter}
            onChange={(e) => setMetalFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
          >
            <option value="All">All Metals</option>
            <option value="Gold">Gold Only</option>
            <option value="Silver">Silver Only</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 text-[11px]">
              <tr>
                <th className="py-3 px-3">Tag #</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-2">Metal</th>
                <th className="py-3 px-2">Purity</th>
                <th className="py-3 px-3 text-right">Gross Wt</th>
                <th className="py-3 px-3 text-right font-bold text-amber-950">Net Wt</th>
                <th className="py-3 px-3 text-right">Mkg Chg</th>
                <th className="py-3 px-3 text-right">Est. Price</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-2 text-center">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-amber-800">
                    {item.tagNumber}
                  </td>
                  <td className="py-3 px-3 font-semibold text-stone-900">
                    {item.productName}
                  </td>
                  <td className="py-3 px-2 font-medium">{item.metalType}</td>
                  <td className="py-3 px-2 font-bold">{item.purity}</td>
                  <td className="py-3 px-3 text-right font-mono">{formatGrams(item.grossWeight)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-950 bg-amber-50/40">
                    {formatGrams(item.netWeight)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-stone-600">
                    ₹{item.makingChargeRate}/g
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                    {formatINR(item.sellingPriceEstimate)}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 text-stone-600 text-[11px]">
                    {item.supplier}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                        item.quantity > 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.quantity === 1
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.quantity > 0 ? `${item.quantity} In Stock` : 'Out of Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Jewellery Item to Stock</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Tag / Barcode #</label>
                  <input
                    type="text"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Product Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 22k Gold Bangles (Set of 2)"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Metal</label>
                  <select
                    value={metalType}
                    onChange={(e) => {
                      const newMetal = e.target.value as MetalType;
                      setMetalType(newMetal);
                      if (newMetal === 'Gold') setPurity('22K');
                      else if (newMetal === 'Silver') setPurity('Silver');
                      else setPurity('Pt 950');
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Purity</label>
                  <select
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg font-bold"
                  >
                    {metalType === 'Gold' ? (
                      <>
                        <option value="22K">22K (916)</option>
                        <option value="24K">24K</option>
                        <option value="18K">18K</option>
                        <option value="14K">14K</option>
                      </>
                    ) : metalType === 'Silver' ? (
                      <>
                        <option value="Silver">Silver</option>
                        <option value="925">925 Sterling</option>
                        <option value="999">999 Fine</option>
                        <option value="800">800 Silver</option>
                      </>
                    ) : (
                      <option value="Pt 950">Pt 950</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Gross Weight (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Stone Weight (g)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={stoneWeight}
                    onChange={(e) => setStoneWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Selling Est. (₹)</label>
                  <input
                    type="number"
                    value={sellingEstimate}
                    onChange={(e) => setSellingEstimate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Supplier / Artisan</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Add to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
