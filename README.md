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

## 🚀 Key Features
- **Semantic Markdown by Default:** Clean text chunks ready for vector embeddings.
- **Universal Overlay Removal:** Drops sticky/fixed banners before parsing.
- **Rich Metadata:** Extracts page titles, canonical URLs, and heading maps.
- **Conditional Screenshots:** Generates clean full-page base64 screenshots only when requested.
