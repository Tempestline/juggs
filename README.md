# JUGGS — site

Static landing page for **$JUGGS** on Circle's Arc chain. No build step.

- Live: https://tempestline.github.io/juggs/
- Stack: HTML + CSS + vanilla JS, GSAP 3.15 (ScrollTrigger, SplitText) from cdnjs, Lenis (vendored in `js/vendor/`), raw WebGL silk shader (`js/silk.js`), self-hosted fonts (Instrument Serif, Inter Tight, JetBrains Mono; OFL via fontsource).
- Live market data comes from the DexScreener API every 30s (`js/main.js`, `API` constant).

## Deploy

GitHub Pages serves the `main` branch root. Push to `main` and it redeploys in about a minute.

```bash
git push origin main
```

## Local preview

```bash
npx -y serve -l 5173 .
```

Open http://localhost:5173/. Add `?noraf` to the URL only for headless previews that never fire `requestAnimationFrame`.

## Things to fill in

| What | Where |
|---|---|
| X / Telegram links | `index.html`: replace the two `.pill--soon` spans in the CTA and the `.footer__soon` spans in the footer with `<a>` tags |
| Buy link | `index.html`: three `app.uniswap.org/swap?chain=arc&outputCurrency=…` links (nav, hero, step 03). Uniswap's Arc support in the web app was not verifiable at build time; swap to whichever DEX front-end works on Arc |
| Artwork | Frames are WebGL silk by default. To use real images, drop a `<img>` inside `.frame__art` above the `.art` layer and give it `position:absolute; inset:0; object-fit:cover`. Only use imagery you hold rights to |
| OG image | `assets/img/og.png` (1200×630). Regenerate if the wordmark or tagline changes |

## Claims policy

The page only states facts verifiable on-chain or on DexScreener (chain, venue, quote asset, supply, launch date). Roadmap items are worded as intent, not promises. Keep it that way.
