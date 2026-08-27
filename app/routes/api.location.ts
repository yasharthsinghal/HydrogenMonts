import { type LoaderFunctionArgs } from 'react-router';
import { locationService } from '~/services/location/location.server';
import { type LocationApiResponse } from '~/services/location/location.types';

/**
 * Internal MONTS Location API.
 * 
 * Supports:
 * - GET /api/location?pincode=400001
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const pincodeParam = url.searchParams.get('pincode')?.trim();

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, max-age=300', // 5 minutes cache
  };

  if (!pincodeParam) {
    const responseBody: LocationApiResponse = {
      success: false,
      error: 'Please provide a 6-digit "pincode" query parameter.',
      code: 'INVALID_INPUT',
    };
    return new Response(JSON.stringify(responseBody), { status: 400, headers });
  }

  if (!/^[1-9][0-9]{5}$/.test(pincodeParam)) {
    const responseBody: LocationApiResponse = {
      success: false,
      error: 'Invalid Indian pincode format. Pincode must be exactly 6 digits starting with 1-9.',
      code: 'INVALID_INPUT',
    };
    return new Response(JSON.stringify(responseBody), { status: 400, headers });
  }

  try {
    const location = await locationService.lookupByPincode(pincodeParam);
    if (!location) {
      const responseBody: LocationApiResponse = {
        success: false,
        error: `No location details found for pincode "${pincodeParam}". Please verify your pincode.`,
        code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(responseBody), { status: 404, headers });
    }

    const responseBody: LocationApiResponse = {
      success: true,
      type: 'pincode',
      data: location,
    };
    return new Response(JSON.stringify(responseBody), { status: 200, headers });
  } catch (err: any) {
    console.error('[API /api/location] Pincode lookup error:', err?.message || err);
    const responseBody: LocationApiResponse = {
      success: false,
      error: 'Location service is temporarily unavailable. Please enter details manually.',
      code: 'PROVIDER_ERROR',
    };
    return new Response(JSON.stringify(responseBody), { status: 502, headers });
  }
}
