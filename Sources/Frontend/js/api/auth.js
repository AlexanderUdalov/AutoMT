import { SERVER_URL } from "./config.js";

const API_URL = `${SERVER_URL}/api/auth`;

export function getToken() {
  return localStorage.getItem('token');
}

export function createJsonHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

export async function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export function redirectToLogin() {
  localStorage.removeItem('token');
  window.location.href = './login.html';
};

export async function checkAuth() {
  if (!await isAuthenticated()) {
    redirectToLogin();
    throw new Error('Not authenticated')
  }
};

export async function registerUser({ username, email, password }) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  if (!res.ok) {
    let message = 'Ошибка регистрации';

    try {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (data?.message) {
        message = data.message;
      }
    } catch (e) {
    }

    throw new Error(message);
  }

  const data = await res.json();
  return data.token;
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    let message = 'Неверный логин/пароль';

    try {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (data?.message) {
        message = data.message;
      }
    } catch (e) {
    }

    throw new Error(message);
  }

  const data = await res.json();
  return data.token;
}
