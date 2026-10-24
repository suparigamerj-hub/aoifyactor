# Autonomous Viewport & Adsterra Popunder Engine (Apify Actor v2.0)

A high-fidelity cloud-native Apify Actor designed to run single-view browsing simulations using Apify's residential proxy pool. Emulates natural human reading, smooth scrolling, intelligent native ad / popunder detection, 10-second dwell time, and 100% request/profile purging.

---

### Key Capabilities

1. **Apify Residential Proxies:** 
   - Uses `Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'], countryCodes: [...] })`.
   - Each session runs through a unique residential IP from Tier-1 geos (`US`, `GB`, `DE`, `FR`, `CA`, `NL`, `AU`, `JP`, `SG`). Zero external proxy setup required.

2. **Mobile & Desktop OS Emulation:**
   - **Desktop:** Windows 11 / Chrome 128, Windows 11 / Edge, macOS Sonoma / Safari.
   - **Mobile:** Apple iPhone 15 Pro (Safari / iOS 17), Samsung Galaxy S24 (Chrome Mobile / Android 14), Google Pixel 8 Pro.
   - Genuine touch events (`touchscreen.tap`), mobile viewport sizing, and authentic `isMobile: true` navigator properties.

3. **Human Reading & Smooth Scroll Simulation:**
   - Simulates human behavior with smooth variable-speed scrolling, realistic pauses (1.5s to 3s reading time), and occasional micro-scrolls.

4. **Native Ad & Popunder Click Engine:**
   - Configurable **Native Ad Probability** (`nativeAdChance`: default 40%).
   - Specifically targets Adsterra native banners, Social Bar in-page notifications, floating widgets, and sponsored cards (`[class*='social-bar']`, `a[href*='araplhn']`, `a[href*='abscloud']`, etc.).
   - Intercepts popunders and new window redirects via `context.on('page')`.

5. **10-Second Post-Click Dwell & 100% Request Wipe:**
   - Dwells on the clicked ad tab or page for 10 seconds.
   - At 10s, closes the context: 100% wipes cookies, cache, local storage, indexedDB, and session history.
   - Every cycle is an ephemeral 1-view simulation.

---

### Input Schema Options in Apify Console

| Option | Type | Default | Description |
|---|---|---|---|
| `targetUrl` | String | `https://velvetx.masterverse.in/` | Destination website URL |
| `deviceType` | Select | `mixed` | Choose `desktop`, `mobile`, or `mixed` |
| `proxyTier` | Select | `RESIDENTIAL` | Apify Residential pool |
| `countryCodes` | Array | `["US", "GB", "DE", "FR", "CA"]` | Tier-1 country geos to rotate across |
| `dwellSeconds` | Number | `10` | Post-click dwell duration on ad |
| `nativeAdChance`| Number | `40` | Percentage probability to click native ads vs CTAs |
| `readDurationSec`| Number | `8` | Time spent naturally reading/scrolling before click |
| `maxCycles` | Number | `30` | Number of isolated single-view runs |

---

### How to Push to GitHub & Link to Apify

#### Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g. `apify-ad-viewport-bot`).
3. Set visibility to **Public** or **Private** (Apify supports both).
4. Do not initialize with README (we already have it). Click **Create repository**.

#### Step 2: Push Local Code to GitHub
Run the following in PowerShell/terminal inside `c:\Users\reder\.gemini\antigravity-ide\scratch\apify_ad_actor`:
```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/apify-ad-viewport-bot.git
git branch -M main
git push -u origin main
```

#### Step 3: Link GitHub Repo to Apify
1. Go to [console.apify.com/actors](https://console.apify.com/actors).
2. Click **Create new** -> Choose **GitHub repository**.
3. Select your GitHub repository (`apify-ad-viewport-bot`).
4. Click **Create**. Apify automatically builds the Docker container from your repo!
5. Whenever you push new code to GitHub, Apify automatically rebuilds and updates the actor.
