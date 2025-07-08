import { loginUser } from '../api/auth.js';

export function loginForm() {
  return {
    username: '',
    password: '',
    error: '',
    async login() {
      try {
        const data = await loginUser({
          username: this.username,
          email: this.email,
          password: this.password
        });

        localStorage.setItem('token', data);
        window.location.href = 'index.html';
      } catch (e) {
        this.error = e.message;
      }
    }
  };
}