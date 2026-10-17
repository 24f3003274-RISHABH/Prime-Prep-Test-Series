/**
 * Input validation for authentication requests.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegisterInput = (data = {}) => {
  const errors = [];
  const { fullName, email, password } = data;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters.');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      fullName: fullName ? fullName.trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      password: password || '',
    },
  };
};

export const validateLoginInput = (data = {}) => {
  const errors = [];
  const { email, password } = data;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      email: email ? email.trim().toLowerCase() : '',
      password: password || '',
    },
  };
};

export const validateAdminSetupInput = (data = {}) => {
  const errors = [];
  const { setupSecret, fullName, email, password } = data;

  if (!setupSecret || typeof setupSecret !== 'string') {
    errors.push('Setup secret is required.');
  }

  const registerValidation = validateRegisterInput({ fullName, email, password });
  if (!registerValidation.isValid) {
    errors.push(...registerValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      setupSecret: setupSecret ? setupSecret.trim() : '',
      ...registerValidation.sanitized,
    },
  };
};
