# Berean Study Desk

A unified successor to three separate personal apps — [Holy Shelf](https://github.com/BrianH-NC/holy-shelf) (personal library), [Theology Checker](https://github.com/BrianH-NC/theology-checker) (doctrine-soundness checks), and [Digging Deep Notebook](https://github.com/BrianH-NC/digging-deep-notebook) (Bible study notebook) — as one product. See Acts 17:11.

Live at [bereanstudydesk.app](https://bereanstudydesk.app).

## Stack

React + Vite + Tailwind + `react-router-dom`, Supabase for auth and data (the same project as `holy-shelf`: books/wishlist tables and RLS already live there). Plain JS, no TypeScript, no test runner — matches all three source apps.

Visual design is the "Organic" design system (Caprasimo/Figtree, terracotta + sage accents) — tokens live as CSS custom properties in `src/index.css`, wired into Tailwind via `tailwind.config.js`. Day/Evening mode is a `data-mode` attribute on `<html>`, toggled from the sidebar.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values — see Supabase dashboard
npm run dev
```

## Status

**Phase 1** (current): app shell with all ten screens routed, Google auth, and the Shelf screen fully working end-to-end (including a Doctrine Check verdict column). Everything else is a placeholder screen — see the project plan for the phased build-out.
