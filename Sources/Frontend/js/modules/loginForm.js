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
          password: this.password
        });

        localStorage.setItem('token', data);
        localStorage.setItem('username', this.username);
        window.location.href = 'index.html';
      } catch (e) {
        this.error = e.message;
      }
    }
  };
}