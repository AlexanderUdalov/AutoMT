const API_URL = 'http://localhost:5291/api';

export async function registerUser({ username, email, password }) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  if (!res.ok) {
    let message = 'Login error';

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
