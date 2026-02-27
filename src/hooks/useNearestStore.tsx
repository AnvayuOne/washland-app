"use client"

import { useEffect, useState } from 'react'

export type Store = {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  lat: number | null
  lon: number | null
  hours: {
    weekday: string
    saturday: string
    sunday: string
  }
  services: string[]
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // km
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function useNearestStore(maxDistanceKm = 8) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nearest, setNearest] = useState<{ store: Store; distanceKm: number } | null>(null)

  useEffect(() => {
    const fetchStoresAndFindNearest = async () => {
      try {
        // Fetch real stores from API
        const response = await fetch('/api/public/stores')
        if (!response.ok) throw new Error('Failed to fetch stores')

        const stores: Store[] = await response.json()

        // Check if geolocation is supported
        if (!('geolocation' in navigator)) {
          setError('Geolocation not supported')
          setLoading(false)
          return
        }

        const onSuccess = (pos: GeolocationPosition) => {
          const { latitude, longitude } = pos.coords
          let best: { store: Store; distanceKm: number } | null = null

          // Filter stores that have coordinates and find the nearest one
          for (const store of stores) {
            if (store.lat !== null && store.lon !== null) {
              const d = haversineKm(latitude, longitude, store.lat, store.lon)
              if (!best || d < best.distanceKm) {
                best = { store, distanceKm: d }
              }
            } else {
              // If store has no coordinates, we could geocode it here or ignore.
              // For this implementation, we rely on the API providing lat/lon (or mapped mocks)
            }
          }

          if (best && best.distanceKm <= maxDistanceKm) {
            setNearest(best)
          } else if (stores.length > 0) {
            // Fallback: Just show the first store if none are "near" to ensure UI isn't empty
            // Calculate distance to the first store just for display
            const firstStore = stores[0]
            if (firstStore.lat && firstStore.lon) {
              const dist = haversineKm(latitude, longitude, firstStore.lat, firstStore.lon)
              setNearest({ store: firstStore, distanceKm: dist })
            } else {
              // Absolute fallback
              setNearest({ store: firstStore, distanceKm: 0 })
            }
          }
          setLoading(false)
        }

        const onError = (err: GeolocationPositionError) => {
          console.warn('Geolocation error:', err.message)
          setError(err.message)

          // Fallback to first available store so UI doesn't break
          if (stores.length > 0) {
            setNearest({ store: stores[0], distanceKm: 0 })
          }
          setLoading(false)
        }

        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
          maximumAge: 1000 * 60 * 60, // 1 hour
          timeout: 5000
        })
      } catch (err: any) {
        console.error('Error fetching stores:', err)
        setError(err.message || 'Failed to fetch stores')
        setLoading(false)
      }
    }

    fetchStoresAndFindNearest()
  }, [maxDistanceKm])

  return { loading, error, nearest }
}
