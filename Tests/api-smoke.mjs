// Start AutoMT with a disposable database before running this test.
// node --test Tests/api-smoke.mjs (AUTOMT_TEST_URL defaults to localhost:5297)
import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.AUTOMT_TEST_URL || 'http://127.0.0.1:5297';
async function api(path, token, method = 'GET', body, expected = 200) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

test('garage, notes isolation, parts, history, skipping and custom regulations persist', async () => {
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const owner = await api('/api/auth/register', null, 'POST', { username: 'qa_owner_' + nonce, password: 'TestPassword!2' });
  const other = await api('/api/auth/register', null, 'POST', { username: 'qa_other_' + nonce, password: 'TestPassword!2' });
  try {
    assert.equal((await api('/api/auth/me', owner.token)).username, 'qa_owner_' + nonce);
    const types = await api('/api/maintenance/types', owner.token);
    const oil = types.find(type => type.parts.length > 0);
    assert.ok(oil);
    const vehicle = await api('/api/vehicles', owner.token, 'POST', {
      brand: 'Toyota', model: 'RAV4', year: 2020, vin: 'JTMB43FV10D012345', mileage: 95000,
      maintenanceHistory: [{ typeId: oil.id, mileage: 80000, parts: [] }]
    }, 201);
    const id = vehicle.id;
    assert.equal(vehicle.isDefault, true);
    async function upload(token, filename = 'car.png', expected = 200) {
      const body = new FormData();
      body.append('image', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), filename);
      const response = await fetch(`${base}/api/vehicles/upload/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      assert.equal(response.status, expected);
    }
    await upload(other.token, 'car.png', 404);
    await upload(owner.token, 'car.html', 400);
    await upload(owner.token);
    const firstPhoto = (await api(`/api/vehicles/${id}`, owner.token)).imageUrl;
    await upload(owner.token);
    const withPhotos = await api(`/api/vehicles/${id}`, owner.token);
    assert.equal(withPhotos.photos.length, 2);
    assert.ok(withPhotos.photos.some(photo => photo.url === firstPhoto), 'Uploading a photo must retain the previous one');
    assert.ok(withPhotos.photos.some(photo => photo.url === withPhotos.imageUrl));
    assert.equal((await api('/api/vehicles', owner.token))[0].photos.length, 2);
    assert.equal((await fetch(base + firstPhoto)).status, 200);
    await api(`/api/vehicles/${id}`, other.token, 'GET', undefined, 404);
    await api(`/api/vehicles/${id}/notes`, null, 'GET', undefined, 401);
    const note = await api(`/api/vehicles/${id}/notes`, owner.token, 'POST', {
      title: 'Wishlist', kind: 'checklist', body: '', items: [{ text: 'CarPlay', done: false }]
    }, 201);
    await api(`/api/vehicles/${id}/notes`, other.token, 'GET', undefined, 404);
    await api(`/api/vehicles/${id}/notes/${note.id}`, other.token, 'PUT', note, 404);
    await api(`/api/vehicles/${id}/notes/${note.id}`, other.token, 'DELETE', undefined, 404);
    await api(`/api/vehicles/${id}/notes/${note.id}`, owner.token, 'PUT', { ...note, items: [{ text: 'CarPlay', done: true }] });
    assert.equal((await api(`/api/vehicles/${id}/notes`, owner.token))[0].items[0].done, true);
    await api(`/api/vehicles/${id}/notes`, owner.token, 'POST', { title: 'Invalid', kind: 'link', url: 'javascript:alert(1)', body: '' }, 400);
    const part = oil.parts[0];
    await api(`/api/maintenance/${id}`, owner.token, 'POST', { typeId: oil.id, mileage: 96000,
      parts: [{ typeId: part.id, name: part.name, brand: 'QA Brand', article: 'QA-123' }] }, 201);
    const latest = await api(`/api/maintenance/${id}`, owner.token);
    assert.equal(latest[0].mileage, 96000);
    assert.equal(latest[0].parts[0].article, 'QA-123');
    assert.equal((await api(`/api/vehicles/${id}`, owner.token)).mileage, 96000);
    await api(`/api/maintenance/${id}`, owner.token, 'POST', { typeId: oil.id, mileage: 96000, isSkipped: true, parts: [] }, 201);
    assert.equal((await api(`/api/maintenance/${id}`, owner.token))[0].isSkipped, true);
    assert.equal((await api(`/api/maintenance/${id}?fullHistory=true`, owner.token)).length, 3);
    const custom = await api(`/api/maintenance/${id}/types`, owner.token, 'POST', { id: -1, name: 'Custom regulation', period: 12000 });
    assert.ok(custom.typeId > 100);
    assert.ok((await api(`/api/maintenance/${id}/types`, owner.token)).some(type => type.id === custom.typeId));
    await api(`/api/maintenance/${id}/types`, other.token, 'POST', { id: -1, name: 'Forbidden', period: 1000 }, 404);
    await api(`/api/maintenance/${id}/types/${oil.id}`, owner.token, 'DELETE', undefined, 204);
    assert.ok(!(await api(`/api/maintenance/${id}`, owner.token)).some(record => record.typeId === oil.id));
    assert.equal((await api(`/api/maintenance/${id}?fullHistory=true`, owner.token)).filter(record => record.typeId === oil.id).length, 3);
    await api(`/api/vehicles/${id}`, owner.token, 'PUT', { mileage: 97000, disableNotify: true }, 202);
    assert.equal((await api(`/api/vehicles/${id}`, owner.token)).disableNotify, true);
    await api(`/api/vehicles/${id}/notes/${note.id}`, owner.token, 'DELETE', undefined, 204);
    assert.equal((await api(`/api/vehicles/${id}/notes`, owner.token)).length, 0);
    await api(`/api/vehicles/${id}`, owner.token, 'DELETE');
    assert.equal((await api('/api/vehicles', owner.token)).length, 0);
  } finally {
    await api('/api/auth/delete', owner.token, 'DELETE');
    await api('/api/auth/delete', other.token, 'DELETE');
  }
});
