import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = (process.env.ELARA_TEST_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const controls = [
  '#ref-header-account',
  '#ref-header-notifications',
  '#theme-toggle',
  '#ref-header-search'
];

async function visible(page, selector) {
  return page.locator(selector).evaluate(el => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}


async function withoutDesktopRules(page, selector) {
  return page.evaluate(selector => {
    const sheet = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => link.href.includes('desktop-home-only-controls-20261012.css'));
    assertSheet(sheet);
    const visibleNow = () => {
      const el = document.querySelector(selector);
      if (!el) return false;
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        const s = getComputedStyle(node);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const withStyles = visibleNow();
    sheet.disabled = true;
    const withoutStyles = visibleNow();
    sheet.disabled = false;
    return { withStyles, withoutStyles };
  }, selector);
}
function assertSheet(sheet) {
  if (!sheet) throw new Error('Home-only CSS did not load');
}

async function route(page, name) {
  await page.evaluate(tab => window.ElaraOpen(tab, { history: 'replace' }), name);
  await page.waitForFunction(
    tab => !!document.querySelector('#panel-' + tab + ':not(.hidden)'),
    name,
    { timeout: 10000 }
  );
}

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(base + '/#home', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(
      () => !!window.ElaraOpen &&
        !!document.querySelector('#ref-header-account') &&
        !!document.querySelector('#ref-header-search') &&
        !!document.querySelector('#ref-header-notifications') &&
        !document.documentElement.hasAttribute('data-elara-booting'),
      null,
      { timeout: 30000 }
    );
    // Tests run without requiring a signed-in Firebase session.
    await page.addStyleTag({ content:
      '#cloud-layer{display:none!important}' +
      'body:not(.cloud-ready) .shell,body.cloud-locked .shell{visibility:visible!important}'
    });

    for (const name of ['home', 'tasks', 'language', 'books']) {
      await route(page, name);
      for (const selector of controls) {
        if (width <= 700) {
          // Mobile can intentionally hide a global control on certain routes;
          // assert this release doesn't change its original state.
          const states = await withoutDesktopRules(page, selector);
          assert.equal(states.withStyles, states.withoutStyles,
            selector + ' mobile behavior changed on ' + name);
        } else {
          assert.equal(
            await visible(page, selector),
            name === 'home',
            selector + ' unexpected on ' + name + ' at ' + width + 'px'
          );
        }
      }
    }

    await route(page, 'tasks');
    await page.waitForSelector('#panel-tasks [data-elara-home-return]', { state: 'attached' });
    await page.locator('#panel-tasks [data-elara-home-return]')
      .evaluate(el => { el.hidden = false; });
    if (width <= 700) {
      const states = await withoutDesktopRules(page, '#panel-tasks [data-elara-home-return]');
      assert.equal(states.withStyles, states.withoutStyles,
        'Mobile Home-return behavior must not change');
    } else {
      assert.equal(
        await visible(page, '#panel-tasks [data-elara-home-return]'),
        false,
        'Main-page Home return must be removed on desktop'
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log('PASS: desktop-only Home controls; mobile and Home remain unchanged');
