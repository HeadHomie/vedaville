# Vedaville

Source code for Vedaville web properties.

**GitHub repository:** [HeadHomie/vedaville](https://github.com/HeadHomie/vedaville)

**Default branch:** `main`

## Applications

- Repository root (`index.html`, `assets/`, `vercel.json`) — the static landing page deployed at [join.vedaville.com](https://join.vedaville.com). Its Vercel project is `vedaville-join`, with the repository root as its project root.
- `apps/share` — the community transformation story form and private submissions dashboard deployed at [share.vedaville.com](https://share.vedaville.com)

Each application is deployed independently. Runtime credentials are configured in the hosting provider and are never committed to this repository.

## Working locally

Run Git commands from the repository root when changing the join landing page. The local `pro/` and `stories/` directories are separate Git checkouts and are ignored by this repository; changes to them are not part of a join-site commit.

The local `.vercel/project.json` links this directory to the `vedaville-join` Vercel project. It is machine-specific and ignored by Git.

## Deploying the join site

The join site is a static Vercel project. Run `vercel deploy --prod` from this repository root and confirm that `join.vedaville.com` points to the new production deployment. A GitHub push by itself does not confirm that the custom domain was updated. `.vercelignore` limits uploads to the join site's HTML, assets, and site configuration.
