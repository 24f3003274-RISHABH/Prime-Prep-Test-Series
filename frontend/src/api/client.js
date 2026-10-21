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

    // Mixed content protection: cannot call unencrypted http:// from https:// origin
    if (window.location.protocol === 'https:' && envUrl.startsWith('http:')) {
      return '/api';
    }

    // Remote client protection: if envUrl points to localhost/127.0.0.1 but current browser is NOT localhost
    if (
      (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) &&
      currentHost !== 'localhost' &&
      currentHost !== '127.0.0.1'
    ) {
      return '/api';
    }

    // If envUrl is configured to localhost:5000, BUT the browser is on port 3000
    if (envUrl.includes('localhost:5000') || envUrl.includes('127.0.0.1:5000')) {
      const isActualLocal5000 = (currentHost === 'localhost' || currentHost === '127.0.0.1') && currentPort === '5000';
      if (!isActualLocal5000) {
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
      // Safely handle HTML responses from proxies or misconfigured servers
      if (data.includes('<html') || data.includes('<!DOCTYPE') || data.includes('<body')) {
        const titleMatch = data.match(/<title>([^<]+)<\/title>/i);
        const h1Match = data.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const pageTitle = (h1Match ? h1Match[1] : (titleMatch ? titleMatch[1] : '')).trim();
        if (response.status === 403) {
          errorMessage = 'Access forbidden (HTTP 403). You do not have permission to view this resource.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication required (HTTP 401). Please sign in to continue.';
        } else if (pageTitle) {
          errorMessage = `${pageTitle} (HTTP ${response.status})`;
        } else {
          errorMessage = `Server error (HTTP ${response.status})`;
        }
      } else {
        errorMessage = data.trim();
      }
    }

    // Specific HTTP status classification
    if (response.status === 409) {
      errorCode = errorCode === 'API_ERROR' ? 'CONFLICT' : errorCode;
      errorMessage = errorMessage || 'A conflicting record already exists.';
    } else if (response.status === 400) {
      errorCode = errorCode === 'API_ERROR' ? 'VALIDATION_ERROR' : errorCode;
    } else if (response.status === 401) {
      errorCode = errorCode === 'API_ERROR' ? 'UNAUTHORIZED' : errorCode;
      if (!data || typeof data !== 'object') {
        errorMessage = 'Your session has expired or authentication is required. Please sign in again.';
      }
    } else if (response.status === 403) {
      errorCode = errorCode === 'API_ERROR' ? 'FORBIDDEN' : errorCode;
      if (!data || typeof data !== 'object') {
        errorMessage = 'Access denied (HTTP 403). You do not have permission to perform this action.';
      }
    } else if (response.status === 502 || response.status === 503) {
      errorCode = 'BACKEND_UNAVAILABLE';
      errorMessage = 'Backend service is temporarily unavailable. Please try again shortly.';
    } else if (response.status >= 500) {
      errorCode = errorCode === 'API_ERROR' ? 'DATABASE_OR_SERVER_ERROR' : errorCode;
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

// ==========================================
// Phase 5: Academic Hierarchy API Client
// ==========================================

// 1. Subjects
export async function getSubjects(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiFetch(`/subjects${query}`);
  return res.data || [];
}

export async function getSubject(id) {
  const res = await apiFetch(`/subjects/${id}`);
  return res.data;
}

export async function createSubject(payload) {
  const res = await apiFetch('/subjects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateSubject(id, payload) {
  const res = await apiFetch(`/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateSubjectStatus(id, status) {
  const res = await apiFetch(`/subjects/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function deleteSubject(id) {
  return apiFetch(`/subjects/${id}`, { method: 'DELETE' });
}

// 2. Chapters
export async function getChaptersBySubject(subjectId) {
  const res = await apiFetch(`/subjects/${subjectId}/chapters`);
  return res.data || [];
}

export async function getChapter(id) {
  const res = await apiFetch(`/chapters/${id}`);
  return res.data;
}

export async function createChapter(subjectId, payload) {
  const res = await apiFetch(`/subjects/${subjectId}/chapters`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateChapter(id, payload) {
  const res = await apiFetch(`/chapters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateChapterStatus(id, status) {
  const res = await apiFetch(`/chapters/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function deleteChapter(id) {
  return apiFetch(`/chapters/${id}`, { method: 'DELETE' });
}

// 3. Tests
export async function getTestsByChapter(chapterId, testType) {
  const query = testType ? `?testType=${encodeURIComponent(testType)}` : '';
  const res = await apiFetch(`/chapters/${chapterId}/tests${query}`);
  return res.data || [];
}

export async function getTest(id) {
  const res = await apiFetch(`/tests/${id}`);
  return res.data;
}

export async function createTest(chapterId, payload) {
  const res = await apiFetch(`/chapters/${chapterId}/tests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateTest(id, payload) {
  const res = await apiFetch(`/tests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateTestStatus(id, status) {
  const res = await apiFetch(`/tests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function deleteTest(id) {
  return apiFetch(`/tests/${id}`, { method: 'DELETE' });
}

// 4. Test Series Settings & Quotas
export async function getGlobalTestSeriesSettings() {
  const res = await apiFetch('/admin/test-series-settings');
  return res.data || [];
}

export async function updateGlobalTestSeriesSettings(settings) {
  const res = await apiFetch('/admin/test-series-settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
  return res.data;
}

export async function getChapterSettings(chapterId) {
  const res = await apiFetch(`/chapters/${chapterId}/settings`);
  return res.data;
}

export async function updateChapterSettings(chapterId, settings) {
  const res = await apiFetch(`/chapters/${chapterId}/settings`, {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
  return res.data;
}

export async function getDashboardStats() {
  const res = await apiFetch('/admin/stats');
  return res.data;
}

// 5. Bulk Question Upload & Management (Phase 6)
export async function previewQuestionImport(payload) {
  if (payload instanceof FormData) {
    const res = await apiFetch('/admin/questions/import/preview', {
      method: 'POST',
      body: payload,
    });
    return res.data;
  }
  const res = await apiFetch('/admin/questions/import/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function confirmQuestionImport(payload) {
  const res = await apiFetch('/admin/questions/import/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getTestQuestions(testId) {
  const res = await apiFetch(`/admin/tests/${testId}/questions`);
  return res.data;
}

// 6. Student Examination Portal & Attempt APIs (Phase 6)
export async function getStudentSubjects() {
  const res = await apiFetch('/student/subjects');
  return res.data || [];
}

export async function getStudentChapters(subjectId) {
  const res = await apiFetch(`/student/subjects/${subjectId}/chapters`);
  return res.data || [];
}

export async function getStudentTests(params = {}) {
  const search = new URLSearchParams();
  if (params.subjectId) search.append('subjectId', params.subjectId);
  if (params.chapterId) search.append('chapterId', params.chapterId);
  if (params.category && params.category !== 'ALL') search.append('category', params.category);

  const query = search.toString() ? `?${search.toString()}` : '';
  const res = await apiFetch(`/student/tests${query}`);
  return res.data || [];
}

export async function getStudentTestInstructions(testId) {
  const res = await apiFetch(`/student/tests/${testId}/instructions`);
  return res.data;
}

export async function startStudentTest(testId) {
  const res = await apiFetch(`/student/tests/${testId}/start`, {
    method: 'POST',
  });
  return res.data;
}

export async function getStudentAttempt(attemptId) {
  const res = await apiFetch(`/student/attempts/${attemptId}`);
  return res.data;
}

export async function saveStudentResponse(attemptId, questionId, payload) {
  const res = await apiFetch(`/student/attempts/${attemptId}/responses/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function submitStudentAttempt(attemptId) {
  const res = await apiFetch(`/student/attempts/${attemptId}/submit`, {
    method: 'POST',
  });
  return res.data;
}

export async function getStudentAttemptResult(attemptId) {
  const res = await apiFetch(`/student/attempts/${attemptId}/result`);
  return res.data;
}

export async function getStudentAttemptsList() {
  const res = await apiFetch('/student/attempts');
  return res.data || [];
}

// 7. Public Catalogue & Homepage APIs
export async function getPublicStats() {
  const res = await apiFetch('/public/stats');
  return res.data;
}

export async function getPublicSubjects() {
  const res = await apiFetch('/public/subjects');
  return res.data || [];
}

export async function getPublicChapters(subjectId) {
  const res = await apiFetch(`/public/subjects/${subjectId}/chapters`);
  return res.data || [];
}

export async function getPublicTests(params = {}) {
  const search = new URLSearchParams();
  if (params.subjectId) search.append('subjectId', params.subjectId);
  if (params.chapterId) search.append('chapterId', params.chapterId);
  if (params.category && params.category !== 'ALL') search.append('category', params.category);
  if (params.accessType && params.accessType !== 'ALL') search.append('accessType', params.accessType);
  if (params.search && params.search.trim()) search.append('search', params.search.trim());
  if (params.page) search.append('page', params.page);
  if (params.limit) search.append('limit', params.limit);

  const query = search.toString() ? `?${search.toString()}` : '';
  const res = await apiFetch(`/public/tests${query}`);
  return {
    tests: res.data || [],
    pagination: res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getPublicTestDetails(testId) {
  const res = await apiFetch(`/public/tests/${testId}`);
  return res.data;
}

export async function getFeaturedFreeTest() {
  const res = await apiFetch('/public/tests/featured-free');
  return res.data;
}


