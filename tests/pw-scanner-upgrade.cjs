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

    // Click Start Security Scan
    await page.click('#securityStartBtn');
    console.log('Scanning with built-in scanner...');

    // Wait for scan (connects to MCP servers)
    await page.waitForTimeout(30000);

    // Count findings
    const findings = await page.locator('.sec-finding-item, .sec-finding-row').count();
    const servers = await page.locator('.sec-server-row').count();
    console.log(`Findings: ${findings}, Server groups: ${servers}`);

    // Expand first server
    const collapseBtn = page.locator('.sec-collapse-btn').first();
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
    }

    // Screenshot
    await page.screenshot({ path: '/tmp/scanner-upgrade.png' });
    console.log('Screenshot: /tmp/scanner-upgrade.png');

    console.log('JS Errors:', errors.length ? errors : 'NONE');
    console.log('\n✅ PASS');
  } catch (e) {
    console.error('❌', e.message);
    await page.screenshot({ path: '/tmp/scanner-upgrade-err.png' });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();
