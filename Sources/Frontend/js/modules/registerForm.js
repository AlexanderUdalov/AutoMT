import { registerUser } from '../api/auth.js';

export function registerForm() {
    return {
        username: '',
        email: '',
        password: '',
        error: '',
        async register() {
            try {
                await registerUser({
                    username: this.username,
                    email: this.email,
                    password: this.password
                });

                const data = await res.json();
                localStorage.setItem('token', data.token);
                window.location.href = 'index.html';
            } catch (e) {
                this.error = e.message;
            }
        }
    };
}
