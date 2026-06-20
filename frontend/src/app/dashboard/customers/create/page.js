"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Building2,
  Receipt,
  MapPin,
  Briefcase,
  CheckCircle2,
  Search,
  Loader2,
  Link as LinkIcon,
  X,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

// Architecture & Components
import DashboardLayout from "@/app/common/layout/DashboardLayout";
import PageHeader from "@/app/common/components/PageHeader";
import InputField from "@/app/common/components/InputField";
import Button from "@/app/common/components/Button";

// Hook & Services
import { useCreateCustomer } from "@/app/modules/customers/hooks/useCreateCustomer";
import { userService } from "@/app/modules/users/user.service";
import { customerService } from "@/app/modules/customers/customer.service";
import toast from "react-hot-toast";
import { useAuth } from "@/app/common/context/AuthContext";

export default function CreateCustomerPage() {
  const router = useRouter();
  const { userRole } = useAuth();
  
  const [activeManagers, setActiveManagers] = useState([]);
  const { formData, currentUser, isSubmitting, handleChange, handleSubmit } = useCreateCustomer();

  // CRM Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // CRM Profile State (For Address Selection)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [crmAddresses, setCrmAddresses] = useState([]);
  const [linkedCrmName, setLinkedCrmName] = useState(null);

  // Fetch Managers
  const fetchManagers = async () => {
    try {
      const { data } = await userService.getEmployees();
      setActiveManagers(data?.data?.users || data?.users || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load manager directory.");
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Helper to inject data into your existing useCreateCustomer hook safely
  const injectIntoForm = (name, value) => {
    handleChange({ target: { name, value } });
  };

  // FLOW 1, STEP 1: Search the CRM (API Call)
  const performSearch = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    
    try {
      const response = await customerService.searchCRM(query);
      
      // Handle different response structures
      const results = response?.data?.data || response?.data || [];
      setSearchResults(Array.isArray(results) ? results : []);
      setSelectedIndex(-1);
      
    } catch (err) {
      console.error("CRM Search Failed", err);
      
      // Precise error handling based on error type
      if (err.response) {
        const status = err.response.status;
        switch (status) {
          case 502:
          case 503:
            toast.error("CRM service is temporarily unavailable. Please enter details manually.");
            break;
          case 401:
            toast.error("Session expired. Please refresh the page.");
            break;
          case 403:
            toast.error("You don't have permission to search the CRM.");
            break;
          case 429:
            toast.error("Too many search requests. Please wait a moment.");
            break;
          case 400:
            toast.error("Invalid search query. Please try different keywords.");
            break;
          default:
            toast.error(`Search failed (Error ${status}). Please try again.`);
        }
      } else if (err.request) {
        toast.error("Cannot connect to CRM. Please check your connection.");
      } else {
        toast.error("Search failed unexpectedly. Please enter details manually.");
      }
      
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search using useRef to avoid closure issues
  const debouncedSearch = (query) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  // Handle input change with debounce
  const handleSearchCRM = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedIndex(-1);
    debouncedSearch(query);
  };

  // 🎮 KEYBOARD NAVIGATION
  const handleSearchKeyDown = (e) => {
    if (!showDropdown || searchResults.length === 0) {
      // Allow Escape even when no results
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectCrmCustomer(searchResults[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
        
      default:
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // FLOW 1, STEP 2: Fetch Profile & Auto-fill Form
  const handleSelectCrmCustomer = async (crmItem) => {
    setShowDropdown(false);
    setSearchQuery('');
    setSelectedIndex(-1);
    setIsLoadingProfile(true);

    try {
      const response = await customerService.getCRMProfile(crmItem._id);
      const profile = response.data?.data;

      // Auto-fill existing form state
      injectIntoForm('companyName', profile.companyName);
      injectIntoForm('email', profile.email || '');
      injectIntoForm('crmId', profile.crmId); // Injects the link!
      
      const defaultAddress = profile.addresses?.[0];
      if (defaultAddress) {
        injectIntoForm('address', defaultAddress.fullAddress || '');
        injectIntoForm('gst', defaultAddress.gstNumber || '');
      }

      setCrmAddresses(profile.addresses || []);
      setLinkedCrmName(profile.companyName);
      
      toast.success(`Linked to ${profile.companyName}`);
    } catch (err) {
      toast.error("Failed to fetch CRM profile details.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Handle changing the selected address from the CRM dropdown
  const handleAddressChange = (e) => {
    const selectedIndex = e.target.value;
    const selectedAddress = crmAddresses[selectedIndex];
    
    if (selectedAddress) {
      injectIntoForm('address', selectedAddress.fullAddress || '');
      injectIntoForm('gst', selectedAddress.gstNumber || '');
    }
  };

  const removeCrmLink = () => {
    setLinkedCrmName(null);
    setCrmAddresses([]);
    injectIntoForm('crmId', ''); // Clear the CRM link
    toast.success("CRM link removed");
  };

  return (
    <DashboardLayout
      breadcrumbs={
        <>
          <span
            className="text-slate-500 cursor-pointer hover:text-slate-900"
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </span>
          <span className="text-slate-300 mx-2">/</span>
          <span className="text-slate-900 font-bold">Onboard Customer</span>
        </>
      }
    >
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <PageHeader
          title="Client Registration"
          subtitle="Create a new business profile and assign an account manager."
          icon={Building2}
          theme="green"
        />

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* HIDDEN INPUT: Ensures your hook captures the crmId on submit */}
          <input type="hidden" name="crmId" value={formData.crmId || ''} />

          {/* THE CRM SEARCH BAR SECTION */}
          <div className="p-1 bg-slate-50 border border-slate-200 rounded-2xl relative" ref={dropdownRef}>
            {linkedCrmName ? (
              // Success State: CRM is Linked
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Linked to CRM</p>
                    <p className="text-base font-bold text-slate-800">{linkedCrmName}</p>
                  </div>
                </div>
                <button type="button" onClick={removeCrmLink} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Unlink CRM">
                  <X size={20} />
                </button>
              </div>
            ) : (
              // Search State
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Central CRM to auto-fill details..."
                  value={searchQuery}
                  onChange={handleSearchCRM}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-12 pr-12 py-4 bg-white border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 shadow-sm"
                  role="combobox"
                  aria-expanded={showDropdown}
                  aria-controls="crm-search-results"
                  aria-activedescendant={selectedIndex >= 0 ? `crm-result-${selectedIndex}` : undefined}
                  autoComplete="off"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={20} />
                ) : searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowDropdown(false);
                      setSelectedIndex(-1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Search Results Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div 
                id="crm-search-results"
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden z-50"
              >
                {/* Keyboard shortcut hint */}
                <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-3 text-[10px] text-slate-400 select-none">
                  <span className="flex items-center gap-1">
                    <ArrowUp size={10} /><ArrowDown size={10} /> navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <CornerDownLeft size={10} /> select
                  </span>
                  <span>esc to close</span>
                </div>
                <div 
                  ref={resultsContainerRef}
                  className="max-h-60 overflow-y-auto customScroller py-1"
                >
                  {searchResults.map((item, index) => (
                    <div 
                      key={item._id}
                      onClick={() => handleSelectCrmCustomer(item)}
                      className={`px-5 py-4 border-b border-slate-50 cursor-pointer transition-all last:border-0 ${
                        index === selectedIndex 
                          ? 'bg-blue-50 border-l-2 border-l-blue-500 pl-4' 
                          : 'hover:bg-blue-50/50 border-l-2 border-l-transparent pl-4'
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><Briefcase size={12}/> {item.person}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{item.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results message */}
            {showDropdown && searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden z-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <AlertCircle size={16} className="text-amber-500" />
                  <span>No matching customers found in CRM</span>
                </div>
              </div>
            )}

            {/* Loading overlay when fetching full profile */}
            {isLoadingProfile && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-blue-600" size={24} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 my-2">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Details</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              className="sm:col-span-2"
              label="Registered Company Name"
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleChange}
              placeholder="e.g. Reliance Industries Ltd."
            />
            <InputField
              className="sm:col-span-2"
              label="Registered Company Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. abc@company.com"
            />

            <InputField
              icon={Receipt}
              label="GST Number"
              name="gst"
              maxLength={15}
              value={formData.gst}
              onChange={handleChange}
              placeholder="22AAAAA0000A1Z5"
              className="uppercase font-mono"
            />

            {/* DYNAMIC ACCOUNT MANAGER ASSIGNMENT */}
            {userRole === "admin" ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Briefcase size={14} /> Assign Manager
                </label>
                <div className="relative">
                  <select
                    required
                    name="manager"
                    value={formData.manager}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none font-medium text-slate-900"
                  >
                    <option value="" disabled>
                      Select from directory...
                    </option>
                    {activeManagers.map((manager) => (
                      <option key={manager._id} value={manager._id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Briefcase size={14} /> Account Manager
                </label>
                <div className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-700 flex items-center">
                  Assigning to your territory ({currentUser?.name || "Loading..."})
                </div>
              </div>
            )}

            {/* DYNAMIC ADDRESS SELECTION (Only shows if CRM has multiple addresses) */}
            {crmAddresses.length > 1 && (
              <div className="sm:col-span-2 bg-blue-50/50 border border-blue-100 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin size={14} /> Multiple CRM Locations Found
                </label>
                <div className="relative">
                  <select 
                    onChange={handleAddressChange}
                    className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer text-slate-800"
                  >
                    {crmAddresses.map((addr, idx) => (
                      <option key={idx} value={idx}>
                        {addr.label || `Location ${idx + 1}`} - {addr.gstNumber || 'No GST Attached'}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">▼</div>
                </div>
              </div>
            )}

            {/* ADDRESS TEXTAREA */}
            <div className="sm:col-span-2 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <MapPin size={14} /> Billing / Registered Address
              </label>
              <textarea
                required
                rows={3}
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none font-medium text-slate-900"
                placeholder="Enter complete building, street, city, and pincode..."
              />
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CheckCircle2 size={16} className="text-green-500" /> Ledger will
              be initialized at ₹ 0.00.
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full sm:w-auto px-8"
              icon={linkedCrmName ? LinkIcon : undefined}
            >
              {isSubmitting ? "Registering..." : (linkedCrmName ? "Save & Link CRM" : "Register Client")}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}