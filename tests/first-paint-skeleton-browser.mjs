import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.ELARA_TEST_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1440]) {
    for (const route of ['home', 'books', 'language', 'reports']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      let delayedCss = false;
      await page.route('**/global-page-banner-20261009.css*', async request => {
        delayedCss = true;
        await new Promise(resolve => setTimeout(resolve, 7000));
        await request.continue();
      });
      if (route === 'home' && width === 390) {
        await page.route('**/freedom-ai.js*', async request =>
          request.fulfill({ status: 503, contentType: 'application/javascript', body: '' }));
      }
      await page.goto(base + '/?progressive-boot=' + route + '-' + width + '#' + route,
        { waitUntil: 'domcontentloaded', timeout: 45000 });
      const initial = await page.evaluate(() => ({
        boot: document.documentElement.hasAttribute('data-elara-booting'),
        visibleSkeleton: getComputedStyle(document.getElementById('elara-boot-screen')).display !== 'none',
        shellHidden: getComputedStyle(document.querySelector('.shell')).visibility === 'hidden',
        homeReady: !!window.ElaraReferenceHome && !!window.ElaraNavigation,
        marked: performance.getEntriesByName('elara-home-visible','mark').length > 0
      }));
      // A fast cached boot can complete before DOMContentLoaded. Both states are valid,
      // but an incomplete shell must never flash behind a missing skeleton.
      if(initial.boot){
        assert.equal(initial.visibleSkeleton,true,route+': missing startup skeleton');
        assert.equal(initial.shellHidden,true,route+': fallback shell flashed before Home was ready');
      }else{
        assert.equal(initial.visibleSkeleton,false,route+': skeleton stayed visible after release');
        assert.equal(initial.homeReady&&initial.marked,true,route+': early reveal lacked Home owners');
      }
      assert.equal(await page.locator('#elara-boot-failure').count(), 0, 'Old permanent error panel still exists');
      assert.equal(await page.locator('#elara-boot-status').count(), 0, 'Old "new Elara" message still exists');

      // An unrelated delayed stylesheet must NOT block the whole application.
      await page.waitForFunction(() =>
        !document.documentElement.hasAttribute('data-elara-booting') &&
        !!window.ElaraReferenceHome && !!window.ElaraNavigation,
        null, { timeout: 6500 });
      assert.ok(delayedCss, route + ': delayed stylesheet was not exercised');
      const first = await page.evaluate(() => ({
        stage: window.__elaraBootStage,
        skeletonHidden: getComputedStyle(document.getElementById('elara-boot-screen')).display === 'none',
        shellVisible: getComputedStyle(document.querySelector('.shell')).visibility !== 'hidden',
        authGate: document.body.classList.contains('cloud-locked') || !!document.querySelector('[data-elara-account-gate-ready]'),
        home: !!document.querySelector('#panel-home'),
        tasks: !!document.querySelector('#panel-tasks')
      }));
      assert.ok(['home', 'tasks', 'secondary'].includes(first.stage), route + ': invalid initial stage');
      assert.equal(first.skeletonHidden, true, route + ': skeleton not dismissed');
      assert.equal(first.shellVisible || first.authGate, true, route + ': neither app nor legitimate login gate is visible');
      assert.equal(first.home && first.tasks, true, route + ': core Home or Tasks DOM missing');

      await page.waitForFunction(() => window.__elaraBootStage === 'tasks' ||
        window.__elaraBootStage === 'secondary', null, { timeout: 20000 });
      await page.waitForFunction(() =>
        window.__elaraBootStage === 'secondary' && !!window.ElaraGlobalBanners,
        null, { timeout: 35000 });
      const later = await page.evaluate(routeName => ({
        banner: !!document.querySelector('#panel-' + routeName + ' .elara-global-hero'),
        library: !!document.querySelector('#panel-books #lib01-overview'),
        boot: document.documentElement.hasAttribute('data-elara-booting')
      }), route);
      assert.equal(later.banner, true, route + ': destination hero failed to mount');
      assert.equal(later.library, true, route + ': library owner failed to mount');
      assert.equal(later.boot, false, route + ': skeleton returned after later feature loading');
      assert.deepEqual(pageErrors, [], route + ': unhandled runtime error(s)');
      console.log('PROGRESSIVE_BOOT_PASS ' + JSON.stringify({ route, width }));
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log('PROGRESSIVE_BOOT_ALL_ROUTES_PASS');
