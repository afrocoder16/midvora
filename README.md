# Midvora

Website for [Midvora](https://midvora.com) - web design for local businesses in the Midwest.

## Deployment

The root Astro site deploys to Hostinger from GitHub Actions. See
[GitHub to Hostinger Deployment](./docs/hostinger-github-deploy.md).

## Public site analytics

The root Astro site uses PostHog for page views and three custom events:
`contact_cta_clicked`, `package_builder_submitted`, and
`sample_request_submitted`. It runs only on `midvora.com` and
`www.midvora.com`; the portal and proposal apps are separate and have no
PostHog integration. Automatic interaction capture and session replay are off.

The integration uses PostHog cookieless mode. In the PostHog project, enable
**Cookieless server hash mode** under **Project Settings → Web analytics** before
checking live events. The `phc_` project token in `PostHog.astro` is a public
client-side identifier; never put a personal API key (`phx_`) in this file.
