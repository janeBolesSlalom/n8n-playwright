require('dotenv').config();
const {
    test,
    expect,
    chromium
} = require('@playwright/test');

const matchPrice = process.env.MATCH_PRICE;
const targetUrl = process.env.TARGET_URL;

function isAccessDenied(html) {
    const lower = html.toLowerCase();
    return (
        lower.includes('access denied') ||
        lower.includes('you don\'t have permission') ||
        lower.includes('error 401') ||
        lower.includes('error 403') ||
        lower.includes('not authorized')
    );
}

// --- Extract prices from a page ---
async function extractPrices(page) {
    return await page.evaluate(() => {
        const isPrice = text => /^£\s?[\d,]+(\.\d{2})?$/.test(text.trim());
        const prices = [];
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el =>
            !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)
        );
        for (const el of elements) {
            const txt = el.textContent.replace(/\s+/g, ' ').trim();
            const style = window.getComputedStyle(el);
            if (
                txt.includes('£') &&
                isPrice(txt) &&
                style.visibility !== 'hidden' &&
                style.display !== 'none'
            ) {
                prices.push(txt.replace('£', '').replace(/,/g, '').trim());
            }
        }
        return prices;
    });
}

async function checkPageAccessible(url, headless = true) {
    console.log(`Launching browser (${headless ? 'headless' : 'headed'}) to check accessibility...`);
    const launchOptions = headless ? {
        headless: true
    } : {
        headless: false,
        args: ['--window-position=-32000,-32000']
    };
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        viewport: {
            width: 1280,
            height: 800
        },
        locale: 'en-GB'
    });

    console.log('Adding anti-bot script...');
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });
    });

    const page = await context.newPage();
    try {
        console.log('Navigating to URL to check accessibility...');
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        console.log('Retrieving HTML to check for Cloudflare/CAPTCHA/Access Denied...');
        const html = await page.content();

        const allPrices = await extractPrices(page);

        if (
            allPrices.length === 0 &&
            (
                html.includes('cloudflare') ||
                html.includes('Attention Required') ||
                html.toLowerCase().includes('captcha') ||
                isAccessDenied(html)
            )
        ) {
            console.log('Blocked by Cloudflare, CAPTCHA, or Access Denied detected.');
            await browser.close();
            return false;
        }
        await browser.close();
        return true;
    } catch (err) {
        console.log('Error during accessibility check:', err);
        await browser.close();
        return false;
    }
}

async function scrapePrices(url, headless = true) {
    console.log(`Launching browser (${headless ? 'headless' : 'headed'}) for scraping...`);
    const launchOptions = headless ? {
        headless: true
    } : {
        headless: false,
        args: ['--window-position=-32000,-32000']
    };
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        viewport: {
            width: 1280,
            height: 800
        },
        locale: 'en-GB'
    });

    console.log('Adding anti-bot script...');
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });
    });

    const page = await context.newPage();
    console.log('Navigating to URL for scraping...');
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });
    console.log('Retrieving HTML for scraping...');
    const html = await page.content();
    console.log(`Retrieved HTML (${headless ? 'headless' : 'headed'})`);

    console.log('Extracting prices from page...');
    const allPrices = await extractPrices(page);

    await browser.close();
    return allPrices;
}

test('scrape prices', async () => {
    test.setTimeout(90000); // Set timeout to 90 seconds

    const url =
        targetUrl ||
        'https://www.currys.co.uk/products/lg-oled55c44la-55-smart-4k-ultra-hd-hdr-oled-tv-with-amazon-alexa-10263226.html';

    let allPrices = [];
    let usedHeadless = true;

    console.log('Checking accessibility in headless mode...');
    if (await checkPageAccessible(url, true)) {
        console.log('Accessible in headless mode. Scraping...');
        allPrices = await scrapePrices(url, true);
    } else {
        console.log('Blocked in headless mode. Trying headed mode...');
        if (await checkPageAccessible(url, false)) {
            usedHeadless = false;
            console.log('Accessible in headed mode. Scraping...');
            allPrices = await scrapePrices(url, false);
        } else {
            throw new Error('Page is not accessible in either headless or headed mode (likely blocked by Cloudflare or CAPTCHA).');
        }
    }

    console.log('Normalizing prices...');
    const normalizedPrices = allPrices
        .map(p => {
            const num = parseFloat(p);
            return isNaN(num) ? null : Number(num.toFixed(2));
        })
        .filter(p => p !== null);

    if (!matchPrice) {
        throw new Error('MATCH_PRICE environment variable is not set.');
    }
    const matchPriceDecimal = Number(
        parseFloat(matchPrice.replace('£', '').replace(/,/g, '').trim()).toFixed(2)
    );
    if (isNaN(matchPriceDecimal)) {
        throw new Error(`MATCH_PRICE "${matchPrice}" is not a valid number.`);
    }

    console.log('Normalized Prices:', normalizedPrices);
    console.log('Mode used:', usedHeadless ? 'headless' : 'headed');

    expect(normalizedPrices.length).toBeGreaterThan(0);
    expect(normalizedPrices).toContain(matchPriceDecimal);
});