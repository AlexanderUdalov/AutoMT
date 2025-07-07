import { loginUser } from '../api/auth.js';

export function loginForm() {
  return {
    username: '',
    password: '',
    error: '',
    async login() {
      try {
        await loginUser({
          username: this.username,
          password: this.password
        });

        const data = await res.json();
        localStorage.setItem('token', data.token);
        window.location.href = 'index.html';
      } catch (e) {
        this.error = e.message;
      }
    }
  }
}
