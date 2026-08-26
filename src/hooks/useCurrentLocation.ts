'use client'

import { useState } from 'react'

export interface LocationData {
  address: string
  city: string
  state: string
  pincode: string
  landmark?: string
}

interface UseCurrentLocationReturn {
  fetchLocation: () => Promise<LocationData | null>
  loading: boolean
  error: string | null
}

/**
 * Hook that reads the device GPS and reverse-geocodes it via the free
 * OpenStreetMap Nominatim API (no API key required).
 *
 * Returns: address, city, state, pincode  — ready to fill address form fields.
 */
export function useCurrentLocation(): UseCurrentLocationReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLocation = async (): Promise<LocationData | null> => {
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return null
    }

    setLoading(true)

    try {
      // 1. Get GPS coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )

      const { latitude, longitude } = position.coords

      // 2. Reverse geocode via OpenStreetMap Nominatim (free, no key)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: {
            // Nominatim policy requires a descriptive User-Agent
            'Accept-Language': 'en',
          },
        }
      )

      if (!res.ok) {
        throw new Error('Failed to fetch location details from OpenStreetMap.')
      }

      const data = await res.json()
      const a = data.address ?? {}

      /*
       * Nominatim returns different keys depending on zoom level / country.
       * We try them in priority order so we always get the best match.
       */
      const streetParts = [
        a.house_number,
        a.road || a.pedestrian || a.footway || a.path,
        a.suburb || a.neighbourhood || a.quarter,
      ]
        .filter(Boolean)
        .join(', ')

      const city =
        a.city ||
        a.town ||
        a.village ||
        a.county ||
        a.district ||
        a.state_district ||
        ''

      const state = a.state || ''
      const pincode = a.postcode || ''
      const landmark = a.amenity || a.tourism || a.leisure || ''

      return {
        address: streetParts || data.display_name?.split(',')[0] || '',
        city,
        state,
        pincode,
        landmark: landmark || undefined,
      }
    } catch (err: unknown) {
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location access denied. Please allow location permission in your browser.')
        } else if (err.code === err.TIMEOUT) {
          setError('Location request timed out. Please try again.')
        } else {
          setError('Unable to get your location. Please enter address manually.')
        }
      } else {
        setError(err instanceof Error ? err.message : 'Location fetch failed.')
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  return { fetchLocation, loading, error }
}
