const { Actor } = require('apify');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

// Stealth setup
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.runtime');
puppeteer.use(stealth);

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;
const NAV_TIMEOUT_MS = 25000;
const SETTLE_TIMEOUT_MS = 2500;
const SCROLL_MAX_MS = 6000;
const SCROLL_MAX_PX = 35000;
const SCROLL_HARD_LIMIT_MS = 10000;

async function autoScroll(page) {
    const scrolling = page.evaluate(
        async (maxMs, maxPx) => {
            await new Promise((resolve) => {
                const startedAt = Date.now();
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    const reachedBottom = totalHeight >= scrollHeight - window.innerHeight;
                    const hitPixelCap = totalHeight >= maxPx;
                    const hitTimeCap = Date.now() - startedAt > maxMs;

                    if (reachedBottom || hitPixelCap || hitTimeCap) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 40);
            });
        },
        SCROLL_MAX_MS,
        SCROLL_MAX_PX
    );

    await Promise.race([
        scrolling,
        new Promise((resolve) => setTimeout(resolve, SCROLL_HARD_LIMIT_MS)),
    ]).catch(() => {});
}

async function stripHiddenElements(page) {
    await page.evaluate(() => {
        const isHidden = (el) => {
            let node = el;
            while (node && node.nodeType === 1) {
                const style = window.getComputedStyle(node);
                if (
                    style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    parseFloat(style.opacity) === 0
                ) {
                    return true;
                }
                node = node.parentElement;
            }
            if (window.getComputedStyle(el).display === 'contents') return false;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return true;
            return false;
        };

        const NEVER_RENDERED_BY_DESIGN = new Set(['title', 'desc']);
        document.querySelectorAll('body *').forEach((el) => {
            if (NEVER_RENDERED_BY_DESIGN.has(el.tagName.toLowerCase())) return;
            if (isHidden(el)) el.remove();
        });

        document.querySelectorAll('[data-scrape-ignore]').forEach((el) => el.remove());
    }).catch(() => {});
}

async function extractDomFacts(page) {
    return page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
            img.loading = 'eager';
        });

        const pendingImages = Array.from(document.querySelectorAll('img')).filter((img) => !img.complete);
        await Promise.all(
            pendingImages.map(
                (img) =>
                    new Promise((resolve) => {
                        img.addEventListener('load', resolve, { once: true });
                        img.addEventListener('error', resolve, { once: true });
                        setTimeout(resolve, 1500);
                    })
            )
        );

        const allImgElements = Array.from(document.querySelectorAll('img'));
        const images = allImgElements.map((img) => ({
            src: img.currentSrc || img.src || '',
            alt: img.hasAttribute('alt') ? img.getAttribute('alt') : null,
            hasAltAttribute: img.hasAttribute('alt'),
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
        }));

        const accessibleNameOf = (a) => {
            const text = (a.textContent || '').trim();
            if (text) return text;
            const ariaLabel = (a.getAttribute('aria-label') || '').trim();
            if (ariaLabel) return ariaLabel;
            const title = (a.getAttribute('title') || '').trim();
            if (title) return title;
            const descendantWithLabel = a.querySelector('[aria-label]');
            if (descendantWithLabel) {
                const descendantLabel = (descendantWithLabel.getAttribute('aria-label') || '').trim();
                if (descendantLabel) return descendantLabel;
            }
            const innerImg = a.querySelector('img[alt]');
            if (innerImg) {
                const innerAlt = (innerImg.getAttribute('alt') || '').trim();
                if (innerAlt) return innerAlt;
            }
            const innerSvgTitle = a.querySelector('svg title');
            if (innerSvgTitle) {
                const svgTitleText = (innerSvgTitle.textContent || '').trim();
                if (svgTitleText) return svgTitleText;
            }
            return '';
        };

        const links = Array.from(document.querySelectorAll('a[href]')).map((a) => ({
            href: a.href,
            accessibleName: accessibleNameOf(a),
        }));

        return { images, links };
    }).catch(() => ({ images: [], links: [] }));
}

Actor.main(async () => {
    const input = await Actor.getInput();
    const { url, includeScreenshot = false, maxHeight = 0 } = input || {};

    if (!url) {
        throw new Error('Please provide a "url" input parameter.');
    }

    console.log(`Zyntlox Actor starting extraction for: ${url}`);

    const proxyConfiguration = await Actor.createProxyConfiguration();
    let proxyUrl = undefined;
    if (proxyConfiguration) {
        proxyUrl = await proxyConfiguration.newUrl();
    }

    let browser = null;
    let navWarning = null;

    try {
        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-infobars',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,800'
        ];

        if (proxyUrl) {
            launchArgs.push(`--proxy-server=${proxyUrl}`);
        }

        // Fix: Use Apify pre-installed Chrome executable path
        const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH 
            || process.env.APIFY_CHROME_EXECUTABLE_PATH 
            || '/usr/bin/google-chrome-stable' 
            || '/usr/bin/chromium';

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: chromePath,
            args: launchArgs,
        });

        const page = await browser.newPage();
        await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

        // Human-like behavior spoofing
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page
            .goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
            .catch((err) => {
                navWarning = `Navigation did not complete cleanly: ${err.message}`;
            });

        if (page.url() === 'about:blank') {
            throw new Error(`Could not load ${url}. ${navWarning || 'The page never navigated.'}`);
        }

        await page.waitForNetworkIdle({ idleTime: 500, timeout: SETTLE_TIMEOUT_MS }).catch(() => {});

        await autoScroll(page);
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Kill Banners & Overlays
        await page.evaluate(() => {
            const EXACT_SELECTOR = '#onetrust-consent-sdk, #CybotCookiebotDialog, .cc-window, .osano-cm-window';
            const KEYWORD_SELECTOR = '[class*="cookie" i], [id*="cookie" i], [class*="consent" i], [id*="consent" i], [class*="gdpr" i], [id*="gdpr" i], [aria-label*="cookie" i]';

            document.querySelectorAll(EXACT_SELECTOR).forEach((el) => {
                el.style.setProperty('display', 'none', 'important');
            });

            document.querySelectorAll(KEYWORD_SELECTOR).forEach((el) => {
                if (el.tagName === 'A') return;
                const position = window.getComputedStyle(el).position;
                if (position === 'fixed' || position === 'sticky') {
                    el.style.setProperty('display', 'none', 'important');
                }
            });
        }).catch(() => {});

        let screenshotBase64 = null;
        if (includeScreenshot === true || includeScreenshot === 'true') {
            const screenshotOptions = { encoding: 'base64', type: 'png' };
            const numMaxHeight = Math.max(0, Number(maxHeight) || 0);
            if (numMaxHeight > 0) {
                const fullHeight = await page.evaluate(
                    () => document.documentElement.scrollHeight || document.body.scrollHeight || 0
                );
                const clipHeight = Math.min(fullHeight || VIEWPORT_HEIGHT, numMaxHeight);
                if (clipHeight > 0) {
                    screenshotOptions.clip = { x: 0, y: 0, width: VIEWPORT_WIDTH, height: clipHeight };
                    screenshotOptions.captureBeyondViewport = true;
                } else {
                    screenshotOptions.fullPage = true;
                }
            } else {
                screenshotOptions.fullPage = true;
            }
            const base64Img = await page.screenshot(screenshotOptions);
            screenshotBase64 = `data:image/png;base64,${base64Img}`;
        }

        await stripHiddenElements(page);

        const domFacts = await extractDomFacts(page);
        const rawHtml = await page.content();
        const $ = cheerio.load(rawHtml);

        const robots = [
            $('meta[name="robots"]').attr('content') || '',
            $('meta[name="googlebot"]').attr('content') || '',
        ].filter(Boolean).join(', ');

        const metadata = {
            title: $('title').first().text().trim() || '',
            description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
            has_viewport: $('meta[name="viewport"]').length > 0,
            has_canonical: $('link[rel="canonical"]').length > 0,
            canonical_url: $('link[rel="canonical"]').attr('href') || '',
            robots: robots,
            is_noindex: /\bnoindex\b/i.test(robots),
            lang: $('html').attr('lang') || '',
            h1_count: $('h1').length,
            total_images: $('img').length,
            is_https: url.startsWith('https'),
        };

        let hasNewsSchema = false;
        let hasProductSchema = false;
        let structuredAddress = null;

        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const text = $(el).text();
                if (!text) return;
                const json = JSON.parse(text);
                const str = JSON.stringify(json).toLowerCase();
                if (str.includes('newsarticle')) hasNewsSchema = true;
                if (str.includes('"product"') || str.includes('"offer"')) hasProductSchema = true;
            } catch {}
        });

        const hasCommerceButtons = $('button, a').toArray().some(el => {
            const text = $(el).text().toLowerCase();
            return /\b(add to (cart|bag)|buy (now|it)|checkout)\b/i.test(text);
        });

        $('script, style, iframe, noscript').remove();
        $('svg').replaceWith('<span>[SVG Icon]</span>');

        const cleanedHtml = $.html();
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(cleanedHtml);

        await browser.close();
        browser = null;

        const resultPayload = {
            success: true,
            source_url: url,
            markdown: markdown,
            metadata: metadata,
            images: domFacts.images,
            links: domFacts.links,
            commerceSignals: { hasProductSchema, hasNewsSchema, hasCommerceButtons },
            warning: navWarning,
            ...(screenshotBase64 && { screenshot: screenshotBase64 })
        };

        await Actor.pushData(resultPayload);
        console.log('Zyntlox Actor successfully finished and pushed results!');

    } catch (error) {
        if (browser) await browser.close();
        throw new Error(`Scraping failed: ${error.message}`);
    }
});
