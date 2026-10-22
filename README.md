# Wayfind — AI-Powered Travel Planner

> **A minimal, elegant, and futuristic travel intelligence web platform designed to transform travel ideas into calm, personalized, and budget-optimized itineraries.**

Designed and developed by **Nanle Joseph Lengya** ([@Lengjayimg](https://github.com/Lengjayimg)).

---

## 🌟 Overview

Planning a trip often involves juggling dozens of tabs—comparing flights, accommodations, reviews, and schedules across fragmented platforms. **Wayfind** eliminates research overload by bringing destination discovery, daily sequenced itineraries, live customization, and transparent budget tracking together into a unified, editorial-grade web experience.

The initial release showcases **Abuja, Nigeria** as its primary curated destination—from sunset kayaking at Jabi Lake to contemporary African art at Thought Pyramid and day trips to Gurara Falls.

---

## 🎨 Approved Design Direction: Minimalist & Elegant

- **Philosophy:** Restrained editorial minimalism with subtle glass overlays, smooth atmospheric gradients, and zero visual clutter.
- **Color System (Strict Green Foundation):**
  - **Primary Olive Green:** `#5A7E64`
  - **Deep Olive / Headlines:** `#3B4A20`
  - **Soft Sage Green:** `#8DB48E`
  - **Warm Background:** `#FDFCF9`
  - **Secondary Surface:** `#F1F8E9`
  - **Dark Charcoal Text:** `#333333`
  - *(Blue is strictly avoided across all surfaces, gradients, and accents)*
- **Typography:**
  - **Display / Headers:** Clash Display
  - **Body / Interface:** Inter
- **Iconography:** Genuine **Phosphor Icons** (Regular weight standard, Fill weight for active states), completely replacing emoji substitutes with semantic, accessible icons.

---

## 🚀 Key Features

1. **AI-Generated Itineraries:** Sequenced day-by-day schedules with realistic travel durations, morning-to-night pacing, and buffer times.
2. **Interactive Live Itinerary Editor:** Fluidly swap stops with AI alternatives or delete activities—total budget, daily totals, and category splits automatically update in real time.
3. **Dynamic Budget Intelligence:** Transparent cost breakdowns categorized across lodging, transport, dining, and admission fees with instant NGN (₦) $\leftrightarrow$ USD ($) currency toggling.
4. **AI Travel Companion (Floating Chatbot):** Context-aware conversational assistant to ask natural questions, discover dining spots (e.g. Abuja's top jollof), or adjust schedules on the fly.
5. **Light & Dark Visual Harmony:** Thoughtfully engineered themes tailored to reduce glare during night planning and outdoor daytime travel.
6. **QR Code Sharing & Offline Portability:** Generate scannable QR codes for companions nearby, direct WhatsApp/social sharing, and exportable PDF summaries.
7. **Comprehensive User Dashboard:** Active trip monitoring, quick discovery widgets, and traveler profile settings modeled after primary persona Anabel Jones.

---

## 🛠️ Tech Stack

- **Frontend:** Semantic HTML5, Modular CSS3 (Custom Properties & Design Tokens), Vanilla JavaScript (ES6+ reactive state store & hash-based router)
- **Icons:** Official Phosphor Icon Web Font & SVGs (`@phosphor-icons`)
- **Server:** Lightweight local PowerShell development server (`server.ps1` with built-in MIME routing for fonts and assets)
- **Zero Heavy Build Tooling:** Instant load times, no npm bundle bloat, zero dependencies required to run locally.

---

## 💻 Getting Started

### Prerequisites
- Any modern web browser (Chrome, Edge, Firefox, Safari)
- PowerShell (on Windows) or any static file server

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lengjayimg/ai-travel-planner.git
   cd ai-travel-planner
   ```

2. **Launch the local server:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File server.ps1
   ```

3. **Open the application:**
   Navigate to [http://localhost:8080/](http://localhost:8080/) in your browser.

---

## 📁 Repository Structure

```
AI TRAVEL PLANNER/
├── index.html                 # Main single-page application entry point
├── server.ps1                 # Local static server with font MIME configuration
├── README.md                  # Project overview and documentation
├── .gitignore                 # Git ignore rules
├── css/
│   ├── variables.css          # Design tokens (colors, typography, spacing)
│   ├── main.css               # Core layout, base styles & Phosphor icon sizing
│   ├── components.css         # UI components (cards, pills, buttons, modals, chatbot)
│   └── animations.css         # Fluid micro-interactions & transitions
├── js/
│   ├── data.js                # Curated Abuja 4-day itinerary & destination models
│   ├── state.js               # Reactive state store (theme, currency, activities)
│   └── app.js                 # UI controllers, routing, editor interactions & toast system
├── phosphor-icons/            # Local Phosphor icon fonts & vector assets
└── [Documentation PDFs]       # PRD, Design System, User Journey & Wireframes
```

---

## 📄 License & Credits

Designed and developed with care by **Nanle Joseph Lengya** ([@Lengjayimg](https://github.com/Lengjayimg)).
All rights reserved © 2026 Wayfind.
