import { checkAuth } from './api/auth.js';
import { garage } from './modules/garage.js';
import { index } from './modules/index.js';
import { account } from './modules/account.js';
import { vehicleForm } from './modules/vehicleForm.js';
import { registerForm } from './modules/registerForm.js';
import { loginForm } from './modules/loginForm.js';
import { maintenanceForm } from './modules/maintenanceForm.js';

function needsAuth() {
  const currentPath = window.location.pathname.toLowerCase();
  return !currentPath.includes('/login.') && !currentPath.includes('/register.');
}

document.addEventListener('alpine:init', () => {
  Alpine.data('registerForm', registerForm);
  Alpine.data('loginForm', loginForm);
  Alpine.data('vehicleForm', vehicleForm);
  Alpine.data('garage', garage);
  Alpine.data('index', index);
  Alpine.data('account', account);
  Alpine.data('maintenanceForm', maintenanceForm);

  if (needsAuth()) {
    checkAuth();
  }
});