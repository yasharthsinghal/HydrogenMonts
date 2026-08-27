import {
  type LocationProvider,
  type NormalizedLocation,
  normalizeIndianState,
} from '../location.types';

/**
 * Concrete provider adapter for India Post API (api.postalpincode.in).
 * Handles external network communication, response parsing, and error normalization.
 */
export class PostalPincodeProvider implements LocationProvider {
  readonly name = 'postal_pincode';

  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options?: { baseUrl?: string; timeoutMs?: number }) {
    this.baseUrl = (
      options?.baseUrl ||
      process.env.LOCATION_API_BASE_URL ||
      'https://api.postalpincode.in'
    ).replace(/\/+$/, '');
    this.timeoutMs = options?.timeoutMs || Number(process.env.LOCATION_API_TIMEOUT_MS) || 5000;
  }

  /**
   * Helper to create a timed fetch with abort capability.
   */
  private async timedFetch(url: string, externalSignal?: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    // If caller provided an abort signal, connect it
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MONTS-Hydrogen/1.0',
        },
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Resolves an Indian pincode to City and State.
   */
  async getByPincode(
    pincode: string,
    signal?: AbortSignal,
  ): Promise<NormalizedLocation | null> {
    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      return null;
    }

    const url = `${this.baseUrl}/pincode/${cleanPin}`;

    try {
      const res = await this.timedFetch(url, signal);
      if (!res.ok) {
        console.warn(`[PostalPincodeProvider] HTTP ${res.status} for pincode: ${cleanPin}`);
        return null;
      }

      const json = await res.json();
      const firstResult = Array.isArray(json) ? json[0] : null;

      if (!firstResult || firstResult.Status !== 'Success' || !Array.isArray(firstResult.PostOffice)) {
        return null;
      }

      // Pick the primary post office record
      const primaryPo = firstResult.PostOffice[0];
      if (!primaryPo || !primaryPo.State) {
        return null;
      }

      const rawCity = primaryPo.District || primaryPo.Division || primaryPo.Block || primaryPo.Name;
      const rawState = primaryPo.State;
      const normalizedState = normalizeIndianState(rawState);

      return {
        pincode: cleanPin,
        city: rawCity,
        state: normalizedState?.name || rawState,
        stateCode: normalizedState?.code,
        district: primaryPo.District || undefined,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`[PostalPincodeProvider] Timeout resolving pincode ${cleanPin} after ${this.timeoutMs}ms`);
      } else {
        console.error(`[PostalPincodeProvider] Error resolving pincode ${cleanPin}:`, err?.message || err);
      }
      return null;
    }
  }
}

export const defaultPostalPincodeProvider = new PostalPincodeProvider();
