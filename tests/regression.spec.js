const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Clarity Regression Safety Net', () => {
    
    test('Login and Full Navigation Flow', async ({ page }) => {
        // 1. Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'e2e@clarity.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // 2. Verify Dashboard
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        await expect(page.locator('h1')).toContainText('Clarity Dashboard');
        await expect(page.locator('.menu-item.active')).toContainText('Dashboard');

        // 3. Navigate to Insights
        await page.click('text=Financial Insights');
        await expect(page).toHaveURL(`${BASE_URL}/insights`);
        await expect(page.locator('h1')).toContainText('Financial Insights');
        await expect(page.locator('.menu-item.active')).toContainText('Financial Insights');

        // 4. Navigate to Settings
        await page.click('text=Settings');
        await expect(page).toHaveURL(`${BASE_URL}/settings`);
        await expect(page.locator('h1')).toContainText('Settings');
        await expect(page.locator('.menu-item.active')).toContainText('Settings');

        // 5. Navigate to Admin (Dynamic via sidebar-admin.js)
        // Wait for admin section to be injected and click the link
        const adminLink = page.locator('aside.sidebar a[href="/admin"]');
        await expect(adminLink).toBeVisible({ timeout: 10000 });
        await adminLink.click();
        
        await expect(page).toHaveURL(`${BASE_URL}/admin`);
        await expect(page.locator('h1')).toContainText('Admin Panel');
        await expect(page.locator('.menu-item.active')).toContainText('Admin Panel');

        // 6. Navigate to Dev Tools
        const devToolsLink = page.locator('aside.sidebar a[href="/dev-tools"]');
        await expect(devToolsLink).toBeVisible();
        await devToolsLink.click();
        await expect(page).toHaveURL(`${BASE_URL}/dev-tools`);
        await expect(page.locator('h1')).toContainText('Developer Tools');
        await expect(page.locator('.menu-item.active')).toContainText('Developer Tools');

        // 7. Navigate to Support
        await page.click('aside.sidebar a[href="/support"]');
        await expect(page).toHaveURL(`${BASE_URL}/support`);
        await expect(page.locator('h1')).toContainText('Clarity Support');
        await expect(page.locator('.menu-item.active')).toContainText('Support');
    });

    test('Unauthorized access redirect', async ({ page }) => {
        // Should redirect to login if not authenticated
        await page.goto(`${BASE_URL}/dashboard`);
        await expect(page).toHaveURL(`${BASE_URL}/login`);
    });
});
