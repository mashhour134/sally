# Deploying Flutter Web to Netlify via GitHub Actions

This repository includes a GitHub Actions workflow that builds the Flutter web app and deploys the generated `build/web` directory to Netlify.

## What I added
- `.github/workflows/deploy-netlify.yml` — builds the web app and uses the Netlify CLI action to deploy.

## Required secrets (set these in your GitHub repository Settings → Secrets → Actions)
- `NETLIFY_AUTH_TOKEN` — a Personal Access Token for Netlify (Team > User settings > Applications > Personal access tokens).
- `NETLIFY_SITE_ID` — the target Netlify site ID (available in your Netlify site settings > General > Site details).

## How it works
- On every push to `main` the workflow will run:
  - checkout the code
  - setup Flutter
  - run `flutter pub get`
  - run `flutter build web --release`
  - run `netlify deploy --dir=build/web --prod --site=$NETLIFY_SITE_ID`

## Alternative (if you prefer Netlify to build directly)
Netlify's build environment does not include Flutter by default; the Netlify build log showed `flutter: command not found`.
If you prefer Netlify to perform the build, you must provide a custom environment that installs Flutter (for example, using a Docker image) or pre-install Flutter via a build plugin — the simplest method is to use GitHub Actions as provided here.

> Important: If you use Netlify continuous deploy from GitHub, set the Netlify build command to a no-op such as `echo 'skip build'` or clear the command in the Netlify UI. This repo already includes `netlify.toml` with a no-op build command.

## Trigger a deployment
1. Add the two secrets to your GitHub repo.
2. Push a commit to `main`.
3. Check Actions → Deploy workflow output; the Netlify deploy will run and publish the site.

If you want, I can also add a GitHub Action to automatically create a Netlify personal access token using Netlify CLI, or add a Vercel workflow instead.