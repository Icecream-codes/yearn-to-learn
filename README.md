# Yearn to Learn

Website for Yearn to Learn Training and Consulting, a South African SHEQ consultancy. Try. Do. Achieve.

A clear business site with one signature moment: real footage of a dump truck sits in the hero, then grows to fill the screen and tips its load as you scroll.

## Working on it

```sh
npm install
npm run dev     # serves the site locally and rebuilds on save
npm run build   # writes the production bundle to assets/js/app.js
```

GitHub Pages serves this repository directly from `main`, so run `npm run build` and commit `assets/js/app.js` before pushing.

## Where things live

| Path | What it holds |
|---|---|
| `index.html` | All page content |
| `assets/css/main.css` | Layout and type |
| `src/main.js` | The footage, scroll details, menu and enquiry form |
| `assets/film/` | Footage frames: `d` for desktop, `m` for a vertical phone crop |
| `assets/img/clients/` | Client logos, cleaned up from the company profile |
| `credits.html` | Required image credits. Update it whenever a photo changes |

## Photos

Every stock image is either public domain or carries a licence that allows commercial use, and `credits.html` lists them. Those licences cover copyright only. Replacing them with the company's own site photos over time removes any question about the people shown.

## Accessibility

Visitors who prefer reduced motion get a plain, fully readable page with the same content. The site also works with JavaScript off.
