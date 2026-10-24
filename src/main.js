// language: JavaScript, file: src/main.js, runtime: Node.js 20 / Apify SDK / Playwright
import { Actor } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

const input = await Actor.getInput() || {};
const targetUrl = (input.targetUrl || 'https://velvetx.masterverse.in/').trim();
const deviceType = input.deviceType || 'mixed'; // 'desktop', 'mobile', or 'mixed'
const dwellSeconds = parseInt(input.dwellSeconds, 10) || 10;
const nativeAdChance = parseInt(input.nativeAdChance, 10) || 40;
const readDurationSec = parseInt(input.readDurationSec, 10) || 8;
const maxCycles = parseInt(input.maxCycles, 10) || 30;

console.log('===================================================================');
console.log('>> Apify Autonomous Viewport & Adsterra Popunder Engine (v2.0)');
console.log(`>> Target URL: ${targetUrl}`);
console.log(`>> Device Mode: ${deviceType.toUpperCase()}`);
console.log(`>> Post-Click Dwell: ${dwellSeconds}s | Native Ad Chance: ${nativeAdChance}%`);
console.log(`>> Total Single-View Sessions: ${maxCycles}`);
console.log('===================================================================');

// 1. Initialize Apify Proxy Pool
let proxyConfiguration = null;
try {
    if (input.proxyConfiguration) {
        proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
    } else {
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: ['RESIDENTIAL']
        });
    }
    console.log('[+] Apify Proxy pool successfully initialized.');
} catch (e) {
    console.warn(`[!] Residential proxy note: ${e.message}. Using standard datacenter pool fallback...`);
    try {
        proxyConfiguration = await Actor.createProxyConfiguration();
    } catch (e2) {
        console.warn(`[!] Direct connection fallback: ${e2.message}`);
    }
}

// 2. Curated Device Fingerprint Profiles
const DESKTOP_PROFILES = [
    {
        name: 'Windows 11 / Chrome 128',
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false
    },
    {
        name: 'Windows 11 / Edge 128',
        viewport: { width: 1536, height: 864 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
        deviceScaleFactor: 1.25,
        isMobile: false,
        hasTouch: false
    },
    {
        name: 'macOS Sonoma / Safari 17.5',
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false
    }
];

const MOBILE_PROFILES = [
    {
        name: 'Apple iPhone 15 Pro / Safari',
        viewport: { width: 393, height: 852 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
    },
    {
        name: 'Samsung Galaxy S24 / Chrome Mobile',
        viewport: { width: 412, height: 915 },
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true
    },
    {
        name: 'Google Pixel 8 Pro / Chrome Mobile',
        viewport: { width: 412, height: 892 },
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true
    }
];

function selectProfile(mode) {
    if (mode === 'mobile') {
        return MOBILE_PROFILES[Math.floor(Math.random() * MOBILE_PROFILES.length)];
    }
    if (mode === 'desktop') {
        return DESKTOP_PROFILES[Math.floor(Math.random() * DESKTOP_PROFILES.length)];
    }
    // Mixed: 50/50 split
    return Math.random() < 0.5
        ? MOBILE_PROFILES[Math.floor(Math.random() * MOBILE_PROFILES.length)]
        : DESKTOP_PROFILES[Math.floor(Math.random() * DESKTOP_PROFILES.length)];
}

// 3. Launch Master Browser Process
const browser = await chromium.launch({
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--disable-extensions'
    ]
});

let completedCycles = 0;
let totalClicks = 0;
let nativeAdClicks = 0;

for (let cycle = 1; cycle <= maxCycles; cycle++) {
    const profile = selectProfile(deviceType);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let proxyUrl = null;
    if (proxyConfiguration) {
        try {
            proxyUrl = await proxyConfiguration.newUrl(sessionId);
        } catch (err) {}
    }

    console.log(`\n===================================================================`);
    console.log(`=== [CYCLE #${cycle}/${maxCycles}] 1-VIEW SESSION | Device: ${profile.name} ===`);
    console.log(`===================================================================`);

    const contextOptions = {
        viewport: profile.viewport,
        userAgent: profile.userAgent,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        locale: 'en-US',
        timezoneId: 'America/New_York'
    };

    if (proxyUrl) {
        const u = new URL(proxyUrl);
        contextOptions.proxy = {
            server: `${u.protocol}//${u.host}`,
            username: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password)
        };
    }

    // Ephemeral, completely isolated context (1 cycle = 1 view simulation)
    const context = await browser.newContext(contextOptions);

    // Track any ad popunders or new tabs triggered by Adsterra / Social Bar
    const newTabs = [];
    context.on('page', (newPage) => {
        newTabs.push(newPage);
        console.log(`[+] AD POPUNDER / NEW TAB CAPTURED`);
    });

    const page = await context.newPage();

    // Stealth fingerprint protection
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
    });

    try {
        console.log(`[*] [1/4] Visiting target URL: ${targetUrl}...`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 50000 });
        await page.waitForTimeout(2000 + Math.random() * 1000);

        // -------------------------------------------------------------
        // Step 1: Natural Human Reading & Scrolling Simulation
        // -------------------------------------------------------------
        console.log(`[*] [2/4] Simulating natural reading & human scroll (${readDurationSec}s)...`);
        const startTime = Date.now();
        while (Date.now() - startTime < readDurationSec * 1000) {
            const scrollChunk = Math.floor(Math.random() * 320) + 180;
            await page.evaluate((step) => {
                window.scrollBy({ top: step, behavior: 'smooth' });
            }, scrollChunk);

            const readPause = Math.floor(Math.random() * 1800) + 1200;
            await page.waitForTimeout(readPause);

            if (Math.random() < 0.2) {
                await page.evaluate(() => window.scrollBy({ top: -80, behavior: 'smooth' }));
                await page.waitForTimeout(800);
            }
        }

        // -------------------------------------------------------------
        // Step 2: Target Selection (Randomized across ALL Page Targets)
        // -------------------------------------------------------------
        console.log(`[*] [3/4] Scanning page for interactive elements & native ads...`);

        // Specific Native Ad Selectors
        const nativeAdSelectors = [
            "[class*='social-bar']",
            "[id*='social-bar']",
            "[class*='ad-banner']",
            "[id*='ad-banner']",
            "[class*='native-ad']",
            "[class*='sponsored']",
            "[data-ad]",
            "a[href*='araplhn']",
            "a[href*='abscloud']",
            "a[href*='bauval']",
            "iframe[src*='ad']",
            "[class*='banner'] a",
            ".native-widget a"
        ];

        // Collect ALL visible native ads
        const visibleNativeAds = [];
        for (const selector of nativeAdSelectors) {
            try {
                const ads = await page.$$(selector);
                for (const ad of ads) {
                    if (await ad.isVisible()) {
                        visibleNativeAds.push(ad);
                    }
                }
            } catch (e) {}
        }

        // Standard interactive page elements
        const standardSelectors = [
            "button",
            ".btn",
            ".apply-btn",
            ".cta-button",
            "[role='button']",
            "input[type='submit']",
            "a.btn",
            "a[class*='btn']",
            "a[class*='apply']",
            "a[class*='card']"
        ];

        const visibleStandards = [];
        for (const selector of standardSelectors) {
            try {
                const elements = await page.$$(selector);
                for (const el of elements) {
                    if (await el.isVisible()) {
                        const txt = (await el.innerText() || '').trim().toLowerCase();
                        if (!['▲', 'top', 'x', 'close'].includes(txt)) {
                            visibleStandards.push(el);
                        }
                    }
                }
            } catch (e) {}
        }

        // Substantive links pool
        const substantiveLinks = [];
        try {
            const allLinks = await page.$$("a[href]");
            for (const link of allLinks) {
                if (await link.isVisible()) {
                    const href = (await link.getAttribute('href') || '').trim();
                    const txt = (await link.innerText() || '').trim().toLowerCase();
                    if (href && href !== '#' && !href.startsWith('javascript:') && !['▲', 'top', 'x', 'close', 'privacy', 'terms', 'report'].some(bad => txt.includes(bad) || href.includes(bad))) {
                        substantiveLinks.push(link);
                    }
                }
            }
        } catch (e) {}

        let targetElement = null;
        let isNativeAdTarget = false;

        // Roll probability for Native Ad targeting
        const roll = Math.random() * 100;
        if (roll < nativeAdChance && visibleNativeAds.length > 0) {
            targetElement = visibleNativeAds[Math.floor(Math.random() * visibleNativeAds.length)];
            isNativeAdTarget = true;
        }

        // If no native ad picked or none found: pick randomly from substantive elements / links
        if (!targetElement) {
            const pool = visibleStandards.length > 0 ? visibleStandards : substantiveLinks;
            if (pool.length > 0) {
                // Random element selection guarantees diverse, non-repeating clicks!
                targetElement = pool[Math.floor(Math.random() * pool.length)];
            }
        }

        // -------------------------------------------------------------
        // Step 3: Authentic Click & Ad Popunder Interception
        // -------------------------------------------------------------
        let clickedDestination = 'in-page';

        if (targetElement) {
            const tag = await targetElement.evaluate(el => el.tagName.toLowerCase());
            const textPreview = (await targetElement.innerText() || '').trim().slice(0, 35);
            const hrefPreview = (await targetElement.getAttribute('href') || '').slice(0, 50);

            await targetElement.scrollIntoViewIfNeeded();
            await page.waitForTimeout(600);

            if (isNativeAdTarget) {
                console.log(`[+] TRIGGERING NATIVE AD CLICK: <${tag}> "${textPreview}" -> ${hrefPreview || 'ad-widget'}`);
                nativeAdClicks++;
            } else {
                console.log(`[+] TRIGGERING RANDOM TARGET CLICK: <${tag}> "${textPreview}" -> ${hrefPreview || 'in-page'}`);
            }

            // Authentic click or touch tap based on active profile
            const box = await targetElement.boundingBox();
            if (box) {
                const clickX = box.x + box.width / 2;
                const clickY = box.y + box.height / 2;

                if (profile.hasTouch) {
                    await page.touchscreen.tap(clickX, clickY);
                } else {
                    await page.mouse.move(clickX, clickY, { steps: 5 });
                    await page.mouse.down();
                    await page.waitForTimeout(80);
                    await page.mouse.up();
                }
            } else {
                await targetElement.click();
            }

            totalClicks++;

            // Wait for popunder or ad redirect to resolve
            await page.waitForTimeout(3000);

            let activeAdTab = null;
            if (newTabs.length > 0) {
                activeAdTab = newTabs[newTabs.length - 1];
            } else if (context.pages().length > 1) {
                const pages = context.pages();
                activeAdTab = pages[pages.length - 1];
            }

            // ---------------------------------------------------------
            // Step 4: 10-Second Post-Click Dwell
            // ---------------------------------------------------------
            if (activeAdTab && activeAdTab !== page) {
                try {
                    await activeAdTab.waitForLoadState('domcontentloaded', { timeout: 12000 });
                } catch (e) {}
                clickedDestination = activeAdTab.url();
                console.log(`[+] AD TAB Active & Loaded: ${clickedDestination.slice(0, 85)}`);

                console.log(`[*] [4/4] Dwelling on clicked ad page for ${dwellSeconds}s...`);
                await activeAdTab.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
                await activeAdTab.waitForTimeout(dwellSeconds * 1000);
            } else {
                clickedDestination = page.url();
                console.log(`[*] [4/4] In-page target dwelling for ${dwellSeconds}s...`);
                await page.waitForTimeout(dwellSeconds * 1000);
            }

            console.log(`[✓] ${dwellSeconds}-second post-click dwell complete.`);
        } else {
            console.log(`[*] No clickable element found on this pass. Dwelling 5s on page.`);
            await page.waitForTimeout(5000);
        }

        completedCycles++;

        // Push cycle telemetry to Apify Dataset
        await Actor.pushData({
            cycle: cycle,
            targetUrl: targetUrl,
            device: profile.name,
            isMobile: profile.isMobile,
            isNativeAd: isNativeAdTarget,
            destination: clickedDestination,
            dwellSeconds: dwellSeconds,
            timestamp: new Date().toISOString()
        });

    } catch (cycleError) {
        console.error(`[!] Cycle #${cycle} encountered error: ${cycleError.message}`);
    } finally {
        // -------------------------------------------------------------
        // Step 5: 100% Request, Storage & Profile Wipe
        // -------------------------------------------------------------
        await context.close();
        console.log(`[*] Context closed: 100% cookies, cache, local storage & session wiped clean.`);
    }

    const cooldown = Math.floor(Math.random() * 3) + 2;
    await new Promise(r => setTimeout(r, cooldown * 1000));
}

await browser.close();

console.log('\n===================================================================');
console.log(`[✓] Full Run Complete!`);
console.log(`>> Total Cycles: ${completedCycles}/${maxCycles}`);
console.log(`>> Total Clicks: ${totalClicks} (Native Ads: ${nativeAdClicks})`);
console.log(`>> All sessions executed as ephemeral single-view simulations.`);
console.log('===================================================================');

await Actor.exit();
