const API_URL = '/api';

export async function registerUser({ username, email, password }) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.message || 'Registration error');
  }

  return await res.json();
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.message || 'Login error');
  }

  return await res.json();
}
