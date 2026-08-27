import React, { useState, useEffect, useRef } from 'react';
import { Input } from '~/components/ui/Input';
import {
  INDIAN_STATES,
  normalizeIndianState,
  type LocationApiResponse,
} from '~/services/location/location.types';
import { Loader2, CheckCircle2, AlertCircle, MapPin, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export interface IndianAddressFieldsProps {
  initialPincode?: string;
  initialCity?: string;
  initialState?: string;
  onValidityChange?: (isValid: boolean) => void;
  onLocationChange?: (location: {
    pincode: string;
    city: string;
    state: string;
    isValid: boolean;
  }) => void;
}

export const IndianAddressFields: React.FC<IndianAddressFieldsProps> = ({
  initialPincode = '',
  initialCity = '',
  initialState = '',
  onValidityChange,
  onLocationChange,
}) => {
  const [pincode, setPincode] = useState(initialPincode);
  const [city, setCity] = useState(initialCity);
  const [selectedState, setSelectedState] = useState(() => {
    const matched = normalizeIndianState(initialState);
    return matched?.name || initialState || '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(() => {
    return Boolean(initialPincode && initialCity && initialState);
  });
  const [validationMsg, setValidationMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Sequence counter to discard out-of-order race condition responses
  const requestIdRef = useRef(0);

  // Notify parent on validity / location change
  useEffect(() => {
    onValidityChange?.(isValid);
    onLocationChange?.({
      pincode,
      city,
      state: selectedState,
      isValid,
    });
  }, [isValid, pincode, city, selectedState]);

  /**
   * PINCODE → CITY + STATE Lookup
   */
  const lookupByPincode = async (targetPin: string) => {
    if (!/^[1-9][0-9]{5}$/.test(targetPin)) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setValidationMsg({ type: 'info', text: 'Resolving City & State from Pincode...' });

    try {
      const res = await fetch(`/api/location?pincode=${targetPin}`);
      const data = (await res.json()) as LocationApiResponse;

      // Guard: Ignore response if user initiated a newer action
      if (currentRequestId !== requestIdRef.current) return;

      if (res.ok && data.success && data.type === 'pincode') {
        const resolvedCity = data.data.city;
        const resolvedState = data.data.state;

        setCity(resolvedCity);
        setSelectedState(resolvedState);
        setIsValid(true);
        setValidationMsg({
          type: 'success',
          text: `Verified: ${resolvedCity}, ${resolvedState}`,
        });
      } else {
        setIsValid(false);
        setValidationMsg({
          type: 'error',
          text: !data.success && data.error ? data.error : 'Pincode not found. Please verify your 6-digit PIN.',
        });
      }
    } catch {
      if (currentRequestId !== requestIdRef.current) return;
      setIsValid(false);
      setValidationMsg({
        type: 'error',
        text: 'Unable to reach location service. Please check network.',
      });
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  /**
   * Handle user typing in Pincode
   */
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(rawVal);
    setIsValid(false);

    if (rawVal.length === 6) {
      lookupByPincode(rawVal);
    } else {
      // Incomplete PIN
      setValidationMsg(null);
    }
  };

  /**
   * Handle manual City change
   */
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value);
  };

  /**
   * Handle manual State change
   */
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden inputs to guarantee validated values are submitted with parent HTML Form */}
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="province" value={selectedState} />
      <input type="hidden" name="zip" value={pincode} />

      {/* Synchronized Location Row: PIN → City & State */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
        {/* Pincode Input */}
        <Input
          label="PIN / Postal Code *"
          id="pincode-input"
          type="text"
          inputMode="numeric"
          pattern="[1-9][0-9]{5}"
          maxLength={6}
          required
          value={pincode}
          onChange={handlePincodeChange}
          placeholder="e.g. 400001"
          helperText="Enter 6-digit PIN to auto-fill City & State"
          startIcon={<MapPin className="w-4 h-4 text-[#686764]" />}
          endIcon={
            isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#c4622d]" />
            ) : isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : undefined
          }
        />

        {/* City Input (Auto-populated from Pincode) */}
        <Input
          label="City / District *"
          id="city-input"
          type="text"
          required
          value={city}
          onChange={handleCityChange}
          placeholder="e.g. Mumbai"
          helperText={isValid ? 'Auto-filled from Pincode' : undefined}
        />

        {/* State Dropdown (Auto-populated from Pincode) */}
        <div className="flex flex-col gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <label htmlFor="state-select" className="text-xs font-semibold text-[#060505] tracking-wide">
            State / Union Territory *
          </label>
          <div className="relative">
            <select
              id="state-select"
              value={selectedState}
              onChange={handleStateChange}
              required
              className={clsx(
                'w-full text-sm rounded-[6px] transition-colors border outline-none bg-[#faf8f5] text-[#2c2c2c] py-2.5 px-3 appearance-none cursor-pointer',
                'border-[#e8e4df] focus:border-[#c4622d] focus:ring-1 focus:ring-[#c4622d]',
              )}
            >
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((st) => (
                <option key={st.code} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#686764] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {isValid && <p className="text-xs text-[#686764]">Auto-filled from Pincode</p>}
        </div>
      </div>

      {/* Dynamic Status & Feedback Bar */}
      {validationMsg && (
        <div
          className={clsx(
            'flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-[6px] transition-all',
            validationMsg.type === 'success' && 'bg-emerald-50 text-emerald-800 border border-emerald-200',
            validationMsg.type === 'error' && 'bg-rose-50 text-rose-800 border border-rose-200',
            validationMsg.type === 'info' && 'bg-[#fffaf0] text-[#8b7355] border border-[#f3d9be]',
          )}
        >
          {validationMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
          {validationMsg.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
          {validationMsg.type === 'info' && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#c4622d]" />}
          <span>{validationMsg.text}</span>
        </div>
      )}
    </div>
  );
};
