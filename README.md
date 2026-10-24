# CompetitorX 🔎
### Know Your Competition. Make Your Next Move.

**CompetitorX** is an AI-powered competitor intelligence platform that researches competitor websites, compares their products and capabilities, and helps users make informed decisions through evidence-backed analysis.

Instead of relying on generic AI summaries, CompetitorX focuses on website research, source-linked findings, research coverage, and transparent comparisons.

> **Our goal:** Don't just tell users which competitor wins. Show them the evidence behind the decision.

---

## 🚀 The Problem

Comparing competing products manually can be time-consuming and inconsistent. Important information about features, pricing, integrations, target audiences, and differentiators is often scattered across multiple webpages.

Traditional AI summaries can also hide missing information or make it difficult to verify their claims.

## 💡 Our Solution

CompetitorX streamlines competitor research into one comparison workspace.

Users enter two or three competitor websites. The platform researches their public webpages, organizes the retrieved information into a side-by-side comparison, and is designed to generate an AI-powered verdict grounded in the collected evidence.

### Key Features

- **Multi-Website Comparison** — Compare two or three competitor websites in one workflow.
- **Automated Website Research** — Use TinyFish to discover and retrieve relevant webpage content.
- **Side-by-Side Comparison Matrix** — Compare core offerings, features, target audiences, services, pricing, integrations, AI capabilities, collaboration, and security information.
- **Source-Linked Findings** — Open supporting sources to investigate important claims.
- **Research Coverage Dashboard** — Track retrieved pages, source-backed findings, missing information, uncertain findings, and failed retrievals.
- **Feature Coverage Analysis** — Distinguish features found in the research from information that remains unknown.
- **Integration Ecosystem** — Identify integrations explicitly mentioned in retrieved content.
- **Pricing Comparison** — Present comparable published pricing when sufficient normalized pricing data is available.
- **Priority-Based Recommendations** — Evaluate competitors against selected user priorities and available evidence.
- **Gemini AI Verdict** — Intended to generate a final recommendation with reasoning, trade-offs, and evidence references.

---

## 🧠 How It Works

```text
Enter Competitor Websites
          |
          v
TinyFish Website Research
          |
          v
Extract Information & Sources
          |
          v
Normalize and Compare Findings
          |
          v
Research Coverage & Evidence Review
          |
          v
Gemini AI Verdict
          |
          v
Evidence-Based Decision Support
```

### 1. Enter websites

Provide two or three public competitor URLs.

### 2. Research with TinyFish

Retrieve relevant pages and collect information from the competitors' public websites.

### 3. Organize the findings

Structure retrieved information into comparable categories and associate findings with their source URLs.

### 4. Evaluate research coverage

Show what was found, what remains unknown, which findings are uncertain, and which retrievals failed.

### 5. Generate a verdict

Gemini is intended to analyze the structured research and explain which competitor best matches the user's priorities.

The recommendation should remain transparent about missing or conflicting evidence.

---

## 📊 Research Coverage & Evidence Transparency

Research coverage is one of CompetitorX's key differentiators.

A comparison should not be judged only by its final recommendation. Users should also understand how much research supports that recommendation.

| Metric | Meaning |
|---|---|
| Pages retrieved | Number of pages successfully retrieved |
| Source-backed findings | Findings supported by collected source evidence |
| Not found in retrieved pages | Information not located in the retrieved content |
| Uncertain findings | Findings that require additional verification |
| Failed retrievals | Page retrieval attempts that did not succeed |

**Why this matters:** Missing information is not automatically evidence that a competitor lacks a feature. Research coverage helps users understand the limitations of the comparison before acting on a recommendation.

---

## 🛠️ Technology Stack

The following technologies are part of the intended project architecture; verify the current repository configuration before treating every item as an implemented dependency.

| Technology | Purpose |
|---|---|
| React / Vite, if configured | Frontend application |
| TypeScript, if configured | Type-safe application development |
| TinyFish | Website research and content retrieval |
| Google Gemini API | AI-powered competitor analysis and final verdict |
| Existing backend or serverless routes | Secure API orchestration |
| Existing charting and UI libraries | Data visualization and interface components |

---

## 🔐 Security & Reliability

CompetitorX should follow these principles:

- Keep TinyFish and Gemini API keys on the server.
- Never expose secret keys in frontend bundles or public repositories.
- Preserve source URLs for important claims.
- Do not invent missing prices, features, or integrations.
- Distinguish unknown information from unsupported capabilities.
- Handle API failures without discarding successfully collected research.
- Validate AI-generated output before presenting it as a final verdict.
- Clearly communicate when research or AI analysis is incomplete.

AI-generated recommendations should support decision-making, not replace verification of important business information.

---

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm, if the project uses a Node-based frontend.
- A valid TinyFish API key.
- A valid Google Gemini API key.
- The backend or serverless runtime required by the existing project.

### Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
npm install
```

Create a local environment file based on the project's `.env.example`.

Example variable names:

```env
TINYFISH_API_KEY=your_tinyfish_key
GEMINI_API_KEY=your_gemini_key
```

Use the exact TinyFish variable name expected by the existing backend. Never commit real credentials.

Start the development server using the command defined in `package.json`, commonly:

```bash
npm run dev
```

**Important:** A Vite frontend alone cannot securely execute server-side API calls. Configure the backend or serverless functions required by the current architecture before expecting live research and Gemini verdict generation to work.

---

## 🧪 Example Use Case

Compare:

- Vercel — https://vercel.com/
- Netlify — https://www.netlify.com/

CompetitorX can organize researched findings about their offerings, deployment capabilities, integrations, collaboration features, and published pricing.

The research coverage dashboard then helps users identify which claims have evidence and which areas require more research.

The final recommendation should depend on the collected evidence and the user's priorities—not on an arbitrary overall score.

---

## 🎯 Project Goals

CompetitorX aims to make competitor analysis:

- Faster than manually visiting numerous webpages.
- Easier to understand through structured comparisons.
- More transparent through source-linked evidence.
- More useful through priority-based recommendations.
- More trustworthy by exposing research gaps and uncertainty.

---

## 🚧 Current Limitations

- Research quality depends on webpage accessibility and the information returned by the research pipeline.
- Some pricing and product information may not be available in retrieved pages.
- Research coverage measures evidence availability, not the overall quality of a competitor's product.
- Gemini verdict generation depends on API availability, model access, configuration, and successful response validation.
- AI-generated conclusions and important commercial claims should be checked against their sources.

---

## 🗺️ Future Improvements

- More robust extraction and claim-level evidence verification.
- Better pricing normalization across plans and billing periods.
- Exportable competitor intelligence reports.
- Historical comparisons to identify changes over time.
- Custom comparison criteria for different industries.
- Improved retry behavior and API observability.
- More comprehensive automated testing and deployment checks.

---

## 🏆 Built for AI-Powered Competitor Intelligence

CompetitorX explores how website research, structured evidence, and generative AI can work together to help people understand competitive markets.

**Research the market. Verify the evidence. Make a better decision.**

---

## 📄 License

Add the license appropriate for this repository before distributing the project publicly.
