import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.ELARA_TEST_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const routes = ['home', 'books', 'language', 'reports'];
try {
  for (const width of [390, 1440]) {
    for (const routeName of routes) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let delayedStylesheet = false;
      const delay = routeName === 'books' && width === 1440 ? 6800 : 1700;
      await page.route('**/global-page-banner-20261009.css*', async request => {
        delayedStylesheet = true;
        await new Promise(resolve => setTimeout(resolve, delay));
        await request.continue();
      });
      await page.goto(base + '/?first-paint=' + routeName + '-' + width + '#' + routeName, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      const initial = await page.evaluate(() => {
        const skeleton = document.getElementById('elara-boot-screen');
        return {
          booting: document.documentElement.hasAttribute('data-elara-booting'),
          skeleton: skeleton && getComputedStyle(skeleton).display !== 'none',
          shellHidden: getComputedStyle(document.querySelector('.shell')).visibility === 'hidden',
          bootError: document.documentElement.hasAttribute('data-elara-boot-failed')
        };
      });
      assert.equal(initial.booting, true, routeName + ': boot flag must exist before the first paint');
      assert.equal(initial.skeleton, true, routeName + ': route-neutral skeleton must be shown');
      assert.equal(initial.shellHidden, true, routeName + ': old shell must never flash');
      assert.equal(initial.bootError, false, routeName + ': startup unexpectedly failed');

      if (delay > 5000) {
        await page.waitForTimeout(5500);
        assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-elara-booting')), true,
          'The old five-second watchdog must not expose the previous design');
      }

      await page.waitForFunction(() =>
        !document.documentElement.hasAttribute('data-elara-booting') &&
        !!window.ElaraGlobalBanners &&
        !!window.ElaraFeatureHubs &&
        !!document.querySelector('.shell'),
        null, { timeout: 45000 });
      assert.equal(delayedStylesheet, true, 'The shared stylesheet delay was not exercised');
      const result = await page.evaluate(route => {
        const css = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => new URL(link.href).pathname.split('/').pop());
        return {
          skeletonHidden: getComputedStyle(document.getElementById('elara-boot-screen')).display === 'none',
          shellVisible: getComputedStyle(document.querySelector('.shell')).visibility !== 'hidden',
          banner: !!document.querySelector('#panel-' + route + ' .elara-global-hero'),
          library: !!document.querySelector('#panel-books #lib01-overview'),
          ordered: css.indexOf('global-page-banner-20261009.css') < css.indexOf('lib01-library-dashboard.css') &&
            css.indexOf('global-page-banner-20261009.css') >= 0,
          ownerStylesLast: css.indexOf('freedom-r27-polish.css') < css.indexOf('lib01-library-dashboard.css')
        };
      }, routeName);
      assert.equal(result.skeletonHidden, true, routeName + ': skeleton stuck after readiness');
      assert.equal(result.shellVisible, true, routeName + ': shell did not become visible');
      assert.equal(result.banner, true, routeName + ': route artwork/hero missing');
      assert.equal(result.library, true, 'New library dashboard did not mount');
      assert.equal(result.ordered, true, 'Shared stylesheets override new library CSS');
      assert.equal(result.ownerStylesLast, true, 'Old layout CSS is loaded after new page CSS');
      assert.deepEqual(errors, [], routeName + ': runtime exception(s): ' + errors.join('; '));
      console.log('FIRST_PAINT_PASS ' + JSON.stringify({ routeName, width, delay }));
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log('FIRST_PAINT_ALL_ROUTES_PASS');
