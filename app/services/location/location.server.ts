import {
  type LocationProvider,
  type NormalizedLocation,
  normalizeIndianState,
} from './location.types';
import { PostalPincodeProvider, defaultPostalPincodeProvider } from './providers/postalPincode.server';

/**
 * High-performance, provider-independent Location Service.
 * Features in-memory caching, provider delegation, and server-side consistency validation.
 */
export class LocationService {
  private provider: LocationProvider;

  // Simple in-memory LRU-like cache to avoid redundant external network roundtrips
  private pincodeCache = new Map<string, { data: NormalizedLocation | null; expiresAt: number }>();

  private readonly cacheTtlMs = 1000 * 60 * 60 * 24; // 24 hours TTL
  private readonly maxCacheEntries = 1000;

  constructor(provider?: LocationProvider) {
    this.provider = provider || this.resolveConfiguredProvider();
  }

  /**
   * Dynamically resolves the provider based on environment configuration.
   */
  private resolveConfiguredProvider(): LocationProvider {
    const providerName = process.env.LOCATION_PROVIDER || 'postal_pincode';
    switch (providerName.toLowerCase()) {
      case 'postal_pincode':
      default:
        return defaultPostalPincodeProvider;
    }
  }

  /**
   * Sets or swaps the active provider implementation at runtime.
   */
  setProvider(provider: LocationProvider) {
    this.provider = provider;
    this.clearCache();
  }

  /**
   * Clears internal cache entries.
   */
  clearCache() {
    this.pincodeCache.clear();
  }

  /**
   * Resolves an Indian pincode to City and State with caching.
   */
  async lookupByPincode(pincode: string): Promise<NormalizedLocation | null> {
    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      return null;
    }

    const cached = this.pincodeCache.get(cleanPin);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    let result: NormalizedLocation | null = null;
    try {
      result = await this.provider.getByPincode(cleanPin);
    } catch (err: any) {
      console.warn(`[LocationService] Provider lookup error for PIN ${cleanPin}:`, err?.message || err);
      return null;
    }

    // Save to cache
    if (this.pincodeCache.size >= this.maxCacheEntries) {
      const oldestKey = this.pincodeCache.keys().next().value;
      if (oldestKey) this.pincodeCache.delete(oldestKey);
    }
    this.pincodeCache.set(cleanPin, {
      data: result,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  /**
   * Server-side consistency validation.
   * Ensures the submitted Pincode, City, and State match and belong together before persisting.
   */
  async validateConsistency(
    pincode: string,
    city: string,
    state: string,
  ): Promise<boolean> {
    const cleanPin = (pincode || '').trim();
    const cleanCity = (city || '').trim().toLowerCase();
    const cleanState = (state || '').trim().toLowerCase();

    if (!cleanPin || !cleanCity || !cleanState) {
      return false;
    }

    const location = await this.lookupByPincode(cleanPin);
    if (!location) {
      return false;
    }

    // 1. Verify State
    const locState = (location.state || '').toLowerCase();
    const normalizedInputState = normalizeIndianState(cleanState);
    const normalizedLocState = normalizeIndianState(locState);

    const stateMatches =
      locState === cleanState ||
      (normalizedInputState && normalizedLocState && normalizedInputState.code === normalizedLocState.code);

    if (!stateMatches) {
      console.warn(`[LocationService] Consistency failure: State mismatch (${cleanState} vs ${locState}) for pin ${cleanPin}`);
      return false;
    }

    // 2. Verify City / District
    const locCity = (location.city || '').toLowerCase();
    const locDistrict = (location.district || '').toLowerCase();

    const cityMatches =
      cleanCity === locCity ||
      cleanCity === locDistrict ||
      locCity.includes(cleanCity) ||
      cleanCity.includes(locCity) ||
      (locDistrict && (locDistrict.includes(cleanCity) || cleanCity.includes(locDistrict)));

    if (!cityMatches) {
      console.warn(`[LocationService] Consistency failure: City mismatch (${cleanCity} vs ${locCity}/${locDistrict}) for pin ${cleanPin}`);
      return false;
    }

    return true;
  }
}

export const locationService = new LocationService();
