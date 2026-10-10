import { expect, test } from '@playwright/test';

const START = new Date('2026-10-01T09:00:00Z');

test.describe('AddvancedFocus demo, keyboard only', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: START });
    await page.goto('/addvancedfocus/');
    await page.clock.pauseAt(new Date(START.getTime() + 5_000));
  });

  test('horizon tabs move with the arrow keys', async ({ page }) => {
    await page.locator('[data-horizon="now"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-horizon="today"]')).toBeFocused();
    await expect(page.locator('[data-horizon="today"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#af-panel-today')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-horizon="now"]')).toBeFocused();
    await expect(page.locator('#af-panel-now')).toBeVisible();
  });

  test('start, pause, complete and undo keep focus and announce each step', async ({ page }) => {
    const primary = page.locator('#af-primary');
    const status = page.locator('#af-announcement');
    await primary.focus();
    await expect(primary).toHaveText('Start 2 minutes');

    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Session started. Pause whenever you need.');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveText('Pause & keep my place');
    await expect(page.locator('[data-scenario]').first()).toBeDisabled();
    await expect(page.locator('#af-stop')).toBeVisible();

    await page.clock.runFor(31_000);
    await expect(page.locator('#af-timer')).toHaveText('01:29');

    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Session paused. You can leave a return note.');
    await expect(primary).toHaveText('Resume session');
    await expect(page.locator('#af-checkpoint')).toBeVisible();

    await page.locator('#af-done').focus();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Step complete. Continue or leave it here—both are okay.');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveText('Choose next small step');
    await expect(page.locator('#af-completion')).toBeVisible();

    await page.locator('#af-undo').focus();
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Completion undone. Your step is ready again.');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveText('Start 2 minutes');
  });

  test('every visible control is reachable with Tab, and a session runs on keys alone', async ({ page, browserName }) => {
    // Safari moves focus through buttons and links with Option+Tab; plain Tab reaches only form fields there.
    const TAB = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    const reached = new Set();
    await page.locator('#concept-demo').focus();
    for (let step = 0; step < 80; step += 1) {
      await page.keyboard.press(TAB);
      const inside = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el.closest('.af-demo')) return null;
        el.dataset.tabReached = 'yes';
        return true;
      });
      if (inside === null && reached.size) break;
      if (inside) reached.add(step);
    }
    const missed = await page.evaluate(() => [...document.querySelectorAll(
      '.af-demo :is(a[href], button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"]))')]
      .filter((el) => !el.disabled && el.checkVisibility() && el.tabIndex >= 0 && !(el.type === 'radio' && !el.checked))
      .filter((el) => el.dataset.tabReached !== 'yes')
      .map((el) => el.id || el.textContent.trim().slice(0, 30)));
    expect(missed).toEqual([]);

    const primary = page.locator('#af-primary');
    await page.locator('#concept-demo').focus();
    for (let step = 0; step < 80 && !(await primary.evaluate((el) => el === document.activeElement)); step += 1) await page.keyboard.press(TAB);
    await expect(primary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(primary).toHaveText('Pause & keep my place');
    await page.keyboard.press('Enter');
    await expect(page.locator('#af-return-note')).toBeFocused();
    await page.keyboard.type('Pick up at the second paragraph');
    await expect(page.locator('#af-return-note')).toHaveValue('Pick up at the second paragraph');
  });
});
