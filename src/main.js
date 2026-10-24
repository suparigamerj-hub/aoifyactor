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
console.log('>> Apify Adsterra Monetization & Viewport Bot (v2.2)');
console.log(`>> Target URL: ${targetUrl}`);
console.log(`>> Device Mode: ${deviceType.toUpperCase()}`);
console.log(`>> Post-Click Dwell: ${dwellSeconds}s | Native Ad Chance: ${nativeAdChance}%`);
console.log(`>> Total Single-View Sessions: ${maxCycles}`);
console.log('===================================================================');

// 1. Initialize Apify Residential / Datacenter Proxy Pool
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
    console.warn(`[!] Residential proxy note: ${e.message}. Using standard pool fallback...`);
    try {
        proxyConfiguration = await Actor.createProxyConfiguration();
    } catch (e2) {
        console.warn(`[!] Direct connection fallback: ${e2.message}`);
    }
}

// 2. High-Trust Device Fingerprint Profiles
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
    return Math.random() < 0.5
        ? MOBILE_PROFILES[Math.floor(Math.random() * MOBILE_PROFILES.length)]
        : DESKTOP_PROFILES[Math.floor(Math.random() * DESKTOP_PROFILES.length)];
}

// 3. Launch Master Chromium Engine
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
let totalAdsterraClicks = 0;
let popundersCaptured = 0;

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

    // Ephemeral, completely isolated context (1 cycle = 1 unique view simulation)
    const context = await browser.newContext(contextOptions);

    // Track all newly spawned popunders / smartlink tabs
    const newTabs = [];
    context.on('page', (newPage) => {
        newTabs.push(newPage);
        console.log(`[+] ADSTERRA POPUNDER / AD TAB INTERCEPTED`);
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
        await page.waitForTimeout(2500 + Math.random() * 1000);

        // -------------------------------------------------------------
        // Step 1: Human Reading & Smooth Scroll Simulation
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

            if (Math.random() < 0.25) {
                await page.evaluate(() => window.scrollBy({ top: -100, behavior: 'smooth' }));
                await page.waitForTimeout(800);
            }
        }

        // Pre-click human interaction: interact with loan slider to establish authentic user behavior
        try {
            const principalInput = await page.$('#calcPrincipal');
            if (principalInput && Math.random() < 0.7) {
                const randomAmount = Math.floor(Math.random() * 30000) + 15000;
                await page.evaluate((amt) => {
                    const el = document.getElementById('calcPrincipal');
                    if (el) {
                        el.value = amt;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, randomAmount);
                await page.waitForTimeout(1000);
            }
        } catch (e) {}

        // -------------------------------------------------------------
        // Step 2: ADSTERRA TARGET SELECTION (Dedicated Monetization Engine)
        // -------------------------------------------------------------
        console.log(`[*] [3/4] Scanning for Adsterra ad placements & smartlinks...`);

        // Pool of explicit Adsterra target candidates on VelvetX
        const adsterraCandidates = [];

        // Candidate Type 1: Adsterra Social Bar (In-page push notifications / floating banners)
        const socialBarSelectors = [
            "[class*='social-bar']",
            "[id*='social-bar']",
            "[id^='sb-']",
            "[class*='toast']",
            "div[style*='z-index: 2147483647']",
            "[data-sb]"
        ];
        for (const selector of socialBarSelectors) {
            try {
                const items = await page.$$(selector);
                for (const item of items) {
                    if (await item.isVisible()) {
                        adsterraCandidates.push({
                            type: 'Adsterra Social Bar',
                            element: item,
                            label: 'Social Bar Floating Ad'
                        });
                    }
                }
            } catch (e) {}
        }

        // Candidate Type 2: Adsterra Native Banner Container
        try {
            const nativeBanner = await page.$("#container-13e8b8f593a1fa3217160e0ed819046b, #adsterra-top-native");
            if (nativeBanner && await nativeBanner.isVisible()) {
                // Check if iframe or links inside
                const bannerLinks = await nativeBanner.$$('a, iframe');
                if (bannerLinks.length > 0) {
                    adsterraCandidates.push({
                        type: 'Adsterra Native Banner Unit',
                        element: bannerLinks[0],
                        label: 'Native Banner Unit'
                    });
                }
            }
        } catch (e) {}

        // Candidate Type 3: Adsterra Native Recommendation Cards
        try {
            const nativeCards = await page.$$('#adsterra-native-recommendations a.native-ad-item');
            for (let i = 0; i < nativeCards.length; i++) {
                const card = nativeCards[i];
                if (await card.isVisible()) {
                    const title = (await card.$eval('.native-ad-title', el => el.innerText).catch(() => 'Native Offer')).trim();
                    adsterraCandidates.push({
                        type: 'Adsterra Native Card',
                        element: card,
                        label: `Native Card: "${title.slice(0, 35)}"`
                    });
                }
            }
        } catch (e) {}

        // Candidate Type 4: Sponsored Box Direct CTA ("View Special Rates →")
        try {
            const sponsoredCta = await page.$('.adsterra-sponsored-box a.ad-cta-btn');
            if (sponsoredCta && await sponsoredCta.isVisible()) {
                adsterraCandidates.push({
                    type: 'Adsterra Sponsored CTA',
                    element: sponsoredCta,
                    label: 'Sponsored Box CTA (View Special Rates)'
                });
            }
        } catch (e) {}

        // Candidate Type 5: Finance Cards Apply Buttons ("Check Rate" / "Apply Securely")
        try {
            const cardApplyBtns = await page.$$('.finance-card .btn-apply');
            for (let i = 0; i < cardApplyBtns.length; i++) {
                const btn = cardApplyBtns[i];
                if (await btn.isVisible()) {
                    const btnText = (await btn.innerText() || '').trim();
                    adsterraCandidates.push({
                        type: 'Adsterra Card CTA',
                        element: btn,
                        label: `Card Button #${i + 1} (${btnText})`
                    });
                }
            }
        } catch (e) {}

        // Candidate Type 6: Header CTA Button ("Check My Rate")
        try {
            const headerCta = await page.$('header a.cta-btn');
            if (headerCta && await headerCta.isVisible()) {
                adsterraCandidates.push({
                    type: 'Adsterra Header CTA',
                    element: headerCta,
                    label: 'Header CTA (Check My Rate)'
                });
            }
        } catch (e) {}

        // Candidate Type 7: Hero Pre-Qualification Button ("Unlock Pre-Qualified Offers")
        try {
            const heroBtn = await page.$('button[onclick*="triggerMatchingOffers"]');
            if (heroBtn && await heroBtn.isVisible()) {
                adsterraCandidates.push({
                    type: 'Adsterra Hero Trigger',
                    element: heroBtn,
                    label: 'Hero Button (Unlock Pre-Qualified Offers)'
                });
            }
        } catch (e) {}

        console.log(`[+] Found ${adsterraCandidates.length} eligible Adsterra target placements on page.`);

        // Pick one Adsterra candidate uniformly at random to ensure diverse rotation
        let selectedTarget = null;
        if (adsterraCandidates.length > 0) {
            selectedTarget = adsterraCandidates[Math.floor(Math.random() * adsterraCandidates.length)];
        }

        let clickedPlacementLabel = 'Page Click (Popunder Trigger)';

        if (selectedTarget) {
            clickedPlacementLabel = `${selectedTarget.type} -> ${selectedTarget.label}`;
            console.log(`[+] TARGETING ADSTERRA: [${selectedTarget.type}] "${selectedTarget.label}"`);

            await selectedTarget.element.scrollIntoViewIfNeeded();
            await page.waitForTimeout(600);

            // Execute authentic click / touch tap
            const box = await selectedTarget.element.boundingBox();
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
                await selectedTarget.element.click();
            }

            totalAdsterraClicks++;
        } else {
            // Fallback: Click on main viewport body to guarantee Adsterra Popunder trigger
            console.log(`[*] Clicking viewport body to activate Adsterra Popunder listener...`);
            await page.mouse.click(250, 300);
            totalAdsterraClicks++;
        }

        // Wait for Adsterra Popunder or Smartlink new tab to spawn and begin redirect chain
        console.log(`[*] Waiting for Adsterra redirect chain to resolve...`);
        await page.waitForTimeout(4000);

        // -------------------------------------------------------------
        // Step 3: INTERCEPT AD TAB & RESOLVE ADSTERRA REDIRECT CHAIN
        // -------------------------------------------------------------
        let activeAdTab = null;
        if (newTabs.length > 0) {
            activeAdTab = newTabs[newTabs.length - 1];
        } else if (context.pages().length > 1) {
            const pages = context.pages();
            activeAdTab = pages[pages.length - 1];
        }

        let is404DeadTab = false;
        let finalAdUrl = '';

        if (activeAdTab && activeAdTab !== page) {
            popundersCaptured++;
            console.log(`[+] ADSTERRA AD TAB ACTIVE: Initial URL: ${activeAdTab.url().slice(0, 85)}`);

            // Wait for JS trampoline / document.forms[0].submit() to navigate to final advertiser
            try {
                await activeAdTab.waitForLoadState('domcontentloaded', { timeout: 12000 });
            } catch (e) {}

            await activeAdTab.waitForTimeout(3000);

            finalAdUrl = activeAdTab.url();
            const tabTitle = await activeAdTab.title().catch(() => '');
            const bodyContent = await activeAdTab.evaluate(() => document.body ? document.body.innerText.slice(0, 200) : '').catch(() => '');

            // Detect if ad network dropped with 404 or nginx error
            if (
                finalAdUrl.includes('404') ||
                tabTitle.includes('404') ||
                bodyContent.includes('404 Not Found') ||
                bodyContent.includes('nginx')
            ) {
                is404DeadTab = true;
                console.warn(`[!] Ad destination returned 404/nginx for this IP. Closing dead tab cleanly.`);
                await activeAdTab.close().catch(() => {});
                activeAdTab = null;
            } else {
                console.log(`[✓] ADSTERRA ADVERTISED OFFER RESOLVED: ${finalAdUrl.slice(0, 85)} (Title: "${tabTitle.slice(0, 30)}")`);
            }
        }

        // -------------------------------------------------------------
        // Step 4: 10-SECOND HIGH-ENGAGEMENT DWELL
        // -------------------------------------------------------------
        if (activeAdTab && !is404DeadTab && activeAdTab !== page) {
            console.log(`[*] [4/4] Dwelling on active Adsterra ad offer for ${dwellSeconds}s (performing natural human scroll)...`);
            try {
                const adDwellChunk = Math.floor((dwellSeconds * 1000) / 3);
                for (let i = 0; i < 3; i++) {
                    await activeAdTab.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
                    await activeAdTab.waitForTimeout(adDwellChunk);
                }
            } catch (e) {}
            console.log(`[✓] ${dwellSeconds}-second Adsterra ad dwell complete.`);
        } else {
            console.log(`[*] [4/4] Dwelling on target page for ${dwellSeconds}s (reading & maintaining session length)...`);
            const targetDwellChunk = Math.floor((dwellSeconds * 1000) / 3);
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => window.scrollBy({ top: 150, behavior: 'smooth' }));
                await page.waitForTimeout(targetDwellChunk);
            }
            console.log(`[✓] ${dwellSeconds}-second page dwell complete.`);
        }

        completedCycles++;

        // Push cycle telemetry to Apify Dataset
        await Actor.pushData({
            cycle: cycle,
            targetUrl: targetUrl,
            device: profile.name,
            isMobile: profile.isMobile,
            adsterraPlacement: clickedPlacementLabel,
            popunderCaptured: !!activeAdTab && !is404DeadTab,
            adDestinationUrl: (!is404DeadTab && finalAdUrl) ? finalAdUrl : 'in-page-popunder-triggered',
            dwellSeconds: dwellSeconds,
            status: 'monetized_view',
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
console.log(`>> Total Completed Cycles: ${completedCycles}/${maxCycles}`);
console.log(`>> Adsterra Units Targeted: ${totalAdsterraClicks} (Popunders/Tabs Captured: ${popundersCaptured})`);
console.log(`>> All sessions executed as ephemeral single-view simulations.`);
console.log('===================================================================');

await Actor.exit();
