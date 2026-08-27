/**
 * Normalized Indian Location Domain Types & Provider Interface.
 * Provider-agnostic contract for MONTS storefront.
 */

export interface NormalizedLocation {
  pincode: string;
  city: string;
  state: string;
  stateCode?: string;
  district?: string;
}

export interface LocationProvider {
  readonly name: string;
  getByPincode(pincode: string, signal?: AbortSignal): Promise<NormalizedLocation | null>;
}

export type LocationErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT';

export type LocationApiResponse =
  | {
      success: true;
      type: 'pincode';
      data: NormalizedLocation;
    }
  | {
      success: false;
      error: string;
      code: LocationErrorCode;
    };

/**
 * Standard Indian States and Union Territories with ISO 3166-2:IN codes.
 */
export interface IndianState {
  name: string;
  code: string;
}

export const INDIAN_STATES: IndianState[] = [
  { name: 'Andaman and Nicobar Islands', code: 'AN' },
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chandigarh', code: 'CH' },
  { name: 'Chhattisgarh', code: 'CT' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH' },
  { name: 'Delhi', code: 'DL' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jammu and Kashmir', code: 'JK' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Ladakh', code: 'LA' },
  { name: 'Lakshadweep', code: 'LD' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OR' },
  { name: 'Puducherry', code: 'PY' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TG' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UT' },
  { name: 'West Bengal', code: 'WB' },
];

/**
 * Utility to find the normalized state and code by flexible name.
 */
export function normalizeIndianState(rawState: string): IndianState | null {
  if (!rawState) return null;
  const clean = rawState.trim().toLowerCase();

  return (
    INDIAN_STATES.find(
      (s) =>
        s.name.toLowerCase() === clean ||
        s.code.toLowerCase() === clean ||
        clean.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(clean),
    ) || null
  );
}
