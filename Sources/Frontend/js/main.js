import { createViews } from './views.js';

const root = document.getElementById('automt-app');
const app = document.getElementById('amt-live');
const fmt = n => new Intl.NumberFormat('ru-RU').format(n);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const state = { id: 'amt-live', cars: [], car: null, page: 'plan', carTab: 'maintenance',
  username: '', modal: null, expanded: null, parts: [], toast: '', busy: false };
let types = [];
let views = createViews(types);
let toastTimer;
let savedFocus;

function icons() { globalThis.lucide?.createIcons({ attrs: { width: 18, height: 18 } }); }
window.addEventListener('load', icons);
function current() { return state.cars.find(car => car.id === state.car) || state.cars[0]; }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('username'); location.assign('login.html'); }

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = {};
  if (authenticated) headers.Authorization = `Bearer ${localStorage.getItem('token') || ''}`;
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let response;
  try { response = await fetch(path, { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) }); }
  catch { throw new Error('Не удалось связаться с сервером. Попробуйте ещё раз.'); }
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    if (response.status === 401 && authenticated) { logout(); throw new Error('Сессия завершена. Войдите снова.'); }
    const messages = { 401: 'Неверное имя пользователя или пароль.', 403: 'Нет доступа к этим данным.',
      404: 'Данные не найдены. Обновите страницу.', 409: 'Это имя пользователя уже занято.' };
    throw new Error(data?.message || data?.error || (typeof data === 'string' && data.length < 200 ? data : '') || messages[response.status] || 'Не удалось сохранить изменения. Попробуйте ещё раз.');
  }
  return data;
}

function mapVehicle(vehicle) {
  const existing = state.cars.find(car => car.id === vehicle.id);
  return { ...vehicle, primary: vehicle.isDefault, image: vehicle.imageUrl,
    notes: existing?.notes || [], works: existing?.works || [], loaded: existing?.loaded || false };
}
function mapType(type, isSystem = false) {
  const name = type.name.toLowerCase();
  const icon = /масл|жидкост/.test(name) ? 'droplets' : /фильтр/.test(name) ? 'wind' : /свеч/.test(name) ? 'zap' : /тормоз/.test(name) ? 'disc-3' : 'wrench';
  return { id: String(type.id), name: type.name, icon, period: type.period, partTypes: type.parts || [], parts: (type.parts || []).map(part => part.name), isSystem };
}
async function loadVehicles() {
  state.cars = (await request('/api/vehicles')).map(mapVehicle);
  if (!state.cars.some(car => car.id === state.car)) state.car = state.cars[0]?.id ?? null;
}
async function loadDetails(car = current(), force = false) {
  if (!car || (car.loaded && !force)) return;
  const [records, notes, assigned] = await Promise.all([
    request(`/api/maintenance/${car.id}`), request(`/api/vehicles/${car.id}/notes`), request(`/api/maintenance/${car.id}/types`)
  ]);
  car.types = assigned.map(type => String(type.id));
  for (const type of assigned) if (!types.some(item => item.id === String(type.id))) types.push(mapType(type));
  car.works = records.filter(record => types.some(type => type.id === String(record.typeId))).map(record => ({
    recordId: record.id, type: String(record.typeId), last: record.mileage, skipped: record.isSkipped,
    parts: (record.parts || []).map(part => ({ ...part, type: types.flatMap(type => type.partTypes).find(type => type.id === part.typeId)?.name || 'Расходник' }))
  }));
  car.notes = notes;
  car.loaded = true;
  if (force && state.showHistory) car.history = await request(`/api/maintenance/${car.id}?fullHistory=true`);
}

function applyRoute() {
  const path = location.pathname.toLowerCase();
  const query = new URLSearchParams(location.search);
  state.page = path.endsWith('garage.html') ? 'garage' : path.endsWith('account.html') ? 'account' : 'plan';
  state.carTab = query.get('tab') === 'notes' ? 'notes' : 'maintenance';
  const id = Number(query.get('vehicleId'));
  if (state.cars.some(car => car.id === id)) state.car = id;
}
function writeRoute() {
  const path = state.page === 'garage' ? 'garage.html' : state.page === 'account' ? 'account.html' : 'index.html';
  const query = new URLSearchParams();
  if (state.page === 'plan' && state.car) query.set('vehicleId', state.car);
  if (state.page === 'plan' && state.carTab === 'notes') query.set('tab', 'notes');
  const target = path + (query.size ? `?${query}` : '');
  if (location.pathname.split('/').pop() + location.search !== target) history.pushState({}, '', target);
}

function render() {
  const focusedNote = document.activeElement?.dataset.noteCheck, focusedItem = document.activeElement?.dataset.item;
  const viewKey = `${state.page}:${state.car}:${state.carTab}`;
  const previous = state.viewKey === viewKey ? app.querySelector('.amt-content')?.scrollTop || 0 : 0;
  state.viewKey = viewKey;
  if (state.modal && !savedFocus) savedFocus = document.activeElement;
  app.innerHTML = `<div class="amt-shell"><aside class="amt-side">${views.brand()}${nav('amt-nav')}<div class="amt-sidefoot"><strong>Меньше забот о машине.</strong>Больше уверенности в пути.</div></aside><div class="amt-main"><header class="amt-topbar">${views.brand(true)}<span class="amt-breadcrumb">Мой гараж <span style="padding:0 7px">/</span> ${state.page === 'plan' ? 'Обслуживание' : state.page === 'garage' ? 'Автомобили' : 'Аккаунт'}</span><button class="amt-user" data-action="page" data-page="account"><span>${esc(state.username)}</span><span class="amt-avatar">${esc(state.username.slice(0, 1).toUpperCase())}</span></button></header><main class="amt-content">${state.page === 'plan' ? views.plan(state) : state.page === 'garage' ? views.garage(state) : views.account(state)}</main>${nav('amt-bottomnav')}</div></div>${state.modal ? views.dialog(state) : ''}${state.toast ? `<div class="amt-toast" role="status">${icon('circle-check')}${esc(state.toast)}</div>` : ''}<input type="file" data-photo accept="image/jpeg,image/png,image/webp,image/gif" hidden aria-label="Фотография автомобиля">`;
  if (state.modal?.kind === 'complete') renderParts();
  app.dataset.scrolled = previous > 70 ? 'true' : 'false';
  app.querySelector('.amt-content').scrollTop = previous;
  app.querySelector('.amt-shell').inert = Boolean(state.modal);
  icons();
  if (state.modal) requestAnimationFrame(() => app.querySelector('.amt-dialog input,.amt-dialog select,.amt-dialog button')?.focus({ preventScroll: true }));
  else if (savedFocus) {
    const action = savedFocus.dataset?.action;
    if (action) [...app.querySelectorAll(`[data-action="${action}"]`)].find(element => element.getClientRects().length)?.focus({ preventScroll: true });
    savedFocus = null;
  }
  if (focusedNote && !state.modal) app.querySelector(`[data-note-check="${focusedNote}"][data-item="${focusedItem}"]`)?.focus({ preventScroll: true });
}
function nav(className) {
  return `<nav class="${className}" aria-label="Основная навигация">${[['plan', 'wrench', 'Обслуживание'], ['garage', 'car-front', 'Гараж'], ['account', 'user-round', 'Аккаунт']].map(([id, name, label]) => `<button type="button" data-action="page" data-page="${id}" ${state.page === id ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span></button>`).join('')}</nav>`;
}
function toast(message) {
  clearTimeout(toastTimer); state.toast = message; render();
  toastTimer = setTimeout(() => { state.toast = ''; if (!state.modal) render(); }, 3200);
}
function showError(error, form) {
  if (form?.isConnected) {
    let element = form.querySelector('[data-error]');
    if (!element) { element = document.createElement('p'); element.className = 'amt-error'; element.dataset.error = ''; element.setAttribute('role', 'alert'); form.append(element); }
    element.textContent = error.message;
  } else toast(error.message);
}
async function perform(task, form) {
  if (state.busy) return;
  state.busy = true; root.setAttribute('aria-busy', 'true');
  const button = form?.querySelector('[data-action="submit"]');
  if (button) button.disabled = true;
  const error = form?.querySelector('[data-error]'); if (error) error.textContent = '';
  try { await task(); } catch (error) { showError(error, form); }
  finally { state.busy = false; root.removeAttribute('aria-busy'); if (button?.isConnected) button.disabled = false; }
}

function renderParts() {
  const wrap = app.querySelector('[data-parts]'); if (!wrap) return;
  const type = types.find(type => type.id === state.modal.type);
  wrap.innerHTML = state.parts.map((part, i) => `<div class="amt-partrow"><select class="amt-input" aria-label="Тип расходника ${i + 1}" data-part="${i}" data-key="type">${type.parts.filter(name => name === part.type || !state.parts.some(part => part.type === name)).map(name => `<option ${name === part.type ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select><input class="amt-input" aria-label="Бренд расходника ${i + 1}" placeholder="Бренд" value="${esc(part.brand)}" data-part="${i}" data-key="brand" required maxlength="120"><input class="amt-input" aria-label="Артикул расходника ${i + 1}" placeholder="Артикул" value="${esc(part.article)}" data-part="${i}" data-key="article" maxlength="120"><button type="button" class="amt-plain" data-action="removepart" data-index="${i}" aria-label="Удалить расходник">${icon('x')}</button></div>`).join('');
  app.querySelector('[data-action="addpart"]').disabled = state.parts.length >= type.parts.length;
  icons();
}
function noteFields() {
  const modal = state.modal, draft = modal.draft;
  return `${modal.noteKind === 'link' ? `<label class="amt-label" for="note-url">Ссылка</label><input class="amt-input" id="note-url" name="url" type="url" value="${esc(draft.url)}" required placeholder="https://…">` : ''}<label class="amt-label" for="note-body">${modal.noteKind === 'checklist' ? 'Пункты списка' : modal.noteKind === 'link' ? 'Описание' : 'Текст заметки'}</label><textarea class="amt-input amt-note-editor" id="note-body" name="notebody" maxlength="2000" ${modal.noteKind !== 'link' ? 'required' : ''}>${esc(draft.body)}</textarea>${modal.noteKind === 'checklist' ? '<p class="amt-formhelp">Каждая строка станет отдельным пунктом с галочкой.</p>' : ''}`;
}

app.addEventListener('scroll', event => {
  if (!event.target.matches('.amt-content')) return;
  if (event.target.scrollTop > 70) app.dataset.scrolled = 'true';
  else if (event.target.scrollTop < 20) app.dataset.scrolled = 'false';
}, true);

app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button || state.busy) return;
  const action = button.dataset.action, id = Number(button.dataset.car) || state.car;
  if (action === 'submit') {
    const form = button.closest('form'); if (form.reportValidity()) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return;
  }
  perform(async () => {
    if (action === 'logout') { logout(); return; }
    if (action === 'page') { state.page = button.dataset.page; state.modal = null; state.expanded = null; state.showHistory = false; if (state.page === 'plan') await loadDetails(); writeRoute(); }
    if (action === 'openplan' || action === 'opennotes') { state.car = id; state.page = 'plan'; state.carTab = action === 'opennotes' ? 'notes' : 'maintenance'; state.expanded = null; state.showHistory = false; await loadDetails(); writeRoute(); }
    if (action === 'cartab') { state.carTab = button.dataset.tab; state.expanded = null; writeRoute(); }
    if (action === 'history') {
      const car = current();
      if (!state.showHistory) car.history = await request(`/api/maintenance/${car.id}?fullHistory=true`);
      state.showHistory = !state.showHistory;
    }
    if (action === 'addtype') state.modal = { kind: action, car: current().id, typeSelection: '-1' };
    if (action === 'removetype' || action === 'skip') state.modal = { kind: action, car: current().id, type: button.dataset.type };
    if (action === 'expand') state.expanded = state.expanded === button.dataset.type ? null : button.dataset.type;
    if (action === 'close') state.modal = null;
    if (['mileage', 'addcar', 'editcar', 'deletecar', 'deleteaccount', 'password'].includes(action)) state.modal = { kind: action, car: id };
    if (action === 'addnote' || action === 'editnote') {
      const car = current(), note = car.notes.find(note => note.id === Number(button.dataset.note));
      state.modal = { kind: action, car: car.id, note: note?.id, noteKind: note?.kind || 'text', draft: { title: note?.title || '', body: note?.kind === 'checklist' ? note.items.map(item => item.text).join('\n') : note?.body || '', url: note?.url || '' } };
    }
    if (action === 'deletenote') state.modal = { kind: action, car: current().id, note: Number(button.dataset.note) };
    if (action === 'complete') {
      const car = current(); if (!car || !car.types?.length) { toast('Сначала добавьте работу в план обслуживания.'); return; }
      const first = [...car.works].sort((a, b) => (a.last + types.find(type => type.id === a.type).period) - (b.last + types.find(type => type.id === b.type).period))[0];
      state.modal = { kind: action, car: car.id, type: button.dataset.type || first?.type || car.types[0] }; state.parts = [];
    }
    if (action === 'primary') { await request(`/api/vehicles/${id}`, { method: 'PUT', body: { isDefault: true } }); await loadVehicles(); toast('Основной автомобиль изменён'); return; }
    if (action === 'copy') {
      const car = state.cars.find(car => car.id === id) || current();
      try { await navigator.clipboard.writeText(car.vin); toast('VIN скопирован'); } catch { toast('VIN: ' + car.vin); }
      return;
    }
    if (action === 'addpart') { const next = types.find(type => type.id === state.modal.type).parts.find(name => !state.parts.some(part => part.type === name)); if (next) state.parts.push({ type: next, brand: '', article: '' }); renderParts(); return; }
    if (action === 'removepart') { state.parts.splice(Number(button.dataset.index), 1); renderParts(); return; }
    if (action === 'photo') { state.photoCar = id; app.querySelector('[data-photo]').click(); return; }
    render();
  });
});

app.addEventListener('change', event => {
  const element = event.target;
  if (element.dataset.key) { state.parts[Number(element.dataset.part)][element.dataset.key] = element.value; if (element.dataset.key === 'type') renderParts(); return; }
  if (element.dataset.change === 'work') { state.modal.type = element.value; state.parts = []; renderParts(); return; }
  if (element.dataset.change === 'type-selection') { state.modal.typeSelection = element.value; const fields = app.querySelector('[data-custom-type]'); fields.hidden = element.value !== '-1'; fields.querySelectorAll('input').forEach(input => input.disabled = fields.hidden); return; }
  if (element.dataset.change === 'note-kind') {
    const form = element.closest('form'); state.modal.draft.body = form.querySelector('[name="notebody"]')?.value || '';
    state.modal.draft.url = form.querySelector('[name="url"]')?.value || state.modal.draft.url;
    state.modal.noteKind = element.value; app.querySelector('[data-notefields]').innerHTML = noteFields(); return;
  }
  if (element.dataset.initial) { app.querySelector(`[data-initial-fields="${element.dataset.initial}"] input`).disabled = !element.checked; return; }
  perform(async () => {
    if (element.dataset.change === 'car') { state.car = Number(element.value); state.expanded = null; state.showHistory = false; await loadDetails(); writeRoute(); render(); }
    if (element.dataset.noteCheck) {
      const car = current(), note = car.notes.find(note => note.id === Number(element.dataset.noteCheck));
      const items = note.items.map((item, i) => i === Number(element.dataset.item) ? { ...item, done: element.checked } : item);
      try { const saved = await request(`/api/vehicles/${car.id}/notes/${note.id}`, { method: 'PUT', body: { ...note, items } }); car.notes = car.notes.map(item => item.id === note.id ? saved : item); render(); }
      catch (error) { element.checked = !element.checked; throw error; }
    }
    if (element.matches('[data-photo]') && element.files[0]) {
      const file = element.files[0]; if (file.size > 10 * 1024 * 1024) throw new Error('Изображение должно быть меньше 10 МБ.');
      const body = new FormData(); body.append('image', file);
      await request(`/api/vehicles/upload/${state.photoCar}`, { method: 'POST', body }); await loadVehicles(); toast('Фотография обновлена');
    }
  });
});
app.addEventListener('input', event => { const element = event.target; if (element.dataset.key) state.parts[Number(element.dataset.part)][element.dataset.key] = element.value; });
app.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('input:not([type="checkbox"])')) {
    const form = event.target.closest('form'); if (form) { event.preventDefault(); if (form.reportValidity()) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
  }
  if (event.key === 'Escape' && state.modal && !state.busy) { state.modal = null; render(); }
  if (event.key === 'Tab' && state.modal) {
    const items = [...app.querySelectorAll('.amt-dialog button:not(:disabled),.amt-dialog input:not(:disabled),.amt-dialog textarea,.amt-dialog select,.amt-dialog summary')];
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
  }
});

app.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target;
  perform(async () => {
    const data = new FormData(form), kind = form.dataset.form;
    if (kind === 'login' || kind === 'register') {
      const username = String(data.get('username')).trim(), password = String(data.get('password'));
      if (kind === 'register' && password !== data.get('repeat')) throw new Error('Пароли не совпадают.');
      const result = await request(`/api/auth/${kind}`, { method: 'POST', authenticated: false, body: { username, password } });
      localStorage.setItem('token', result.token); localStorage.setItem('username', username); location.replace('index.html'); return;
    }
    if (kind === 'username') { const username = String(data.get('username')).trim(); await request('/api/auth/changeUsername', { method: 'POST', body: username }); state.username = username; localStorage.setItem('username', username); toast('Имя пользователя обновлено'); return; }
    const car = state.cars.find(car => car.id === state.modal?.car) || current(); let message = '';
    if (kind === 'addtype') {
      const id = Number(data.get('typeSelection'));
      await request(`/api/maintenance/${car.id}/types`, { method: 'POST', body: { id, name: String(data.get('typeName') || '').trim(), period: Number(data.get('typePeriod') || 0) } });
      await loadDetails(car, true); message = 'Работа добавлена в план';
    }
    if (kind === 'removetype') { await request(`/api/maintenance/${car.id}/types/${state.modal.type}`, { method: 'DELETE' }); await loadDetails(car, true); message = 'Работа удалена из плана. История сохранена'; }
    if (kind === 'skip') { await request(`/api/maintenance/${car.id}`, { method: 'POST', body: { typeId: Number(state.modal.type), mileage: car.mileage, isSkipped: true, parts: [] } }); await loadDetails(car, true); message = 'Выполнение пропущено. Следующий интервал начался'; }
    if (kind === 'addnote' || kind === 'editnote') {
      const noteKind = String(data.get('notekind')), body = String(data.get('notebody') || '').trim(), old = car.notes.find(note => note.id === state.modal.note);
      const note = { kind: noteKind, title: String(data.get('notetitle')).trim(), body, items: [] };
      if (noteKind === 'checklist') {
        note.items = body.split(/\r?\n/).map(text => text.trim()).filter(Boolean).map(text => ({ text, done: old?.kind === 'checklist' ? Boolean(old.items.find(item => item.text === text)?.done) : false }));
        note.body = ''; if (!note.items.length) throw new Error('Добавьте хотя бы один пункт.');
      }
      if (noteKind === 'link') { let url; try { url = new URL(String(data.get('url')).trim()); } catch {} if (!url || !['https:', 'http:'].includes(url.protocol)) throw new Error('Укажите ссылку, начинающуюся с https:// или http://.'); note.url = url.href; }
      const saved = await request(`/api/vehicles/${car.id}/notes${old ? '/' + old.id : ''}`, { method: old ? 'PUT' : 'POST', body: note });
      car.notes = old ? car.notes.map(note => note.id === old.id ? saved : note) : [...car.notes, saved]; state.carTab = 'notes'; state.page = 'plan'; message = old ? 'Заметка обновлена' : 'Заметка добавлена';
    }
    if (kind === 'deletenote') { await request(`/api/vehicles/${car.id}/notes/${state.modal.note}`, { method: 'DELETE' }); car.notes = car.notes.filter(note => note.id !== state.modal.note); message = 'Заметка удалена'; }
    if (kind === 'mileage') { const result = await request(`/api/vehicles/${car.id}`, { method: 'PUT', body: { mileage: Number(data.get('mileage')), disableNotify: data.has('disableNotify') } }); Object.assign(car, { mileage: result.mileage, lastMileageUpdate: result.lastMileageUpdate, disableNotify: result.disableNotify }); message = 'Пробег обновлён. План пересчитан'; }
    if (kind === 'complete') {
      const type = types.find(type => type.id === String(data.get('type'))), mileage = Number(data.get('mileage'));
      const previous = car.works.find(work => work.type === type.id)?.last || 0;
      if (mileage < previous) throw new Error('Пробег выполнения меньше пробега предыдущей записи.');
      const parts = state.parts.map(part => ({ typeId: type.partTypes.find(item => item.name === part.type).id, brand: part.brand, article: part.article }));
      await request(`/api/maintenance/${car.id}`, { method: 'POST', body: { typeId: Number(type.id), mileage, parts } });
      const vehicle = await request(`/api/vehicles/${car.id}`); car.mileage = vehicle.mileage; await loadDetails(car, true); state.expanded = type.id; message = 'ТО сохранено. Следующий интервал начался';
    }
    if (kind === 'addcar' || kind === 'editcar') {
      const body = { brand: String(data.get('brand')).trim(), model: String(data.get('model')).trim(), year: Number(data.get('year')), mileage: Number(data.get('mileage')), vin: String(data.get('vin')).trim().toUpperCase() };
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(body.vin)) throw new Error('VIN должен содержать 17 латинских букв и цифр, без I, O и Q.');
      if (kind === 'addcar') body.maintenanceHistory = types.filter(type => type.isSystem && data.has('include_' + type.id)).map(type => ({ typeId: Number(type.id), mileage: Number(data.get('last_' + type.id) || 0), parts: [] }));
      const saved = await request(`/api/vehicles${kind === 'editcar' ? '/' + car.id : ''}`, { method: kind === 'editcar' ? 'PUT' : 'POST', body });
      await loadVehicles(); state.car = saved.id; state.page = 'garage'; message = kind === 'editcar' ? 'Данные автомобиля обновлены' : 'Автомобиль добавлен';
    }
    if (kind === 'deletecar') { await request(`/api/vehicles/${car.id}`, { method: 'DELETE' }); await loadVehicles(); state.page = 'garage'; message = 'Автомобиль удалён'; }
    if (kind === 'password') {
      if (data.get('password') !== data.get('repeat')) throw new Error('Новые пароли не совпадают.');
      if (data.get('password') === data.get('current')) throw new Error('Новый пароль должен отличаться от текущего.');
      try { await request('/api/auth/checkCurrentPassword', { method: 'POST', body: String(data.get('current')) }); } catch { throw new Error('Неверный текущий пароль.'); }
      await request('/api/auth/changePassword', { method: 'POST', body: String(data.get('password')) }); message = 'Пароль изменён';
    }
    if (kind === 'deleteaccount') { await request('/api/auth/delete', { method: 'DELETE' }); localStorage.removeItem('token'); localStorage.removeItem('username'); location.replace('register.html'); return; }
    state.modal = null; writeRoute(); toast(message);
  }, form);
});

function renderAuth(mode) {
  const register = mode === 'register';
  app.innerHTML = `<main class="amt-auth"><section class="amt-authbox">${views.brand()}<h1>${register ? 'Создать аккаунт' : 'С возвращением'}</h1><p class="amt-sub">Ваш гараж и обслуживание — в одном месте.</p><form data-form="${mode}"><label class="amt-label" for="auth-name">Имя пользователя</label><input class="amt-input" id="auth-name" name="username" required maxlength="60" autocomplete="username"><label class="amt-label" for="auth-password">Пароль</label><input class="amt-input" id="auth-password" name="password" type="password" required ${register ? 'minlength="6"' : ''} autocomplete="${register ? 'new-password' : 'current-password'}">${register ? '<label class="amt-label" for="auth-repeat">Повторите пароль</label><input class="amt-input" id="auth-repeat" name="repeat" type="password" required minlength="6" autocomplete="new-password">' : ''}<p class="amt-error" data-error role="alert"></p><button class="amt-button amt-primary" type="button" data-action="submit">${register ? 'Создать аккаунт' : 'Войти'}</button></form><p class="amt-authlinks">${register ? 'Уже есть аккаунт? <a href="login.html">Войти</a>' : 'Нет аккаунта? <a href="register.html">Зарегистрироваться</a>'}</p></section></main>`;
  icons();
}

async function initialize() {
  const path = location.pathname.toLowerCase();
  if (path.endsWith('login.html') || path.endsWith('register.html')) { renderAuth(path.endsWith('register.html') ? 'register' : 'login'); return; }
  if (!localStorage.getItem('token')) { location.replace('login.html'); return; }
  app.innerHTML = '<div class="amt-loading" role="status">Загружаем ваш гараж…</div>';
  try {
    const [user, maintenanceTypes] = await Promise.all([request('/api/auth/me'), request('/api/maintenance/types')]);
    state.username = user.username; localStorage.setItem('username', user.username);
    types = maintenanceTypes.map(type => mapType(type, true));
    views = createViews(types); await loadVehicles(); applyRoute(); await loadDetails();
    const query = new URLSearchParams(location.search);
    if (path.endsWith('vehicleform.html')) { const id = Number(query.get('id')); state.modal = { kind: state.cars.some(car => car.id === id) ? 'editcar' : 'addcar', car: id }; }
    if (path.endsWith('maintenanceform.html') && current()) { const value = query.get('maintenanceId'); const type = current().works.find(work => String(work.recordId) === value)?.type || value; if (types.some(item => item.id === type)) state.modal = { kind: 'complete', car: current().id, type }; }
    const selected = current();
    if (!state.modal && state.page === 'plan' && state.carTab === 'maintenance' && selected && !selected.disableNotify && Date.now() - new Date(selected.lastMileageUpdate).getTime() >= 7 * 86400000)
      state.modal = { kind: 'mileage', car: selected.id, reminder: true };
    render();
  } catch (error) {
    app.innerHTML = `<main class="amt-auth"><section class="amt-authbox"><h1>Не удалось загрузить гараж</h1><p class="amt-error" role="alert">${esc(error.message)}</p><p class="amt-authlinks"><a href="index.html">Попробовать снова</a></p></section></main>`;
  }
}
window.addEventListener('popstate', () => perform(async () => { state.modal = null; applyRoute(); await loadDetails(); render(); }));
initialize();
