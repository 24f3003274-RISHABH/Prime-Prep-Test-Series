/**
 * Centralized API client for PrimePrep.
 * Uses native Fetch API.
 * Dynamically resolves API Base URL to avoid local port mismatch and mixed-content errors.
 */

const TOKEN_STORAGE_KEY = 'primeprep_auth_token';

/**
 * Intelligent API base URL resolver.
 * Ensures the browser never calls an unreachable localhost:5000 when running on Cloud Run,
 * Vercel, or the unified port 3000 dev server.
 */
export function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;

    // If envUrl is configured to localhost:5000, BUT the browser is on Cloud Run, Vercel, or port 3000:
    // Calling localhost:5000 from the browser results in "NetworkError when attempting to fetch resource".
    if (envUrl.includes('localhost:5000') || envUrl.includes('127.0.0.1:5000')) {
      const isActualLocal5000 = (currentHost === 'localhost' || currentHost === '127.0.0.1') && currentPort === '5000';
      if (!isActualLocal5000) {
        // Use relative '/api' on the current origin
        return '/api';
      }
    }

    // Default to relative '/api' if not configured or empty
    if (!envUrl) {
      return '/api';
    }

    // If configured as relative path, ensure it starts with /
    if (envUrl.startsWith('/')) {
      return envUrl;
    }

    // If a valid production HTTPS URL is configured (e.g., on Render), use it
    return envUrl;
  }

  return envUrl || '/api';
}

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save auth token to localStorage:', err);
  }
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove auth token from localStorage:', err);
  }
};

/**
 * Standard fetch wrapper with JSON serialization, JWT injection, and categorized error handling.
 * @param {string} endpoint - API path (e.g. '/health' or '/auth/login')
 * @param {RequestInit} [options] - Fetch configuration options
 * @returns {Promise<any>}
 */
export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const url = `${baseUrl}/${cleanEndpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  // If body is FormData, delete Content-Type so browser sets boundary automatically
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    console.error(`[Network / Fetch Failure] Could not connect to: ${url}`, networkError);

    const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:');
    let message = 'Unable to connect to PrimePrep backend. Please check your network connection.';
    
    if (isMixedContent) {
      message = 'Cannot call unencrypted HTTP backend from HTTPS origin (Browser Mixed-Content Block). Using relative /api endpoint is required.';
    } else if (networkError.message?.includes('NetworkError') || networkError.message?.includes('Failed to fetch')) {
      message = 'Cannot reach backend server. Please verify the backend is running and reachable.';
    }

    const err = new Error(message);
    err.code = 'NETWORK_UNAVAILABLE';
    err.isNetwork = true;
    err.originalError = networkError;
    throw err;
  }

  // Parse response body safely
  const contentType = response.headers.get('content-type');
  let data = null;

  try {
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  } catch (parseError) {
    data = null;
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode = 'API_ERROR';

    if (data && typeof data === 'object') {
      errorMessage = data?.error?.message || data?.message || errorMessage;
      errorCode = data?.error?.code || data?.code || errorCode;
    } else if (typeof data === 'string' && data.trim()) {
      errorMessage = data.trim();
    }

    // Specific HTTP status classification
    if (response.status === 409) {
      errorCode = 'EMAIL_ALREADY_EXISTS';
      errorMessage = errorMessage || 'An account with this email already exists.';
    } else if (response.status === 400) {
      errorCode = errorCode || 'VALIDATION_ERROR';
    } else if (response.status === 401) {
      errorCode = errorCode || 'UNAUTHORIZED';
    } else if (response.status === 403) {
      errorCode = errorCode || 'FORBIDDEN';
    } else if (response.status === 502 || response.status === 503) {
      errorCode = 'BACKEND_UNAVAILABLE';
      errorMessage = 'Backend service is temporarily unavailable. Please try again shortly.';
    } else if (response.status >= 500) {
      errorCode = 'DATABASE_OR_SERVER_ERROR';
      errorMessage = errorMessage || 'A database or internal server error occurred.';
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = errorCode;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Health check query
 */
export async function getHealthStatus() {
  return apiFetch('/health');
}

/**
 * Register student account
 */
export async function registerStudent(payload) {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res;
}

/**
 * Authenticate student or administrator
 */
export async function loginUser(payload) {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res;
}

/**
 * Bootstrap initial administrator account
 */
export async function setupInitialAdmin(payload) {
  const res = await apiFetch('/auth/setup-admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res;
}

/**
 * Get current authenticated user session
 */
export async function getCurrentUser() {
  return apiFetch('/auth/me');
}

/**
 * Logout
 */
export async function logoutUser() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    removeAuthToken();
  }
}

/**
 * Check admin authorization
 */
export async function checkAdminPrivileges() {
  return apiFetch('/auth/admin-check');
}
