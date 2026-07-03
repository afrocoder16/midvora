# Midvora

## Deployment

The root Astro site deploys to Namecheap/cPanel from GitHub Actions whenever
`main` changes. The workflow builds the site with `npm run build` and uploads
`dist/` over FTPS. The `proposal-app/` project is separate and remains on Vercel.

Required GitHub Actions secrets:

- `CPANEL_FTP_SERVER`
- `CPANEL_FTP_USERNAME`
- `CPANEL_FTP_PASSWORD`
- `CPANEL_FTP_PORT`
- `CPANEL_FTP_SERVER_DIR`

Use a dedicated cPanel FTP account scoped to `public_html`. If the FTP account
already starts inside `public_html`, set `CPANEL_FTP_SERVER_DIR` to `./`.

Website for [Midvora](https://midvora.com) — web design for local businesses in the Midwest.
