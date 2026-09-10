# GitHub to Hostinger Deployment

The root Astro website deploys automatically to `midvora.com` when a root-site
change is pushed to the `main` branch. The proposal app in `proposal-app/` is
separate and continues to deploy on Vercel for `sign.midvora.com`.

## Deployment target

- Hosting provider: Hostinger Web Hosting
- Remote website directory: `public_html`
- Deployment method: GitHub Actions over FTP
- FTP host: `145.223.77.249`
- FTP username: `u587329301`
- FTP port: `21`
- Source branch: `main`
- Local build output: `dist/`
- Workflow: `.github/workflows/deploy-hostinger.yml`

The workflow retains the existing `CPANEL_FTP_*` secret names so the FTP
password that was rotated during the migration does not need to be exposed or
copied. The names are legacy labels only; their values now point to Hostinger.

## GitHub Actions secrets

Set the repository-level Actions secrets at:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions
```

The required values are:

```text
CPANEL_FTP_SERVER=145.223.77.249
CPANEL_FTP_USERNAME=u587329301
CPANEL_FTP_PASSWORD=<the Hostinger FTP password>
CPANEL_FTP_PORT=21
CPANEL_FTP_SERVER_DIR=./public_html/
```

Keep the password only in GitHub Actions secrets and Hostinger. Do not commit it
to this repository.

## Deployment flow

On each eligible push to `main`, GitHub Actions:

1. Checks out the repository.
2. Installs Node.js 22 and the locked npm dependencies.
3. Builds the root Astro site into `dist/`.
4. Confirms that `dist/index.html` exists.
5. Uploads the contents of `dist/` to `public_html` on Hostinger.

The upload is non-destructive (`dangerous-clean-slate: false`) so unrelated
server files such as `.htaccess` are not wiped.

The workflow runs for root-site changes under `src/` or `public/`, changes to
the root build configuration, and changes to the workflow itself. It can also
be started manually from **Actions -> Deploy root site to Hostinger -> Run
workflow**.

## Troubleshooting

If the upload step reports a login error:

- Confirm that the Hostinger FTP password is stored in
  `CPANEL_FTP_PASSWORD` without leading or trailing spaces.
- Confirm that the username is `u587329301` and the host is
  `145.223.77.249`.
- Use FTP on port `21`; Hostinger's documented FileZilla configuration uses
  plain FTP for this account type.

If the upload succeeds but the site still shows Hostinger's default page or a
404:

- Confirm that `index.html` is directly inside `public_html`, not inside a
  nested `dist` or second `public_html` folder.
- Check the domain's DNS records and SSL status in hPanel.
- Hard refresh the browser or use an incognito window after DNS changes have
  propagated.

The `proposal-app/` and `portal-app/` applications are not part of this FTP
deployment.
