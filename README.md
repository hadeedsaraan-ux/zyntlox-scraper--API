# 🤖 Zyntlox AI & RAG Documentation Scraper

> **Token-Optimized Knowledge Extractor for LLMs and RAG Pipelines.** 
> Cleans raw webpage noise, removes overlays, and outputs pure semantic markdown along with structured heading maps.

---

## 🛑 The Challenge with Raw Web Pages for LLMs
When ingesting web pages directly into AI models (ChatGPT, Claude, Cursor), raw HTML creates massive problems:
- **High Token Costs:** Navigation menus, footers, tracking scripts, and cookie banners bloat context windows.
- **Polluted Vector Search:** Chunky data containing UI text and cookie alerts causes poor RAG retrieval.

---

## ✨ The Zyntlox Pipeline (Raw Web vs Clean Output)

| Feature / Data Element | Raw Webpage Ingestion | Zyntlox Clean Extraction |
| :--- | :--- | :--- |
| **Document Content** | Unstructured text mixed with ads, navbars, and CSS wrappers. | **Clean, semantic Markdown** containing only meaningful page content. |
| **Floating Overlays** | Cookie banners and popups often leak into extracted text. | **Universal Popup Killer** automatically detects and removes overlays. |
| **Token Efficiency** | Heavy (high token usage). | **Optimized** (strips scripts, styles, forms, and footers). |
| **Page Hierarchy** | Messy DOM structure. | Structured `h1` and `h2` heading maps in JSON metadata. |

---

## 🛡️ Proxy & Anti-Bot Architecture: What You Need to Know
To ensure transparent runs and **save your compute credits**, Zyntlox operates with a **Fail-Early** philosophy:

- **Standard Websites, Docs, Wikis & Blogs:** Run smoothly using standard connection or default Datacenter Proxies.
- **Strict Anti-Bot Websites (Cloudflare, G2, PerimeterX):** Datacenter IPs are automatically flagged by strict bot shields. If an unpassable challenge is detected, Zyntlox **terminates immediately** to prevent burning your monthly compute units.
- **To scrape strict websites:** Enable **Apify Residential Proxies** in your run configuration. Residential IPs route through real home networks and reliably unlock protected data when combined with our stealth engine.

---
## 🚀 Key Features
- **Semantic Markdown by Default:** Clean text chunks ready for vector embeddings.
- **Universal Overlay Removal:** Drops sticky/fixed banners before parsing.
- **Rich Metadata:** Extracts page titles, canonical URLs, and heading maps.
- **Conditional Screenshots:** Generates clean full-page base64 screenshots only when requested.
