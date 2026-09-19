const { Actor } = require('apify');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

puppeteer.use(StealthPlugin());
const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

Actor.main(async () => {
    // 1. Get input from Apify UI or API call
    const input = await Actor.getInput();
    const { url, includeScreenshot = false } = input || {};

    if (!url) {
        throw new Error('Parameter "url" is required!');
    }

    console.log(`Starting secure scrape for: ${url}`);

    // 2. Use Apify's built-in automatic proxy configuration
    const proxyConfiguration = await Actor.createProxyConfiguration();
    let proxyUrl = undefined;
    if (proxyConfiguration) {
        proxyUrl = await proxyConfiguration.newUrl();
    }

    const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800'
    ];

    if (proxyUrl) {
        launchArgs.push(`--proxy-server=${proxyUrl}`);
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: launchArgs
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Advanced Anti-Detection Traces
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        // Handle heavy JS websites safely
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Universal Popup & Banner Killer
        await page.evaluate(() => {
            document.querySelectorAll('*').forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky' || parseInt(style.zIndex) > 90) {
                    el.remove();
                }
            });
        });

        let screenshotData = null;
        // Conditional Screenshot (Only if requested by developer to save memory/tokens)
        if (includeScreenshot === true || includeScreenshot === 'true') {
            const screenshot = await page.screenshot({ encoding: 'base64' });
            screenshotData = `data:image/png;base64,${screenshot}`;
        }

        const html = await page.content();
        const $ = cheerio.load(html);

        // Rich Metadata for AI context mapping
        const metadata = {
            title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
            description: $('meta[name="description"]').attr('content') || '',
            headings: {
                h1: $('h1').map((i, el) => $(el).text().trim()).get(),
                h2: $('h2').map((i, el) => $(el).text().trim()).get()
            },
            linksCount: $('a[href]').length,
            imagesCount: $('img').length,
            canonical: $('link[rel="canonical"]').attr('href') || ''
        };

        // Heavy Noise Cancellation for AI / RAG Pipelines
        $('script, style, nav, footer, header, svg, iframe, noscript, form, .cookie-banner, #cookie-consent').remove();
        const cleanMarkdown = turndownService.turndown($.html()).substring(0, 25000);

        await browser.close();

        const finalOutput = {
            success: true,
            source_url: url,
            metadata: metadata,
            markdown_content: cleanMarkdown,
            ...(screenshotData && { screenshot: screenshotData }) // Include screenshot only if generated
        };

        // 3. Save output to Apify's default dataset (accessible via API / MCP)
        await Actor.pushData(finalOutput);
        console.log('Scraping successfully finished and data pushed!');

    } catch (error) {
        await browser.close();
        throw error;
    }
});
