/**
 * Enhanced fetch wrapper that relies on NextAuth session cookies.
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Prepare headers
  const headers = new Headers(options.headers)

  // Ensure Content-Type is set for POST/PUT requests
  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  }
  
  // Make the request with enhanced headers
  return fetch(url, {
    ...options,
    headers
  })
}

/**
 * Helper for common API patterns
 */
export const api = {
  get: (url: string, options?: RequestInit) => 
    authenticatedFetch(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options?: RequestInit) => 
    authenticatedFetch(url, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  put: (url: string, data?: any, options?: RequestInit) => 
    authenticatedFetch(url, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  patch: (url: string, data?: any, options?: RequestInit) =>
    authenticatedFetch(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }),
    
  delete: (url: string, options?: RequestInit) => 
    authenticatedFetch(url, { ...options, method: 'DELETE' })
}
