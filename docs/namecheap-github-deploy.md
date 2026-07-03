# GitHub to Namecheap/cPanel Deployment

This document explains how the main Midvora website is connected from GitHub to
Namecheap/cPanel.

The root Astro site deploys automatically to `midvora.com` when changes are
pushed to the `main` branch. The proposal app in `proposal-app/` is separate and
continues to deploy on Vercel for `sign.midvora.com`.

## What We Set Up

- Hosting target: Namecheap shared hosting with cPanel.
- Website root: `public_html`.
- Deployment method: GitHub Actions over explicit FTPS.
- Source branch: `main`.
- Build output: root Astro `dist/` folder.
- Workflow file: `.github/workflows/deploy-cpanel.yml`.

The workflow runs only when root website files change, such as:

- `src/**`
- `public/**`
- `astro.config.mjs`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.github/workflows/deploy-cpanel.yml`

Docs-only changes do not trigger a cPanel deploy.

## cPanel FTP Account

We used a dedicated FTP account instead of SSH.

Current FTP details:

```text
FTP username: admin-samson@midvora.com
FTP server: ftp.midvora.com
FTP / explicit FTPS port: 21
FTP account path: /home/midvbrmt/public_html
```

Because the FTP account starts inside `public_html`, the GitHub secret
`CPANEL_FTP_SERVER_DIR` is set to:

```text
./
```

Do not use the cPanel SSH key page for this deployment path. SSH is not needed
for the current setup.

## GitHub Secrets

The workflow reads cPanel connection details from repository-level GitHub
Actions secrets:

```text
CPANEL_FTP_SERVER
CPANEL_FTP_USERNAME
CPANEL_FTP_PASSWORD
CPANEL_FTP_PORT
CPANEL_FTP_SERVER_DIR
```

Current non-password values:

```text
CPANEL_FTP_SERVER=ftp.midvora.com
CPANEL_FTP_USERNAME=admin-samson@midvora.com
CPANEL_FTP_PORT=21
CPANEL_FTP_SERVER_DIR=./
```

`CPANEL_FTP_PASSWORD` is the password for the dedicated cPanel FTP account. Keep
it only in GitHub Secrets and cPanel. Do not commit it to the repo.

Secrets location:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions -> Repository secrets
```

Each secret must be added one at a time. Do not paste all values into one secret.

## Deployment Flow

When a website change is pushed to `main`:

1. GitHub Actions checks out the repo.
2. It installs Node.js 22.
3. It runs `npm ci`.
4. It runs `npm run build`.
5. Astro creates static files in `dist/`.
6. GitHub uploads `dist/` to Namecheap over FTPS.
7. `https://midvora.com` updates from cPanel.

The FTP deploy is intentionally non-destructive:

```yaml
dangerous-clean-slate: false
```

That means the action does not wipe the entire remote folder before upload. This
helps protect cPanel files such as `.htaccess`, verification files, or anything
manually placed in `public_html`.

## How To Deploy A Website Change

For normal development:

```bash
npm run build
git status
git add <changed files>
git commit -m "describe the website change"
git push origin main
```

Then watch:

```text
GitHub repo -> Actions -> Deploy root site to cPanel
```

After the run succeeds, open:

```text
https://midvora.com
```

Use a hard refresh or incognito window if the browser still shows cached content.

## Manual Deployment

The workflow can also be run manually:

```text
GitHub repo -> Actions -> Deploy root site to cPanel -> Run workflow
```

This is useful when cPanel needs a re-upload but no source files changed.

## Verification History

The connection was verified end to end on July 2, 2026.

Initial workflow deploy:

```text
Commit: 6b4a24c
Workflow: Deploy root site to cPanel
Result: success
Live check: https://midvora.com returned 200
```

Real homepage change deploy:

```text
Commit: faf6d47
Change: July 4th homepage accent
Workflow: Deploy root site to cPanel
Result: success
Live check: homepage contained "July 4th weekend sprint"
```

## Troubleshooting

If GitHub Actions fails during `Upload dist to cPanel over FTPS`:

- Confirm `CPANEL_FTP_PASSWORD` is the FTP account password, not the cPanel login
  password unless they are intentionally the same.
- Confirm `CPANEL_FTP_USERNAME` includes the domain:
  `admin-samson@midvora.com`.
- Confirm `CPANEL_FTP_SERVER` is `ftp.midvora.com`.
- Confirm `CPANEL_FTP_PORT` is `21`.
- Confirm `CPANEL_FTP_SERVER_DIR` is `./`.
- Confirm the FTP account path in cPanel points to `public_html`.
- Confirm Namecheap allows explicit FTPS on port `21`.

If the action succeeds but the site looks unchanged:

- Open `https://midvora.com` in incognito.
- Hard refresh the page.
- Confirm the changed file is under a workflow-triggered path like `src/**` or
  `public/**`.
- Check that the workflow ran on the latest `main` commit.

If `sign.midvora.com` is affected:

- That is the proposal app and should be handled in Vercel, not this cPanel
  workflow.
- The cPanel workflow only uploads the root Astro website.

## Maintenance Notes

- Rotate the FTP password if it is ever shared or exposed.
- Update the `CPANEL_FTP_PASSWORD` GitHub secret after any FTP password change.
- Keep the FTP account scoped to `public_html` to limit blast radius.
- Do not commit `dist/`; it is generated during deploy.
- Do not move `proposal-app/` into this cPanel workflow.
