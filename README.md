# rooted-foundation.org

The one website for RootEd Foundation and both Root to Rise locations. Hosted on Cloudflare Pages.

```
/                 home: the RootEd Foundation site (from the lbm.systems/rooted-draft design), both programs on one page
/visit            schedule a tour or request info  -> creates a Lead + Student in Airtable
/register         family registration after acceptance (private link + child's birthday)
```

`/visit` and `/register` talk to the Cloudflare Worker in `lbmsystems/r2r-visit` (`worker/`), which holds the
Airtable token. Nothing secret lives in this repo.

## Password (draft mode)

The site is public (launched Nov 2026). To lock it again, restore `functions/_middleware.js`
from git history; it reads the `SITE_PASSWORD` secret in Cloudflare → Workers & Pages → rooted-foundation.

## Photos and videos

All site media comes from one Google Drive folder (in the arneice@lbm.systems Drive):
**RootEd Foundation – Website Media**: https://drive.google.com/drive/folders/1eX9l_zG1FzTwdBxavBL3ugLbHtmUb1uF

- `Images/` (folder id `1zz8UGSJmvIrnI5wX8yQaZNWul821DEkL`): photos and graphics for the site
- `Videos/` (folder id `15C_jQwoa40sGxM-pRNa0qwdvmK0BMx3-`): video clips

Drop files there, then ask for them by name or describe where they go. They get resized, compressed and
committed to `assets/` here (the site serves its own copies, so nothing on the site breaks if Drive files move).

## Location domains

The location .coms don't host anything. Each one redirects to its section here and keeps the rest of the path,
so old links and printed QR codes still work:

| Domain | Goes to |
|---|---|
| roottorisemicroschool.com | rooted-foundation.org (home, for now) |
| visit.roottorisemicroschool.com | rooted-foundation.org/visit (keeps `?info`) |
| rooted-schoolhouse.com | rooted-foundation.org (home, for now) |

Set these up as Cloudflare **Redirect Rules** (301, preserve query string) on each domain.
Leave each domain's **MX/email records alone** so addresses like admin@roottorisemicroschool.com keep working.

## Family registration

1. Airtable → *R2R Microschool & Daycare* → **Students**: set **Registration status** to `Ready for registration`.
2. Send the family the child's **Registration link** (formula field, `rooted-foundation.org/register?k=…`).
3. They confirm the child's birthday, then fill in family info, upload documents, and sign. Answers save per step.
4. On submit, status becomes `Submitted` and the page closes. Staff review and set `Complete`.

Five wrong birthdays lock the link; clear **Registration failed attempts** to unlock.
Preview with sample data: `/register?k=recDEMO00000000000&demo`.

## Go-live

1. Move DNS for rooted-foundation.org, roottorisemicroschool.com and rooted-schoolhouse.com to Cloudflare
   (add each site in Cloudflare, then change nameservers at the registrar). Copy over existing email records first.
2. Cloudflare → Workers & Pages → Create → Pages → connect this repo. No build command; output directory `/`.
3. Add custom domains `rooted-foundation.org` and `www.rooted-foundation.org` to the Pages project.
4. Deploy the Worker with this domain allowed (`r2r-visit/worker/wrangler.toml`, then `npx wrangler deploy`).
5. Add the redirect rules above, then retire the GitHub Pages visit site.
