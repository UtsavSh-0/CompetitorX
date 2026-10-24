# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Server environment variables

Copy `.env.example` to `.env` for local development. Set `TINYFISH_API_KEY` for website research and `GEMINI_API_KEY` for the optional final AI verdict. Keep both values server-side; do not add `VITE_` prefixes. `GEMINI_MODEL` is an optional server-side model override and defaults to `gemini-3.8-flash`.

After starting the app, run a comparison and use **Test Gemini connection** to check key availability, the configured model and API access before generating a verdict. This check makes a minimal server-side request and returns a sanitized diagnostic; automated tests mock the Gemini response.

The production build uses Nitro's Cloudflare Worker target. In Cloudflare, open **Workers & Pages → your Worker → Settings → Variables and Secrets**, add `TINYFISH_API_KEY` and `GEMINI_API_KEY` as **Secret** values, optionally add `GEMINI_MODEL` as a plain text variable, then deploy the Worker. See [Cloudflare's secrets guide](https://developers.cloudflare.com/workers/configuration/secrets/) for the current dashboard steps.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
