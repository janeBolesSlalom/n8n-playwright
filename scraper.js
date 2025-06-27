const url = $json.body.url;
const matchPrice = $json.body.price;

console.log('=== SCRAPER INITIALIZATION ===');
console.log(`Target URL: ${url}`);
console.log(`Match Price: ${matchPrice}`);
console.log('===============================');

function isAccessDenied(html) {
    console.log('🔍 Checking for access denied patterns in HTML...');
    const lower = html.toLowerCase();
    const patterns = [
        'access denied',
        'you don\'t have permission',
        'error 401',
        'error 403',
        'not authorized'
    ];
    
    for (const pattern of patterns) {
        if (lower.includes(pattern)) {
            console.log(`❌ Access denied pattern found: "${pattern}"`);
            return true;
        }
    }
    console.log('✅ No access denied patterns found');
    return false;
}

async function extractPrices(page) {
    console.log('💰 Extracting prices from page...');
    return await page.evaluate(() => {
        const isPrice = text => /^£\s?[\d,]+(\.\d{2})?$/.test(text.trim());
        const prices = [];
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el =>
                !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)
        );
        
        console.log(`📊 Scanning ${elements.length} elements for prices...`);
        
        for (const el of elements) {
            const txt = el.textContent.replace(/\s+/g, ' ').trim();
            const style = window.getComputedStyle(el);
            if (
                txt.includes('£') &&
                isPrice(txt) &&
                style.visibility !== 'hidden' &&
                style.display !== 'none'
            ) {
                const cleanPrice = txt.replace('£', '').replace(/,/g, '').trim();
                prices.push(cleanPrice);
                console.log(`💲 Found price: ${txt} → ${cleanPrice}`);
            }
        }
        
        console.log(`📈 Total prices found: ${prices.length}`);
        return prices;
    });
}

async function checkPageAccessible(page) {
    console.log('🔍 Checking if page is accessible...');
    const html = await page.content();
    const allPrices = await extractPrices(page);
    
    console.log(`📋 Page HTML length: ${html.length} characters`);
    console.log(`💰 Prices extracted: ${allPrices.length}`);
    
    // Check for blocking patterns
    const blockingPatterns = [
        { name: 'Cloudflare', check: () => html.includes('cloudflare') },
        { name: 'Attention Required', check: () => html.includes('Attention Required') },
        { name: 'CAPTCHA', check: () => html.toLowerCase().includes('captcha') },
        { name: 'Access Denied', check: () => isAccessDenied(html) }
    ];
    
    const blockedBy = blockingPatterns.filter(pattern => pattern.check());
    
    if (allPrices.length === 0 && blockedBy.length > 0) {
        console.log('❌ Page appears to be blocked:');
        blockedBy.forEach(pattern => console.log(`   - ${pattern.name}`));
        return false;
    }
    
    if (allPrices.length === 0) {
        console.log('⚠️  No prices found, but no blocking patterns detected');
    } else {
        console.log('✅ Page is accessible and has prices');
    }
    
    return true;
}

return (async () => {
    console.log(`🚀 Starting scraper for URL: ${url}`);
    const { chromium } = require('playwright');
    let usedHeadless = true;
    let allPrices = [];

    // Try headless first, then headed if available
    const modes = [
        { headless: true, name: 'headless' },
        { headless: false, name: 'headed' }
    ];
    
    for (const mode of modes) {
        try {
            console.log(`\n🌐 Attempting ${mode.name} mode...`);
            const launchOptions = mode.headless 
                ? { headless: true } 
                : { headless: false, args: ['--window-position=-32000,-32000'] };
            
            console.log('🔧 Launch options:', JSON.stringify(launchOptions, null, 2));
            
            const browser = await chromium.launch(launchOptions);
            console.log('✅ Browser launched successfully');
            
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 800 },
                locale: 'en-GB'
            });
            console.log('✅ Browser context created');
            
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });
            console.log('✅ Anti-detection script added');
            
            const page = await context.newPage();
            console.log('✅ New page created');
            
            console.log(`🌍 Navigating to: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log('✅ Page loaded successfully');
            
            if (await checkPageAccessible(page)) {
                console.log(`✅ Page accessible in ${mode.name} mode`);
                allPrices = await extractPrices(page);
                usedHeadless = mode.headless;
                await browser.close();
                console.log('✅ Browser closed');
                break;
            } else {
                console.log(`❌ Page not accessible in ${mode.name} mode, trying next...`);
            }
            await browser.close();
        } catch (err) {
            console.log(`❌ Error in ${mode.name} mode:`, err.message);
            // If headed mode fails (e.g., no Xvfb), just continue
        }
    }

    // Normalize prices
    console.log('\n🔄 Processing extracted prices...');
    console.log('Raw prices:', allPrices);
    
    const normalizedPrices = allPrices
        .map(p => {
            const num = parseFloat(p);
            const normalized = isNaN(num) ? null : Number(num.toFixed(2));
            if (normalized !== null) {
                console.log(`✅ Normalized: ${p} → ${normalized}`);
            } else {
                console.log(`❌ Invalid price: ${p}`);
            }
            return normalized;
        })
        .filter(p => p !== null);

    console.log(`📊 Final normalized prices (${normalizedPrices.length}):`, normalizedPrices);

    let matchPriceDecimal = null;
    let found = false;
    if (matchPrice) {
        console.log(`\n🎯 Checking for match price: ${matchPrice}`);
        matchPriceDecimal = Number(
            parseFloat(matchPrice.replace('£', '').replace(/,/g, '').trim()).toFixed(2)
        );
        console.log(`🔍 Looking for: ${matchPriceDecimal}`);
        found = normalizedPrices.includes(matchPriceDecimal);
        console.log(`${found ? '✅ MATCH FOUND!' : '❌ No match found'}`);
    } else {
        console.log('\n⚠️  No match price provided');
    }

    const result = {
        url,
        normalizedPrices,
        usedHeadless,
        matchPrice: matchPriceDecimal,
        found
    };
    
    console.log('\n🏁 FINAL RESULT:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
})();