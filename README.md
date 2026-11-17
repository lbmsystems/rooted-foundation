# rooted-foundation.org

The one website for RootEd Foundation and both Root to Rise locations. Hosted on Cloudflare Pages.

```
/                 home (placeholder until the real design lands)
/schoolhouse      RootEd School House, 5700 Colfax Ave (placeholder)
/microschool      Microschool & Project Center, 4700 King St (placeholder)
/visit            schedule a tour or request info  -> creates a Lead + Student in Airtable
/register         family registration after acceptance (private link + child's birthday)
```

`/visit` and `/register` talk to the Cloudflare Worker in `lbmsystems/r2r-visit` (`worker/`), which holds the
Airtable token. Nothing secret lives in this repo.

## Password (draft mode)

The whole site sits behind a password prompt (`functions/_middleware.js`) while it's a draft.
The password is the `SITE_PASSWORD` secret in Cloudflare → Workers & Pages → rooted-foundation → Settings →
Variables and Secrets. Any username works. If the secret is missing, the site shows nothing.
Changing the password takes effect on the next deploy (merge anything, or Retry the latest deployment).
To launch publicly, delete `functions/_middleware.js`.

Note: while this is on, families can't reach `/register` either. Turn it off (or exempt `/register`) before
sending real registration links.

## Location domains

The location .coms don't host anything. Each one redirects to its section here and keeps the rest of the path,
so old links and printed QR codes still work:

| Domain | Goes to |
|---|---|
| roottorisemicroschool.com | rooted-foundation.org/microschool |
| visit.roottorisemicroschool.com | rooted-foundation.org/visit (keeps `?info`) |
| rooted-schoolhouse.com | rooted-foundation.org/schoolhouse |

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
