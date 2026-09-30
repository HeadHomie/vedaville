# Vedaville

Source code for Vedaville web properties.

**GitHub repository:** [HeadHomie/vedaville](https://github.com/HeadHomie/vedaville)

**Default branch:** `main`

## Applications

- Repository root (`index.html`, `assets/`, `vercel.json`) — the static landing page deployed at [join.vedaville.com](https://join.vedaville.com). Its Vercel project is [Big Vision / vedaville-join](https://vercel.com/big-vision/vedaville-join) (`prj_FfMEg8gMejjvHr1bF3CtK3KaDLwM`), with the repository root as its project root.
- `apps/share` — the community transformation story form and private submissions dashboard deployed at [share.vedaville.com](https://share.vedaville.com)

Each application is deployed independently. Runtime credentials are configured in the hosting provider and are never committed to this repository.

## Working locally

Run Git commands from the repository root when changing the join landing page. The local `pro/` and `stories/` directories are separate Git checkouts and are ignored by this repository; changes to them are not part of a join-site commit.

The local `.vercel/project.json` links this directory to the Big Vision `vedaville-join` Vercel project. It is machine-specific and ignored by Git. If the link is missing or points elsewhere, run `vercel link --yes --scope big-vision --project prj_FfMEg8gMejjvHr1bF3CtK3KaDLwM`.

## Deploying the join site

The join site is a static Vercel project. Run `./scripts/deploy-join.sh` from this repository root. The script checks the linked project ID before deploying to Big Vision. Confirm that `join.vedaville.com` points to the new production deployment. A GitHub push by itself does not confirm that the custom domain was updated. `.vercelignore` limits uploads to the join site's HTML, assets, and site configuration.
