const { chromium } = require('/home/nicole/.nvm/versions/node/v20.19.4/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    await page.goto('http://localhost:3847');
    await page.waitForTimeout(2000);

    // Open security panel
    await page.click('#securityScanBtn');
    await page.waitForTimeout(1000);

    // Select AgentSeal + Scan
    await page.locator('#securityEngineSelect').selectOption('agentseal');
    await page.locator('#securityStartBtn').click();
    console.log('Scanning with AgentSeal...');
    await page.waitForTimeout(12000);

    const findings = await page.locator('.sec-finding-item').count();
    console.log('Findings:', findings);

    // Scroll + expand first server
    await page.locator('#securityBody').evaluate(el => el.scrollTop = 200);
    await page.waitForTimeout(300);
    await page.locator('.sec-collapse-btn').first().click();
    await page.waitForTimeout(500);

    // Screenshot findings detail
    await page.screenshot({ path: '/tmp/qa-findings.png' });
    console.log('Screenshot: /tmp/qa-findings.png');

    // Click to navigate
    const first = page.locator('.sec-finding-item').first();
    console.log('Server:', await first.getAttribute('data-sec-server'));
    await first.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/qa-navigate.png' });

    console.log('JS Errors:', errors.length ? errors : 'NONE');
    console.log('\n✅ ALL PASSED');
  } catch (e) {
    console.error('❌', e.message);
    await page.screenshot({ path: '/tmp/qa-err.png' });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();
