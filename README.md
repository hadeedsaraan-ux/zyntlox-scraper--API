# 🤖 Zyntlox AI & RAG Documentation Scraper

> **The Token-Optimized Knowledge Extractor for LLMs, RAG Pipelines, and AI Coding Agents.** 
> Stop feeding messy, bloated HTML, navbars, and cookie banners into your AI context window. Extract pure semantic markdown instantly.

---

## 🛑 The Problem: Why Standard Scrapers Fail AI
Most web scrapers were built for traditional SEO auditing or data archiving. When used for **RAG (Retrieval-Augmented Generation)** or feeding documentation to LLMs (like Claude, GPT-4, or Cursor), they introduce massive friction:
- **Token Bloat:** Sending thousands of tokens of useless navigation links, footers, and scripts, spiking your API bills.
- **Garbage Chunks:** Vector databases get polluted with cookie consents, ads, and invisible layout wrappers.
- **Anti-Bot Walls:** Standard scripts get instantly blocked by Cloudflare and advanced bot protections.

---

## ✨ The Zyntlox Solution
Zyntlox is engineered from the ground up specifically for **AI Engineers and RAG Developers**. It acts as a smart middleware that cleans, sanitizes, and structures web data before it touches your LLM.

### 📊 Before vs. After Zyntlox

| Metric / Element | Standard Scraper (e.g., Firecrawl / Basic Puppeteer) | Zyntlox AI Scraper |
| :--- | :--- | :--- |
| **Output Type** | Raw HTML or bloated Markdown with sidebars & footers. | 100% Pure Semantic Markdown (Noise-Free). |
| **Banners & Popups** | Often captured in screenshots or leaks into text chunks. | **Universal Popup Killer** automatically strips fixed/sticky overlays. |
| **Token Efficiency** | Low (High risk of hitting LLM context limits). | **High** (Strips scripts, styles, nav, footers, and forms by default). |
| **Metadata Map** | Basic title and description. | Rich AI-Context Map (H1/H2 Headings, Image counts, Canonical URLs). |

---

## 🚀 Key Features
- **Semantic Markdown Extraction:** Converts complex tech docs, wikis, and articles into clean, LLM-ready markdown.
- **Stealth Anti-Detection:** Uses advanced `puppeteer-extra-plugin-stealth` evasions and human-like delays to bypass strict bot filters.
- **Smart Popup Eraser:** Dynamically detects and destroys fixed/sticky elements and cookie consents prior to processing.
- **Structured AI Metadata:** Returns exact heading hierarchies (`h1`, `h2`) to help AI agents understand page structure instantly.
- **Optional Clean Screenshots:** Generates popup-free full screenshots *only* when requested, saving memory and processing bandwidth.

---

## 📦 Input Schema (Apify Actor)

When running Zyntlox on Apify, pass the following JSON input:

```json
{
  "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
  "includeScreenshot": false
}
Field	Type	Default	Description
url	String	Required	The target documentation or webpage URL.
includeScreenshot	Boolean	false	Set to true if you need a popup-free visual screenshot.
{
  "success": true,
  "source_url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
  "metadata": {
    "title": "Artificial intelligence - Wikipedia",
    "headings": {
      "h1": ["Artificial intelligence"],
      "h2": ["Goals", "Techniques", "Applications", "Ethics"]
    },
    "linksCount": 5792,
    "imagesCount": 43
  },
  "markdown_content": "# Artificial intelligence..."
}
