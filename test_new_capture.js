const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const filePath = 'file://' + path.resolve('examples/new-capture/index.html');
  await page.goto(filePath);

  // Take a screenshot of the landing page
  await page.screenshot({ path: 'new_capture_landing.png' });

  // Simulate image upload
  // We need a real image file. There is calibration-example.png in that folder.
  const input = await page.$('#spectrumImageUpload');
  await input.setInputFiles('examples/new-capture/calibration-example.png');

  // Wait for preview to appear
  await page.waitForSelector('#uploadPreviewContainer', { state: 'visible' });
  await page.screenshot({ path: 'new_capture_uploaded.png' });

  // Click twice on the image
  const img = await page.$('#uploadPreviewImage');
  const box = await img.boundingBox();

  // Click 1
  await page.mouse.click(box.x + 100, box.y + 50);
  // Click 2
  await page.mouse.click(box.x + 500, box.y + 150);

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'new_capture_clicked.png' });

  // Try dragging handle
  // We need to find the handle. It's an SVG circle.
  const handle = await page.$('.swb-spectrum-img-container circle');
  if (handle) {
    const hBox = await handle.boundingBox();
    await page.mouse.move(hBox.x + hBox.width/2, hBox.y + hBox.height/2);
    await page.mouse.down();
    await page.mouse.move(hBox.x + 200, hBox.y + 100);
    await page.mouse.up();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'new_capture_dragged.png' });
  } else {
    console.log('Handle not found');
  }

  await browser.close();
})();
