import React, { useState, useEffect } from 'react';
import { JewelleryOrder, Customer, OrderStatus, ShopSettings, MetalRates, MetalType } from '../types';
import { formatINR, formatGrams } from '../utils/numberToWords';
import { StorageService } from '../services/storage';
import { Gem, Plus, Search, Printer, X, Image as ImageIcon, BookOpen, Clock, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';

interface Props {
  orders: JewelleryOrder[];
  customers: Customer[];
  settings: ShopSettings;
  rates: MetalRates;
  currentStaffName: string;
  onRefresh: () => void;
  onConvertToInvoice: (order: JewelleryOrder) => void;
}

export const JewelleryOrdersView: React.FC<Props> = ({
  orders,
  customers,
  settings,
  rates,
  currentStaffName,
  onRefresh,
  onConvertToInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<JewelleryOrder | null>(null);

  useEffect(() => {
    if (selectedOrderForPrint) {
      document.body.classList.add('has-print-modal');
    } else {
      document.body.classList.remove('has-print-modal');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, [selectedOrderForPrint]);

  // New Order Form state
  const [orderMethod, setOrderMethod] = useState<'Booklet' | 'Photo'>('Booklet');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [metalType, setMetalType] = useState<MetalType>('Gold');
  const [purity, setPurity] = useState('22K');
  const [grossWeight, setGrossWeight] = useState<number>(10);
  const [netWeight, setNetWeight] = useState<number>(9.5);
  const [stoneNotes, setStoneNotes] = useState('');
  const [makingEstimate, setMakingEstimate] = useState<number>(2500);
  const [quotedRate, setQuotedRate] = useState<number>(rates.gold22k);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(71000);
  const [advancePaid, setAdvancePaid] = useState<number>(15000);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Booklet method fields
  const [bookletNo, setBookletNo] = useState('BK-Bridal-2026');
  const [pageNo, setPageNo] = useState('');
  const [designNo, setDesignNo] = useState('');
  const [supplierName, setSupplierName] = useState('Karol Bagh Crafts');

  // Photo method fields
  const [photoUrl, setPhotoUrl] = useState('/src/assets/images/jewellery_ring_craft_1792333785170.jpg');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerMobile.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust) {
      alert('Please select a customer for this order.');
      return;
    }

    const orderNumber = StorageService.generateNextOrderNumber();
    const today = new Date().toISOString().split('T')[0];

    const newOrder: JewelleryOrder = {
      id: 'ord_' + Date.now(),
      orderNumber,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerMobile: selectedCust.mobile,
      customerAddress: selectedCust.address,
      orderDate: today,
      expectedDeliveryDate: deliveryDate,
      metalType,
      purity,
      estimatedGrossWeight: grossWeight,
      estimatedNetWeight: netWeight,
      stoneRequirements: stoneNotes || undefined,
      makingChargeEstimate: makingEstimate,
      quotedRate,
      estimatedPrice,
      advancePaid,
      remainingBalance: Math.max(0, estimatedPrice - advancePaid),
      status: advancePaid > 0 ? 'Advance Received' : 'New Request',
      bookletRef:
        orderMethod === 'Booklet'
          ? {
              bookletNo,
              pageNo,
              designNo,
            }
          : undefined,
      designPhotoUrl: orderMethod === 'Photo' ? photoUrl : undefined,
      supplierName: supplierName.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    StorageService.saveOrder(newOrder);
    onRefresh();
    setShowNewOrderModal(false);
    setSelectedOrderForPrint(newOrder);
  };

  const handleUpdateStatus = (orderId: string, nextStatus: OrderStatus) => {
    StorageService.updateOrderStatus(orderId, nextStatus);
    onRefresh();
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 ${selectedOrderForPrint ? 'print:hidden' : ''}`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Custom Manufacturing & Design Requests
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Jewellery Orders & Stock Requests
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Booklet catalogue orders, photo-based custom designs, artisan progress tracking, and bill conversion
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCust(null);
            setShowNewOrderModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Jewellery Order</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order #, customer, mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="New Request">New Request</option>
            <option value="Advance Received">Advance Received</option>
            <option value="Ordered from Supplier">Ordered from Supplier</option>
            <option value="In Production">In Production</option>
            <option value="Ready for Delivery">Ready for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrders.map((ord) => (
          <div
            key={ord.id}
            className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:border-amber-400/80 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Image banner if photo design exists */}
              {ord.designPhotoUrl && (
                <div className="h-44 bg-stone-100 overflow-hidden relative">
                  <img
                    src={ord.designPhotoUrl}
                    alt="Custom design"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] px-2 py-0.5 rounded-sm font-semibold backdrop-blur-xs">
                    Photo Design
                  </span>
                </div>
              )}

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 font-mono">
                      {ord.orderNumber}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm mt-0.5">{ord.customerName}</h3>
                    <div className="text-[11px] text-stone-500 font-mono">{ord.customerMobile}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        ord.status === 'Ready for Delivery'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'Delivered'
                          ? 'bg-stone-200 text-stone-700'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {ord.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete custom order ${ord.orderNumber} for ${ord.customerName}?`)) {
                          StorageService.deleteOrder(ord.id);
                          onRefresh();
                        }
                      }}
                      className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                      title="Delete this order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="text-xs space-y-1 text-stone-600">
                  <div className="flex justify-between">
                    <span>Metal & Purity:</span>
                    <span className="font-bold text-stone-800">{ord.metalType} {ord.purity}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Est. Gross / Net Wt:</span>
                    <span className="font-semibold text-stone-800">
                      {ord.estimatedGrossWeight}g / {ord.estimatedNetWeight}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Target:</span>
                    <span className="font-semibold text-amber-900">{ord.expectedDeliveryDate}</span>
                  </div>

                  {ord.bookletRef && (
                    <div className="bg-stone-50 p-2 rounded-lg text-[11px] font-mono text-stone-700">
                      Booklet: {ord.bookletRef.bookletNo} · P.{ord.bookletRef.pageNo} · #{ord.bookletRef.designNo}
                    </div>
                  )}

                  {ord.notes && (
                    <p className="text-[11px] text-stone-500 italic mt-1 bg-stone-50/50 p-2 rounded-md">
                      "{ord.notes}"
                    </p>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between text-stone-700">
                    <span>Estimated Total:</span>
                    <span className="font-mono font-bold text-stone-900">{formatINR(ord.estimatedPrice)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Advance Received:</span>
                    <span className="font-mono font-bold">{formatINR(ord.advancePaid)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold border-t border-amber-200/60 pt-1">
                    <span>Balance Due:</span>
                    <span className="font-mono">{formatINR(ord.remainingBalance)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedOrderForPrint(ord)}
                  className="flex-1 py-1.5 px-3 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>A4 Slip</span>
                </button>

                {ord.status !== 'Delivered' && (
                  <button
                    onClick={() => onConvertToInvoice(ord)}
                    className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>Generate Bill</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status progression quick buttons */}
              {ord.status === 'New Request' && (
                <button
                  onClick={() => handleUpdateStatus(ord.id, 'In Production')}
                  className="w-full py-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 hover:bg-amber-200 rounded-md"
                >
                  Mark In Production →
                </button>
              )}
              {ord.status === 'In Production' && (
                <button
                  onClick={() => handleUpdateStatus(ord.id, 'Ready for Delivery')}
                  className="w-full py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 rounded-md"
                >
                  Mark Ready for Delivery →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Order Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Create New Custom Jewellery Order</h3>
              </div>
              <button onClick={() => setShowNewOrderModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Method Selector */}
              <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOrderMethod('Booklet')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    orderMethod === 'Booklet'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Method A: Booklet / Catalogue Reference</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMethod('Photo')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    orderMethod === 'Photo'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Method B: Photo Design Request</span>
                </button>
              </div>

              {/* Customer Select */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Customer *</label>
                {!selectedCust ? (
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Type name or phone..."
                      value={custSearch}
                      onChange={(e) => setCustSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                    />
                    {custSearch && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-stone-100">
                        {customers
                          .filter(
                            (c) =>
                              c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
                              c.mobile.includes(custSearch)
                          )
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCust(c);
                                setCustSearch('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-amber-50 text-xs flex justify-between"
                            >
                              <span className="font-semibold text-stone-800">{c.name}</span>
                              <span className="text-stone-500 font-mono">{c.mobile}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-stone-900">{selectedCust.name}</span>
                      <span className="text-stone-500 ml-2 font-mono">({selectedCust.mobile})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCust(null)}
                      className="text-amber-700 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Method A Fields */}
              {orderMethod === 'Booklet' && (
                <div className="grid grid-cols-3 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Booklet No
                    </label>
                    <input
                      type="text"
                      value={bookletNo}
                      onChange={(e) => setBookletNo(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Page No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 42"
                      value={pageNo}
                      onChange={(e) => setPageNo(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Design / Item #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RNG-108"
                      value={designNo}
                      onChange={(e) => setDesignNo(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Method B Fields */}
              {orderMethod === 'Photo' && (
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                  <label className="text-[11px] font-semibold text-stone-700 block">
                    Design Photo Preview / URL
                  </label>
                  <div className="flex items-center gap-3">
                    <img
                      src={photoUrl}
                      alt="Design Preview"
                      className="w-16 h-16 rounded-lg object-cover border border-stone-300"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="Image URL or local design path"
                        className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono"
                      />
                      <span className="text-[10px] text-stone-500 mt-0.5 block">
                        Linked high-resolution design photo saved to order record.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Gross Wt (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Net Wt (g)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={netWeight}
                    onChange={(e) => setNetWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>
              </div>

              {/* Price & Advance */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Estimated Price (₹)
                  </label>
                  <input
                    type="number"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Advance Paid (₹)
                  </label>
                  <input
                    type="number"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Design Requirements / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ring size 14, high polish, ruby center stone, hallmarking required"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Confirm Order & Generate Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Order Confirmation Sheet */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-scrollbar bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:static print:block print:w-full print:h-auto print:bg-white print:p-0 print:m-0">
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden bg-white p-2 rounded-xl shadow-xl">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Order Sheet</span>
            </button>
            <button
              onClick={() => setSelectedOrderForPrint(null)}
              className="p-1.5 text-stone-400 hover:text-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-stone-900 p-8 shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-6 mx-auto text-xs">
            <div className="border-b-2 border-stone-800 pb-3 mb-4 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                Customer Jewellery Order Confirmation Sheet
              </div>
              <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {settings.businessName}
              </h2>
              <p className="text-xs text-stone-600">{settings.address}</p>
              <p className="text-xs text-stone-600">Contact: +91 {settings.mobile} · GSTIN: {settings.gstin}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border border-stone-300 p-3 rounded-xs mb-4">
              <div>
                <span className="font-semibold text-stone-600">Order No: </span>
                <span className="font-mono font-bold text-stone-900">{selectedOrderForPrint.orderNumber}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-stone-600">Order Date: </span>
                <span>{selectedOrderForPrint.orderDate}</span>
              </div>
              <div>
                <span className="font-semibold text-stone-600">Customer: </span>
                <span className="font-bold">{selectedOrderForPrint.customerName}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-stone-600">Delivery Expected: </span>
                <span className="font-bold text-amber-900">{selectedOrderForPrint.expectedDeliveryDate}</span>
              </div>
            </div>

            {selectedOrderForPrint.designPhotoUrl && (
              <div className="border border-stone-300 p-3 rounded-xs mb-4 flex items-center gap-4">
                <img
                  src={selectedOrderForPrint.designPhotoUrl}
                  alt="Design photo"
                  className="w-32 h-32 object-cover rounded-xs border border-stone-200"
                />
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500">
                    Design Reference Photo Attached
                  </span>
                  <p className="text-xs text-stone-700 mt-1">
                    Design approved for workshop manufacturing according to customer specifications.
                  </p>
                </div>
              </div>
            )}

            <div className="border border-stone-300 rounded-xs overflow-hidden mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-stone-100 font-bold border-b border-stone-300">
                  <tr>
                    <th className="py-2 px-3">Item Specification</th>
                    <th className="py-2 px-3 text-right">Est. Gross Wt</th>
                    <th className="py-2 px-3 text-right">Est. Net Wt</th>
                    <th className="py-2 px-3 text-right">Quoted Rate /g</th>
                    <th className="py-2 px-3 text-right">Est. Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-900">{selectedOrderForPrint.metalType} ({selectedOrderForPrint.purity})</div>
                      {selectedOrderForPrint.notes && (
                        <div className="text-[11px] text-stone-500 italic mt-0.5">{selectedOrderForPrint.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{selectedOrderForPrint.estimatedGrossWeight} g</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-950">
                      {selectedOrderForPrint.estimatedNetWeight} g
                    </td>
                    <td className="py-3 px-3 text-right font-mono">₹{selectedOrderForPrint.quotedRate}/g</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                      {formatINR(selectedOrderForPrint.estimatedPrice)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-stone-300 p-3 rounded-xs mb-6 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-600">Advance Paid:</span>
                <span className="font-mono font-bold text-emerald-800">{formatINR(selectedOrderForPrint.advancePaid)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-700 font-bold border-t border-stone-200 pt-1">
                <span>Remaining Balance Due at Delivery:</span>
                <span className="font-mono">{formatINR(selectedOrderForPrint.remainingBalance)}</span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-12">
              <div className="text-center">
                <div className="w-36 border-b border-stone-400 mb-1"></div>
                <span className="text-[10px] text-stone-500">Customer Signature</span>
              </div>
              <div className="text-center">
                <div className="text-stone-800 font-serif italic text-base mb-1">{settings.ownerName}</div>
                <div className="w-44 border-t border-stone-400 pt-1 text-[11px] font-bold text-stone-800">
                  For {settings.businessName}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
