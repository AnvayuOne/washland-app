/**
 * Enhanced fetch wrapper that automatically includes authentication headers
 * for localStorage-based authentication
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Get user auth from localStorage
  const userEmail = localStorage.getItem('userEmail')
  const userRole = localStorage.getItem('userRole')
  
  // Prepare headers
  const headers = new Headers(options.headers)
  
  // Add auth headers if available
  if (userEmail) {
    headers.set('x-user-email', userEmail)
  }
  if (userRole) {
    headers.set('x-user-role', userRole)
  }
  
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
