import { garage } from './modules/garage.js';
import { maintenance } from './modules/maintenance.js';
import { vehicleForm } from './modules/vehicleForm.js';
import { registerForm } from './modules/registerForm.js';
import { loginForm } from './modules/loginForm.js';

document.addEventListener('alpine:init', () => {
  Alpine.data('vehicleForm', vehicleForm);
  Alpine.data('garage', garage);
  Alpine.data('registerForm', registerForm);
  Alpine.data('loginForm', loginForm);
  Alpine.data('maintenance', maintenance);
});