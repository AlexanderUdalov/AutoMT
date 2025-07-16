import { redirectToLogin, redirectToRegistration, changeUsername, changePassword, checkCurrentPassword, deleteUser } from "../api/auth.js";

export function account() {
    return {
        openModal: false,
        username: '',

        init() {
            this.username = localStorage.getItem('username');
        },

        changeUsernameForm() {
            return {
                usernameInput: '',
                error: '',
                changed: false,

                async submit() {
                    this.error = '';

                    if (this.changed)
                        return;

                    try {
                        const res = await changeUsername(this.usernameInput);

                        if (res.ok) {
                            this.changed = true;
                            this.username = this.usernameInput;

                            localStorage.setItem('username', this.usernameInput);
                            setTimeout(() => { this.changed = false; }, 2000);
                            return;
                        }

                        if (res.status === 409) {
                            this.error = 'Это имя пользователя уже занято.';
                        } else {
                            const data = await res.json().catch(() => null);
                            this.error = data?.error || 'Произошла ошибка. Попробуйте снова.';
                        }

                    } catch (e) {
                        this.error = 'Ошибка соединения с сервером.';
                    }
                }
            }
        },

        changePasswordForm() {
            return {
                currentPassword: '',
                newPassword: '',
                retypePassword: '',
                error: '',
                retypeError: '',
                currentError: '',
                changed: false,

                async submit() {
                    this.error = '';
                    this.retypeError = '';
                    this.currentError = '';

                    if (this.changed)
                        return;

                    try {
                        if (this.newPassword != this.retypePassword) {
                            this.retypeError = 'Пароли не совпадают.';
                            return;
                        }

                        if (this.newPassword == this.currentPassword) {
                            this.currentError = 'Пароли совпадают.';
                            return;
                        }
                        const checkResult = await checkCurrentPassword(this.currentPassword);
                        if (!checkResult.ok) {
                            this.currentError = 'Неверный пароль.';
                            return;
                        }

                        const res = await changePassword(this.newPassword);
                        if (res.ok) {
                            this.changed = true;
                            setTimeout(() => { this.changed = false; }, 2000);
                            this.currentPassword = '';
                            this.newPassword = '';
                            this.retypePassword = '';
                            return;
                        }
                        this.error = 'Произошла ошибка. Попробуйте снова.';

                    } catch (e) {
                        this.error = 'Ошибка соединения с сервером.';
                    }
                }
            }
        },

        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            redirectToLogin();
        },

        async deleteAccount() {
            const res = await deleteUser();
            if (res.ok) {
                redirectToRegistration();
            }
        }
    };
}