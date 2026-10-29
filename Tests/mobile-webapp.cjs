// Run against a disposable local database, as with api-smoke.mjs.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.AUTOMT_TEST_URL || 'http://127.0.0.1:5297';

(async () => {
  const engine = process.env.AUTOMT_BROWSER || 'chromium';
  const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'msedge', headless: true }));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let token;
  async function api(endpoint, method = 'GET', body) {
    const response = await fetch(base + endpoint, { method, headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.ok(response.ok, `${method} ${endpoint}: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  async function navVisible() {
    const bounds = await page.locator('.amt-bottomnav').evaluate(el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height, viewport: window.visualViewport.height, scroll: document.scrollingElement.scrollTop };
    });
    assert.ok(bounds.height > 50 && bounds.top > 0 && Math.abs(bounds.bottom - bounds.viewport) <= 1, JSON.stringify(bounds));
    assert.equal(bounds.scroll, 0, 'Only the content pane should scroll');
  }
  async function counter(text) {
    try { await page.getByText(text, { exact: true }).waitFor(); }
    catch (error) {
      console.error(await page.locator('[data-photo-track]').evaluate(el => ({ left: el.scrollLeft, width: el.clientWidth, counter: document.querySelector('[data-photo-counter]').textContent, focus: document.activeElement.tagName })));
      throw error;
    }
  }
  try {
    const manifestResponse = await fetch(base + '/manifest.json');
    assert.ok(manifestResponse.ok);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.start_url, '/index.html');
    for (const filename of ['index.html', 'garage.html', 'account.html', 'login.html', 'register.html', 'vehicleForm.html', 'maintenanceForm.html']) {
      const html = await (await fetch(`${base}/${filename}`)).text();
      assert.match(html, /rel="manifest" href="\/manifest.json"/);
      assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
      assert.match(html, /rel="apple-touch-icon"/);
    }
    for (const [filename, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
      const response = await fetch(`${base}/images/${filename}`);
      assert.ok(response.ok);
      const png = Buffer.from(await response.arrayBuffer());
      assert.equal(png.readUInt32BE(16), size);
      assert.equal(png.readUInt32BE(20), size);
    }
    ({ token } = await api('/api/auth/register', 'POST', { username: `mobile_${Date.now()}`, password: 'TestPassword!2' }));
    const types = await api('/api/maintenance/types');
    const car = await api('/api/vehicles', 'POST', { brand: 'Audi', model: 'A3', year: 2014, vin: 'WAUZZZ8V7F1048788', mileage: 201500,
      maintenanceHistory: types.map(type => ({ typeId: type.id, mileage: 150000, parts: [] })) });
    await api(`/api/vehicles/${car.id}`, 'PUT', { disableNotify: true });
    await page.addInitScript(value => localStorage.setItem('token', value), token);
    await page.goto(base + '/index.html');
    await page.getByRole('heading', { name: 'План обслуживания', exact: true }).waitFor();
    await page.evaluate(() => window.sameDocument = true);
    await navVisible();
    await page.locator('.amt-content').evaluate(el => el.scrollTop = 350);
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#amt-live').getAttribute('data-scrolled'), 'true');
    await page.locator('.amt-bottomnav [data-page="garage"]').click();
    await page.getByRole('heading', { name: 'Мой гараж', exact: true }).waitFor();
    await navVisible();
    await page.goBack();
    await page.getByRole('heading', { name: 'План обслуживания', exact: true }).waitFor();
    await page.waitForTimeout(250);
    assert.ok(await page.locator('.amt-content').evaluate(el => el.scrollTop) > 200, 'Back should restore inner scrolling');
    await navVisible();
    await page.locator('.amt-bottomnav [data-page="garage"]').click();
    const photo = name => path.join(__dirname, '../Sources/Frontend/images', name);
    await page.locator('[data-action="photo"]').click();
    await page.locator('[data-photo]').setInputFiles(photo('icon-192.png'));
    await page.getByText('Фотография добавлена', { exact: true }).waitFor();
    await page.locator('[data-action="viewphotos"]').click();
    await counter('1 / 1');
    assert.equal(await page.locator('[data-action="photonext"]').count(), 0);
    await page.getByRole('button', { name: 'Закрыть фотографии' }).click();
    assert.equal(await page.locator('[data-action="viewphotos"]').evaluate(el => el === document.activeElement), true);
    await page.locator('[data-action="photo"]').click();
    await page.locator('[data-photo]').setInputFiles([photo('icon-512.png'), photo('apple-touch-icon.png')]);
    await page.getByText('Добавлено фото: 2', { exact: true }).waitFor();
    await page.reload();
    await page.locator('[data-action="viewphotos"]').click();
    await counter('1 / 3');
    await page.getByRole('button', { name: 'Следующее фото', exact: true }).click();
    await counter('2 / 3');
    await page.keyboard.press('ArrowRight');
    await counter('3 / 3');
    await page.keyboard.press('ArrowRight');
    await counter('1 / 3');
    // The native scroll track is also the touch/swipe surface.
    await page.locator('[data-photo-track]').evaluate(el => el.scrollTo({ left: el.clientWidth, behavior: 'instant' }));
    await counter('2 / 3');
    for (const size of [{ width: 390, height: 670 }, { width: 390, height: 844 }, { width: 540, height: 390 }]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(150);
      const gallery = await page.locator('.amt-gallery').boundingBox();
      assert.ok(Math.abs(gallery.height - size.height) <= 1, 'Gallery should follow the visible viewport');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => Math.abs(document.querySelector('.amt-gallery').getBoundingClientRect().height - window.visualViewport.height) <= 1);
    if (process.env.AUTOMT_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.AUTOMT_SCREENSHOT_DIR, `${engine}-gallery.png`) });
    await page.keyboard.press('Escape');
    await page.locator('.amt-gallery').waitFor({ state: 'hidden' });
    for (const height of [670, 844, 500, 844]) {
      await page.setViewportSize({ width: 390, height });
      await page.waitForTimeout(100);
      await navVisible();
      await page.locator('.amt-bottomnav [data-page="account"]').click();
      await page.getByRole('heading', { name: 'Аккаунт', exact: true }).waitFor();
      await page.goBack();
      await page.getByRole('heading', { name: 'Мой гараж', exact: true }).waitFor();
      await navVisible();
    }
    assert.equal(await page.evaluate(() => window.sameDocument), undefined); // Only our explicit reload reset it.
    await page.evaluate(() => window.sameDocument = true);
    await page.locator('.amt-bottomnav [data-page="account"]').click();
    await page.goBack();
    await page.getByRole('heading', { name: 'Мой гараж', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.sameDocument), true, 'Internal tabs must stay in the same document');
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      for (const width of [320, 390, 540, 736, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      if (process.env.AUTOMT_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.AUTOMT_SCREENSHOT_DIR, `${engine}-garage-${colorScheme}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log(`${engine}: manifest/icons, legacy routes, photo upload/persistence/gallery, keyboard/swiping, viewport resizing, history and both themes passed.`);
  } finally {
    if (token) await api('/api/auth/delete', 'DELETE');
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
