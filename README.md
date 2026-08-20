# Gym Tracker

A workout and lift tracker, usable on phone and PC as an installable app.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- PWA (installable, `vite-plugin-pwa`)
- Supabase (Postgres + Auth) for cross-device sync

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
