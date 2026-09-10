import React, { useState, useEffect } from "react";
import { Plus, Save, FileText, Landmark, Hash, Wallet, AlertTriangle, ArrowUpRight, ArrowDownRight, Receipt, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

import InputField from "@/app/common/components/InputField";
import Button from "@/app/common/components/Button";
import { safeFormatCurrency } from "@/app/common/lib/utils";
import { purchaseLedgerService } from "../purchaseLedger.service";

const BANK_OPTIONS = ["Kotak Mahindra Bank", "YesBank", "Credit Card", "Payment Gateway", "HDFC", "Cash", "Other"];

export default function PurchaseLedgerForm({ vendorId, unpaidBills = [], onSuccess, availableAdvance = 0, editingLog, onCancelEdit }) {
  const [activeTab, setActiveTab] = useState("credit"); // 'credit' = Bill, 'debit' = Payment
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [isCustomTds, setIsCustomTds] = useState(false);

  const initialFormState = {
    date: new Date().toISOString().split("T")[0],
    description: "",
    invoiceNo: "",
    logicalCircuitId: "",
    productType: "",
    baseAmount: "",
    totalAmount: "",
    tdsHead: "",
    tdsPercentage: "",
    debit: "",
    bankName: "",
    utrReference: "",
    remarks: "",
    isUsingAdvance: false,
    allocations: [],
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormData({ ...initialFormState, date: formData.date });
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => {
      const nextState = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "baseAmount") {
        const newBase = Number(value) || 0;
        nextState.totalAmount = newBase !== 0 ? (newBase * 1.18).toFixed(2) : "";
      }

      return nextState;
    });
  };

  useEffect(() => {
    if (editingLog) {
      const isBill = editingLog.credit > 0;
      setActiveTab(isBill ? "credit" : "debit");
      setFormData({
        date: editingLog.date ? new Date(editingLog.date).toISOString().split("T")[0] : "",
        description: editingLog.description || "",
        invoiceNo: editingLog.invoiceNo || "",
        logicalCircuitId: editingLog.logicalCircuitId || "",
        productType: editingLog.productType || "",
        baseAmount: editingLog.baseAmount || editingLog.credit || "",
        totalAmount: editingLog.totalAmount || "",
        tdsHead: editingLog.tdsHead || "",
        tdsPercentage: editingLog.tdsPercentage || "",
        debit: editingLog.debit || "",
        bankName: editingLog.bankInfo?.bankName || "",
        utrReference: editingLog.bankInfo?.utrReference || "",
        remarks: editingLog.remarks || "",
        isUsingAdvance: editingLog.isUsingAdvance || false,
        allocations: editingLog.allocations || [],
      });

      if (editingLog.productType && !["NLD", "Enterprise ILL"].includes(editingLog.productType)) {
        setIsCustomProduct(true);
      } else {
        setIsCustomProduct(false);
      }

      if (editingLog.tdsHead && !["194J", "194I", "194C", "194H"].includes(editingLog.tdsHead)) {
        setIsCustomTds(true);
      } else {
        setIsCustomTds(false);
      }
    } else {
      setFormData(initialFormState);
      setIsCustomProduct(false);
      setIsCustomTds(false);
    }
  }, [editingLog]);

  const previewBase = Number(formData.baseAmount) || 0;
  const previewTotal = formData.totalAmount ? Number(formData.totalAmount) : (previewBase * 1.18);
  const previewTdsPct = Number(formData.tdsPercentage) || 0;
  const previewTdsAmount = previewBase * (previewTdsPct / 100);
  const previewPayable = previewTotal - previewTdsAmount;
  const allocations = formData.allocations || [];
  const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amountApplied || 0), 0);
  const paymentAmount = Number(formData.debit || 0);
  const unallocatedAmount = Math.max(0, paymentAmount - totalAllocated);

  const handleAllocationToggle = (bill, isChecked) => {
    let currentAlloc = [...allocations];
    const billId = bill._id || bill.id;

    if (isChecked) {
      const remainingPayment = Math.max(0, paymentAmount - totalAllocated);
      const amountToApply = paymentAmount > 0 ? Math.min(bill.balanceDue, remainingPayment) : bill.balanceDue;
      currentAlloc.push({ billId, amountApplied: amountToApply });
    } else {
      currentAlloc = currentAlloc.filter((a) => a.billId !== billId);
    }
    setFormData((prev) => ({ ...prev, allocations: currentAlloc }));
  };

  const handleAllocationAmountChange = (billId, newAmount) => {
    const parsed = newAmount === "" ? "" : Number(newAmount);
    const currentAlloc = allocations.map((a) =>
      a.billId === billId ? { ...a, amountApplied: parsed } : a
    );
    setFormData((prev) => ({ ...prev, allocations: currentAlloc }));
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading("Saving AP entry...");

    try {
      const sanitizedAllocations = (formData.allocations || [])
        .filter((a) => Number(a.amountApplied) > 0)
        .map((a) => ({ billId: a.billId, amountApplied: Number(a.amountApplied) }));

      const payload = {
        ...formData,
        vendor: vendorId,
        allocations: sanitizedAllocations,
        bankInfo: {
          bankName: formData.bankName,
          utrReference: formData.utrReference,
        },
      };

      if (editingLog) {
        await purchaseLedgerService.editLedgerEntry(editingLog._id || editingLog.id, payload);
        toast.success("Entry updated successfully!", { id: toastId });
        if (onCancelEdit) onCancelEdit();
      } else {
        await purchaseLedgerService.addDirectEntry(payload);
        toast.success("Entry saved successfully!", { id: toastId });
        setFormData(initialFormState);
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      const errorMsg = error?.response?.data?.message || "Failed to save entry.";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
      setShowAdvanceModal(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (activeTab === "debit" && unallocatedAmount > 0) {
      setShowAdvanceModal(true);
      return;
    }
    executeSubmit();
  };

  const isBillTab = activeTab === "credit";
  const isPaymentTab = activeTab === "debit";
  const showBankDetails = isPaymentTab && !formData.isUsingAdvance;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-purple-50/50 border-purple-100 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2 text-purple-900">
          <Plus size={18} className="text-purple-600" /> New AP Transaction
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-6">
        {/* Toggle Switch */}
        <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl mb-6">
          <button
            type="button"
            disabled={!!editingLog}
            onClick={() => handleTabChange("credit")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${isBillTab ? "bg-white text-orange-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <ArrowDownRight size={16} /> Supplier Bill (Cr)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("debit")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${isPaymentTab ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <ArrowUpRight size={16} /> Payment Out (Dr)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div className="grid grid-cols-2 gap-5">
            <InputField label="Date" type="date" name="date" required value={formData.date} onChange={onChange} />
            {isBillTab && (
              <InputField label="Supplier Invoice No." name="invoiceNo" required placeholder="INV-123" value={formData.invoiceNo} onChange={onChange} />
            )}
          </div>

          {isBillTab && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField
                label="Logical Circuit ID (Optional)"
                name="logicalCircuitId"
                placeholder="e.g. LC-98765"
                value={formData.logicalCircuitId}
                onChange={onChange}
              />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Product Type
                  </label>
                  {isCustomProduct && (
                    <button type="button" onClick={() => { setIsCustomProduct(false); setFormData(p => ({ ...p, productType: "" })) }} className="text-[10px] font-bold text-purple-600 hover:underline hover:cursor-pointer">
                      Back to List
                    </button>
                  )}
                </div>
                {isCustomProduct ? (
                  <input
                    type="text"
                    name="productType"
                    value={formData.productType}
                    onChange={onChange}
                    placeholder="Type custom product..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <div className="relative">
                    <select
                      name="productType"
                      value={formData.productType}
                      onChange={(e) => {
                        if (e.target.value === "Custom") {
                          setIsCustomProduct(true);
                          setFormData(prev => ({ ...prev, productType: "" }));
                        } else {
                          onChange(e);
                        }
                      }}
                      className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
                    >
                      <option value="">Select Product Type...</option>
                      <option value="NLD">NLD</option>
                      <option value="Enterprise ILL">Enterprise ILL</option>
                      <option value="Custom">Others (Type manually)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                )}
              </div>
            </div>
          )}

          <InputField
            label="Description"
            name="description"
            required
            placeholder={isBillTab ? "e.g. Raw Material Purchase" : "e.g. Bank Transfer"}
            value={formData.description}
            onChange={onChange}
          />

          {isBillTab && (
            <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputField
                  label="Base Amount (₹)"
                  type="number"
                  name="baseAmount"
                  placeholder="0.00"
                  required
                  value={formData.baseAmount}
                  onChange={onChange}
                  className="font-bold text-slate-900 text-lg"
                />
                <InputField
                  label="Total Amount (Base + GST) (₹)"
                  type="number"
                  name="totalAmount"
                  placeholder={`${safeFormatCurrency(previewBase * 1.18)}`}
                  value={formData.totalAmount}
                  onChange={onChange}
                  className="font-bold text-slate-900 text-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      TDS Head
                    </label>
                    {isCustomTds && (
                      <button type="button" onClick={() => { setIsCustomTds(false); setFormData(p => ({ ...p, tdsHead: "" })) }} className="text-[10px] font-bold text-orange-600 hover:underline hover:cursor-pointer">
                        Back to List
                      </button>
                    )}
                  </div>
                  {isCustomTds ? (
                    <input
                      type="text"
                      name="tdsHead"
                      value={formData.tdsHead}
                      onChange={onChange}
                      placeholder="Type custom TDS Head..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <div className="relative">
                      <select
                        name="tdsHead"
                        value={formData.tdsHead}
                        onChange={(e) => {
                          if (e.target.value === "Custom") {
                            setIsCustomTds(true);
                            setFormData(prev => ({ ...prev, tdsHead: "" }));
                          } else {
                            onChange(e);
                          }
                        }}
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select TDS Head</option>
                        <option value="194J">194J</option>
                        <option value="194I">194I</option>
                        <option value="Custom">Others (Type manually)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  )}
                </div>

                <InputField
                  label="TDS Percentage (%)"
                  type="number"
                  name="tdsPercentage"
                  placeholder="e.g. 2, 10"
                  value={formData.tdsPercentage}
                  onChange={onChange}
                  max="100"
                />
              </div>

              {/* Live Calculation Summary */}
              {previewBase !== 0 && (
                <div className="mt-4 p-3 bg-white border border-orange-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total (Inc. GST)</p>
                      <p className="font-semibold text-slate-700">{safeFormatCurrency(previewTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        {previewBase < 0 ? "TDS Reversed (+)" : "TDS Ded. (-)"}
                      </p>
                      <p className={`font-semibold ${previewBase < 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {safeFormatCurrency(Math.abs(previewTdsAmount))}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black tracking-wider text-orange-400">Final Ledger Liability (Cr)</p>
                    <p className={`text-xl font-black ${previewPayable < 0 ? "text-emerald-600" : "text-orange-600"}`}>
                      {safeFormatCurrency(previewPayable)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isPaymentTab && (
            <>
              <InputField
                label="Payment Amount (Debit) ₹"
                type="number"
                name="debit"
                placeholder="0.00"
                required
                value={formData.debit}
                onChange={onChange}
                className="font-bold text-emerald-600 text-lg"
              />

              {/* Advance Toggle */}
              {availableAdvance > 0 && (
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-colors mt-2">
                  <input
                    type="checkbox"
                    name="isUsingAdvance"
                    checked={formData.isUsingAdvance}
                    onChange={onChange}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                      <Wallet size={14} /> Deduct from Vendor Advance
                    </span>
                    <span className="text-xs font-medium text-indigo-600">Available: {safeFormatCurrency(availableAdvance)}</span>
                  </div>
                </label>
              )}

              {/* Invoice Allocation List */}
              {unpaidBills.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <Receipt size={16} className="text-purple-600" /> Clear Supplier Bills
                    </h3>
                    <div className="text-xs font-bold text-slate-500">
                      Unallocated: <span className={unallocatedAmount > 0 ? "text-emerald-600" : ""}>{safeFormatCurrency(unallocatedAmount)}</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto customScroller pr-2">
                    {unpaidBills.map((bill) => {
                      const billId = bill._id || bill.id;
                      const allocatedObj = allocations.find((a) => a.billId === billId);
                      const isSelected = !!allocatedObj;
                      return (
                        <div key={billId} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isSelected ? "bg-white border-purple-300 shadow-sm" : "bg-transparent border-slate-200"}`}>
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleAllocationToggle(bill, e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                            />
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                Bill #{bill.invoiceNo || "N/A"} <span className="text-xs font-normal text-slate-500">({new Date(bill.date).toLocaleDateString()})</span>
                              </p>
                              <p className="text-xs font-medium text-orange-600">Owe: {safeFormatCurrency(bill.balanceDue)}</p>
                            </div>
                          </label>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">Pay: ₹</span>
                              <input
                                type="number"
                                value={allocatedObj.amountApplied || ""}
                                onChange={(e) => handleAllocationAmountChange(billId, e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                className="w-24 px-2 py-1 text-sm font-bold text-right border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                max={bill.balanceDue}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bank Details */}
              {showBankDetails && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1.5 uppercase tracking-wider">
                      <Landmark size={12} /> Bank / Mode
                    </label>
                    <div className="relative">
                      <select
                        name="bankName"
                        value={formData.bankName}
                        onChange={onChange}
                        required={isPaymentTab}
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select Bank</option>
                        {BANK_OPTIONS.map((bank) => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <InputField icon={Hash} label="UTR / Ref" name="utrReference" placeholder="Transfer ID" value={formData.utrReference} onChange={onChange} required={isPaymentTab} />
                </div>
              )}
            </>
          )}

          <InputField icon={FileText} label="Remarks (Internal)" name="remarks" placeholder="Optional notes..." value={formData.remarks} onChange={onChange} />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {editingLog && (
            <Button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancel Edit
            </Button>
          )}
          <Button type="submit" isLoading={isSubmitting} variant="primary" icon={Save} className="!bg-purple-600 hover:!bg-purple-700 w-full sm:w-auto">
            {editingLog ? "Update Record" : "Save Record"}
          </Button>
        </div>
      </form>

      {/* 🚨 UNALLOCATED ADVANCE WARNING MODAL */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Unallocated Funds Detected</h3>
              <p className="text-slate-500 text-sm mb-4">
                You made a payment of <strong>{safeFormatCurrency(paymentAmount)}</strong>, but only allocated <strong>{safeFormatCurrency(totalAllocated)}</strong> to specific bills.
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-6">
                <p className="text-amber-800 text-sm font-bold">
                  The remaining <span className="text-lg">{safeFormatCurrency(unallocatedAmount)}</span> will be sent to the vendor's Advance Wallet.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowAdvanceModal(false)}
                >
                  Go Back & Adjust
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full !bg-amber-500 hover:!bg-amber-600"
                  onClick={executeSubmit}
                  isLoading={isSubmitting}
                >
                  Yes, Save to Advance
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}