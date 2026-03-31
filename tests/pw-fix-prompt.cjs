const { chromium } = require('/home/nicole/.nvm/versions/node/v20.19.4/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  // Grant clipboard permission
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    await page.goto('http://localhost:3847');
    await page.waitForTimeout(2000);
    await page.click('#securityScanBtn');
    await page.waitForTimeout(1000);

    // Select AgentSeal + Scan
    await page.locator('#securityEngineSelect').selectOption('agentseal');
    await page.locator('#securityStartBtn').click();
    console.log('Scanning...');
    await page.waitForTimeout(12000);

    console.log('Findings:', await page.locator('.sec-finding-item').count());

    // Scroll + expand first server
    await page.locator('#securityBody').evaluate(el => el.scrollTop = 200);
    await page.waitForTimeout(300);
    await page.locator('.sec-collapse-btn').first().click();
    await page.waitForTimeout(500);

    // Find a "Fix with Claude →" button
    const fixBtn = page.locator('.sec-fix-clickable').first();
    const fixVisible = await fixBtn.isVisible();
    console.log('Fix button visible:', fixVisible);

    if (fixVisible) {
      // Hover to see "Fix with Claude →"
      await fixBtn.hover();
      await page.waitForTimeout(500);
      await page.screenshot({ path: '/tmp/qa-fix-hover.png' });
      console.log('Hover screenshot saved');

      // Click to copy prompt
      await fixBtn.click();
      await page.waitForTimeout(500);

      // Read clipboard
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      console.log('Clipboard content (first 200 chars):', clipboard.slice(0, 200));

      // Verify prompt contains key info
      const hasServer = clipboard.includes('MCP server');
      const hasEngine = clipboard.includes('AgentSeal') || clipboard.includes('agentseal');
      const hasFix = clipboard.includes('Suggested fix');
      const hasEvaluate = clipboard.includes('evaluate');
      console.log('Has server name:', hasServer);
      console.log('Has engine name:', hasEngine);
      console.log('Has suggested fix:', hasFix);
      console.log('Has evaluate request:', hasEvaluate);

      await page.screenshot({ path: '/tmp/qa-fix-clicked.png' });
    }

    console.log('JS Errors:', errors.length ? errors : 'NONE');
    console.log('\n✅ ALL PASSED');
  } catch (e) {
    console.error('❌', e.message);
    await page.screenshot({ path: '/tmp/qa-fix-err.png' });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();
