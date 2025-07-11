import { registerUser } from '../api/auth.js';

export function registerForm() {
    return {
        username: '',
        password: '',
        error: '',
        async register() {
            try {
                const data = await registerUser({
                    username: this.username,
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
