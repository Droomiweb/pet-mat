const cheerio = require('cheerio');

// --- HELPER: Scrape Amazon (Copy of logic from route.js) ---
const scrapeAmazon = async (query) => {
    try {
        console.log(`Testing Amazon Scrape for: ${query}`);
        const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        };

        const response = await fetch(searchUrl, { headers });
        console.log(`Amazon Response Status: ${response.status}`);

        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        const product = $('div[data-component-type="s-search-result"]').first();

        if (!product.length) {
            console.log("Amazon: No products found selectors.");
            return null;
        }

        const title = product.find('h2 a span').text().trim();
        const priceWhole = product.find('.a-price-whole').first().text().trim();
        const priceSymbol = product.find('.a-price-symbol').first().text().trim();

        console.log(`Amazon Found: ${title?.substring(0, 30)}... | ${priceSymbol}${priceWhole}`);

        if (!title || !priceWhole) return null;

        return { source: 'Amazon', title, price: `${priceSymbol}${priceWhole}` };
    } catch (e) {
        console.error("Amazon Scrape Error:", e.message);
        return null;
    }
};

// --- HELPER: Scrape Flipkart (Copy of logic from route.js) ---
const scrapeFlipkart = async (query) => {
    try {
        console.log(`Testing Flipkart Scrape for: ${query}`);
        const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        };

        const response = await fetch(searchUrl, { headers });
        console.log(`Flipkart Response Status: ${response.status}`);

        if (!response.ok) return null;

        const html = await response.text();
        const $ = cheerio.load(html);

        let product = $('div._1AtVbE').find('div[data-id]').first();
        if (!product.length) product = $('div._75nlfW').first();

        const title = product.find('div._4rR01T').text().trim() || product.find('a.s1Q9rs').text().trim();
        const price = product.find('div._30jeq3').text().trim();

        console.log(`Flipkart Found: ${title?.substring(0, 30)}... | ${price}`);

        if (!title || !price) return null;

        return { source: 'Flipkart', title, price };

    } catch (e) {
        console.error("Flipkart Scrape Error:", e.message);
        return null;
    }
}

async function runTest() {
    console.log("--- STARTING SCRAPE TEST ---");
    await scrapeAmazon("Royal Canin Puppy Food");
    await scrapeFlipkart("Pedigree Dog Food");
    console.log("--- TEST COMPLETE ---");
}

runTest();
