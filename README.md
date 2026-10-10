# Trading Journal

A complete standalone Angular application using Bootstrap 5, Firebase Authentication + Firestore, Chart.js and ExcelJS. Designed around **Trading_Daily_Monthly_Tracker_Oct2026-Oct2027_FIXED.xlsx**, version 2, read on 7 October 2026.

## Configured Firebase project

This edition is configured for **trading-journal-55b0f**. Both development and production use Firebase (`demo: false`). Start with **FIREBASE-SETUP.md** to enable providers, create Firestore and deploy the included rules. Public web configuration is included; no administrator credentials or cloud permissions were supplied. Cloud setup has not been performed from this environment.

## 1. Run locally first (Windows / macOS / Linux)

1. Install **Node.js 24.15 or later in the 24.x line** (24.19 was used for validation). Restart your terminal after installation. Angular 22 also supports Node 22.22.3+ and 26.x.
2. Extract this ZIP. Open the `trading-journal` folder in VS Code.
3. Open a terminal in that folder and run:

```sh
npm ci
npm start
```

Open **http://localhost:4200**. `npm start` runs `ng serve`; `npx ng serve` works too. Stop with Ctrl+C.

The first run opens the sign-in screen. Complete FIREBASE-SETUP.md before registering or saving real entries. Records are saved under your authenticated user in Firestore, not localStorage.

For sample-data UI testing only, set `demo: true` in `environment.development.ts` and restart. Demo entries are browser-local and never migrate automatically to Firebase. Set it back to false before entering real data. Your Excel workbook has not been imported or modified.

## 2. Connect your private Firebase backend

Your project configuration is already installed. The generic steps below are retained for reference; FIREBASE-SETUP.md has the exact remaining steps for your project.

1. Open https://console.firebase.google.com/ and create a project. The **Spark** plan can be used for this journal; no Cloud Functions or paid backend server is required. Free usage has limits; check the console's usage tab. Do not enable billing unless you intend to use paid features.
2. In **Project settings → Your apps**, register a **Web app**. Copy the Firebase config values.
3. Fill in `src/environments/firebase.config.ts`:

```ts
export const firebaseConfig = {
  apiKey: 'YOUR_WEB_API_KEY',
  authDomain: 'trading-journal-55b0f.firebaseapp.com',
  projectId: 'trading-journal-55b0f',
  appId: 'YOUR_WEB_APP_ID',
};
```

These are public web-client identifiers, not a server credential. Firestore rules and Firebase Authentication secure the data. **Never include an Admin SDK service account, private key, or broker secret in Angular source.**

4. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**. Set the Google support email when prompted.
5. In **Authentication → Settings → Authorized domains**, add `localhost` if missing. If you visit the dev server using `127.0.0.1`, authorize that hostname too. Add your actual hosting hostname after deployment. Use hostnames, not paths.
6. In **Firestore Database**, create the default database in **production mode** (not open test mode). Choose a suitable available region near your users. Keep the database named `(default)`.
7. Deploy the included rules. In your terminal:

```sh
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project trading-journal-55b0f
```

The Firebase CLI is included as a dev dependency. Replace `trading-journal-55b0f` with the actual project ID, not its display name. The included `firebase.json` already references the rules and indexes; you do not need `firebase init`.

8. This edition already sets `demo: false` in `src/environments/environment.development.ts`.
9. Restart `npm start`. Create an account or sign in with Google. Add an entry and refresh; check the Firestore console to confirm its document exists.
10. Sign in on another device/browser with the **same account** to see the same journal. Test a second account to confirm it has an independent empty journal.

Production builds use `src/environments/environment.ts`, where demo is already **false**. Both environments read the same `firebase.config.ts`. To use separate development and production Firebase projects, give each environment its own public config. Your supplied public web configuration is included in this ZIP. Analytics is not initialized even though a measurement ID is present. Missing configuration produces a setup message rather than falling back to demo mode.

## 3. Workbook fields and behavior

| Workbook field          | Application behavior                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Date                    | Required; one record per date. Defaults to today's date in India.                              |
| Day                     | Derived from date.                                                                             |
| Month                   | Derived from date; used for filtering and monthly summaries.                                   |
| Starting Capital (₹)    | Optional, manually entered each day. Blank and zero are distinct.                              |
| Profit / Loss (₹)       | Required net P&L after brokerage and other charges. Negative = loss; zero = recorded flat day. |
| Trades / Notes          | Free text, maximum 2,000 characters.                                                           |
| Ending Capital (₹)      | Starting capital + P&L; blank if starting capital is absent.                                   |
| Daily Return %          | P&L ÷ starting capital × 100; blank when capital is absent or zero.                            |
| P&L Status              | Profit / Loss / Flat based on the P&L sign.                                                    |
| Cumulative P&L (₹)      | Sum in chronological date order across all saved records.                                      |
| Trade count (extension) | Optional whole number; added because the workbook has no structured trade count.               |

The date selector permits 1900–2099; the default month list includes **October 2026 through October 2027** and expands for other saved dates. No records are created for unrecorded dates. No trading-day/holiday calendar is assumed.

Starting capital is **not carried forward**. Reflect deposits/withdrawals in that day's opening capital; do not enter them as trading P&L. Monetary values are stored as integer **paise** to avoid floating-point accumulation errors. Both UI and service validation reject more than two decimal places. Capital is limited to ₹10 billion; P&L to ±₹10 billion per day. Trade count is 0–100,000.

The dashboard follows the **Period** selector. It shows recorded trade-count total, missing-count days, net P&L, profitable/loss/flat days, day win rate and win/loss day ratio. It cannot infer individual winning trades from a daily net P&L. For example, a day with three winning trades and two losses is still just one profitable/loss/flat day in these metrics.

- Day win rate = profitable days / (profitable days + loss days).
- Win/loss ratio = profitable days / loss days; a zero denominator is labelled rather than divided by zero.
- Trading days and average daily P&L include recorded flat days.
- Empty months are excluded from best/worst; ties choose the earliest month.
- The daily table and cumulative chart preserve **all-time** running P&L, even if a single month is selected.
- Monthly cumulative P&L starts at the selected period and is explicitly labelled.
- Search/status filters affect the table and **Export view**, not the dashboard.
- Sorting or pagination never changes the underlying cumulative calculation.
- Editing an early day's P&L updates later running totals. Deleting a day recalculates them too.
- Dates are fixed during edits. To move a record, create the intended date and remove the old date after checking it.

## 4. Storage, authentication and security

Document path: `users/{firebaseUid}/entries/{YYYY-MM-DD}`.

`firestore.rules` verifies ownership for reads/writes/deletes, accepts only the known fields, validates types and numeric bounds, and requires incrementing revisions on updates. Every unlisted collection is denied by default. Rules are authoritative; the Angular route guard only controls navigation.

Create/update/delete run in Firestore transactions. Creating an existing date fails instead of silently overwriting it. Edits and deletes check the record revision so a stale tab cannot overwrite a newer edit. On conflict, cancel and reopen the record to load its current revision. Transactions require an internet connection. Saving is acknowledged only after Firestore confirms the transaction.

Google and email/password sign-in, registration, password reset and sign-out are implemented. Firebase stores/validates passwords; the journal does not store them. Auth uses browser-session persistence, so closing the session requires signing in again. Firestore uses its memory cache; persistent IndexedDB storage is not enabled for real records. Signing out clears the displayed entries. Google sign-in needs a popup-enabled browser.

Firestore persists records in your Firebase project across devices. It is not a substitute for backups: export regularly and keep copies securely. Deletes require confirmation and are permanent in this app. Automatic database backup / point-in-time restore is not configured and may require paid services. Firebase project owners/admin tools have administrative access. This is not end-to-end encryption.

For a personal journal, client-side pagination is simple and appropriate. The app subscribes to all entries for the signed-in user, then filters and paginates in the browser. Reads therefore scale with total record count, not page size. Revisit server-side pagination/aggregation for a very large shared product. Keep an eye on Firestore quota and review dependencies before wider production use.

## 5. Exports

- **Export view · CSV** exports all matching filtered rows, across all pages, in the selected sort order.
- **Export all · CSV** exports the complete journal in date order.
- **Export all · Excel** downloads a real `.xlsx` workbook with Daily Tracker, Monthly Summary and Read Me sheets. ExcelJS loads only when needed.
- Both keep the exact ten workbook field names, followed by Trade Count.
- CSV uses UTF-8 with BOM for ₹ support, quotes multiline notes, and neutralizes spreadsheet formula prefixes in user text. In Excel, use Data → From Text/CSV → UTF-8 if your locale does not open comma-delimited files automatically.
- Excel sheets have frozen headers, filters, widths, rupee number formats and percent formatting.
- Exports contain calculated snapshots, not live formulas or app charts. Make edits in the app and export again to update the results. Imports and automatic restore are not implemented.

## 6. Build and deploy

```sh
npm run build
```

Output: `dist/trading-journal/browser/`. Do not deploy the development server. Production uses real Firebase mode; configure Firebase before publishing.

### GitHub Pages

Target: https://dineshprodapt.github.io/trading-journal/

1. Open repository **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
2. In Firebase project `trading-journal-55b0f`, open **Authentication → Settings → Authorized domains** and add `dineshprodapt.github.io` (no `https://` or path).
3. Open **Actions → Deploy Trading Journal to GitHub Pages → Run workflow**, select `main`, and run it. Later pushes to `main` deploy automatically.
4. Wait for both build and deploy jobs to succeed, then open the target URL and sign in with Google.

The workflow installs locked dependencies, runs calculation tests, and builds using `npm run build:pages` (`ng build --configuration production,github-pages`). It copies `dist/trading-journal/browser/` into the tracked `docs/` folder, removes stale generated files, and commits changed build files back to `main` as `github-actions[bot]`. It then deploys those same files to GitHub Pages. No commit is created if the output is unchanged. Generated commits use `[skip ci]`, and pushes changing only `docs/` are ignored to prevent build loops. Keep Pages Source set to **GitHub Actions**. Pull `main` before your next local push to include automated build commits. The workflow uses a normal push (never force-pushes); if a concurrent source push or branch protection blocks it, the job fails rather than overwriting changes. The Pages-only configuration sets `/trading-journal/` as the base path and uses hash routing (`#/login`, `#/journal`) so bookmarks and refresh work on static hosting. Other build configurations keep their existing routing.

Firebase remains the backend; use the same Google account to access existing entries. This workflow does not deploy Firestore rules or change Firebase settings. If deployment reports Pages is not enabled, complete step 1 and rerun the workflow.

### Firebase Hosting

Set up Firebase and deploy rules as above, then:

```sh
npm run build
npx firebase login
npx firebase deploy --only hosting,firestore:rules,firestore:indexes --project trading-journal-55b0f
```

The included Hosting config rewrites routes to `index.html` so `/journal` and `/login` work on refresh. It also sets basic security headers. Firebase will print your hosting URL. Add its hostname to Firebase Auth's authorized domains and test both sign-in methods on that URL. No deployment has been performed for you.

### Vercel (alternative)

1. Put this project in your own Git repository and import it in Vercel.
2. Set build command `npm run build`; output directory `dist/trading-journal/browser`; use a compatible Node 24.x runtime.
3. `vercel.json` contains the SPA rewrite.
4. Set the public Firebase config in source before building. Angular does not automatically consume Vercel environment variables; adding an env-generation script is a separate option.
5. Deploy Firestore rules using the Firebase CLI even when Vercel hosts the frontend.
6. Add the Vercel production hostname to Firebase Authentication authorized domains. Authorize preview hostnames only when you intend to use those previews.

No secrets belong in this static bundle. `.env` alone is not Angular runtime configuration.

## 7. Project layout and key implementation examples

```text
trading-journal/
  src/
    main.ts
    styles.scss
    environments/
      firebase.config.ts
      environment.ts
      environment.development.ts
    app/
      app.ts
      app.config.ts
      app.routes.ts
      core/
        auth.service.ts
        auth.guard.ts
        journal.model.ts
        journal.service.ts
        export.service.ts
      pages/
        login.component.ts
        journal.component.ts
        journal.component.html
      shared/
        trend-chart.component.ts
  tests/
    calculations.test.ts
    firestore.rules.test.ts
    e2e/journal.spec.ts
  angular.json
  firebase.json
  firestore.rules
  firestore.indexes.json
  vercel.json
  playwright.config.ts
  package.json
  package-lock.json
  README.md
  VALIDATION.md
```

**Model:** stored money is paise, and optional capital/counts are explicitly nullable.

```ts
interface Entry {
  date: string;
  startingCapital: number | null;
  pnl: number;
  notes: string;
  tradeCount: number | null;
  revision: number;
}
```

**Routing:** standalone pages are lazy loaded and journal access is guarded.

```ts
{ path: 'journal', canActivate: [authGuard],
  loadComponent: () => import('./pages/journal.component')
    .then(m => m.JournalComponent) }
```

**Guard:** wait for Firebase session restoration before redirecting.

```ts
const auth = inject(AuthService),
  router = inject(Router);
await auth.ready;
return auth.demo || !!auth.user() || router.createUrlTree(['/login']);
```

**CRUD service:** use a deterministic document ID and check the existing revision inside a transaction (see `journal.service.ts` for the complete implementation).

```ts
const ref = doc(db, 'users', user.uid, 'entries', entry.date);
await runTransaction(db, async (tx) => {
  const previous = await tx.get(ref);
  // Verify expected revision / reject duplicate before writing.
  tx.set(ref, entry);
});
```

**Component calculations:** computed signals respond to Firestore updates.

```ts
all = computed(() => dailyRows(this.journal.entries()));
period = computed(() => this.all().filter((e) => !this.month() || e.month === this.month()));
metrics = computed(() => summary(this.period()));
```

**Charts:** `trend-chart.component.ts` creates/destroys Chart.js instances with explicit Date/Month x-axis labels and P&L (₹) y-axis labels. The source tables provide the same values in accessible text form.

### Scaffold the project yourself (optional)

The ZIP already contains the full working project. Do not run these commands inside the extracted folder. For a fresh project elsewhere:

```sh
npx @angular/cli@22.2.1 new trading-journal --routing --style=scss --standalone --skip-tests --ssr=false
cd trading-journal
npm install bootstrap@5 chart.js firebase exceljs
npm install -D tsx @firebase/rules-unit-testing firebase-tools @playwright/test
```

Then copy the supplied source and config files. `styles.scss` imports Bootstrap CSS; no CDN dependency or Bootstrap JavaScript is required. Angular handles modal/form interactions. `angular.json` supplies development environment replacement. The included lockfile is the reproducible installation route; use `npm ci` for this delivered project.

## 8. Tests

```sh
npm test
npm run build
```

Calculation tests cover blank/zero semantics, chronology, prior-day edits/deletion, monthly boundaries, trade counts, input validation and CSV escaping.

For rules tests, install **JDK 21+**, verify `java -version`, then:

```sh
npm run test:rules
```

This launches only a local emulator under `demo-trading-journal`. It does not access a live Firebase project. The rules test checks owner CRUD, cross-user and unauthenticated denial, schema validation and stale revisions.

For browser tests (local demo mode must be enabled):

```sh
npx playwright install chromium
npm run test:e2e
```

The suite starts `ng serve` when needed and exercises CRUD, reload persistence, duplicate prevention, metrics, filtering, pagination, sorting, export and a 390px mobile layout. See VALIDATION.md for what was actually executed in the delivery environment.

## 9. Troubleshooting

- **`ng` not recognized:** use `npm start` or `npx ng serve`; global Angular CLI is unnecessary.
- **PowerShell blocks npm.ps1:** use Command Prompt or `npm.cmd ci` / `npm.cmd start`.
- **Unsupported Node engine:** update Node to a compatible version listed above.
- **Permission denied on save/read:** deploy `firestore.rules` to the same project as the config and sign in. Do not use public read/write rules as a workaround.
- **Google unauthorized domain:** add the hostname to Firebase Auth authorized domains.
- **Missing provider:** enable Google or Email/Password in the Firebase console.
- **Blank real account:** demo records are separate and do not auto-migrate; ensure the same sign-in account is used across devices.
- **Transaction failure offline:** reconnect and retry; the form retains your input.
- **Quota exceeded:** check the usage console. Upgrading billing is optional and can incur charges.
- **Duplicate date:** use Edit on that day rather than creating another record.
- **Port 4200 already occupied:** `npm start -- --port 4300` and open localhost:4300.

## Official references

Verified during implementation, 7 October 2026:

- Angular releases: https://angular.dev/reference/releases
- Angular Node/TypeScript compatibility: https://angular.dev/reference/versions
- Firebase Auth: https://firebase.google.com/docs/auth/web/start
- Firestore rules: https://firebase.google.com/docs/firestore/security/get-started
- Firebase Hosting: https://firebase.google.com/docs/hosting/quickstart
- Free quota and pricing: https://firebase.google.com/docs/firestore/pricing

This is a manual trading journal, not a broker integration or automated trading system.

## Temporary account restriction

Only the verified Google account `dineshmick@gmail.com` is currently allowed. Other accounts are signed out, shown an Unauthorized access popup, and returned to login. Restored sessions are checked too. The app validates access before starting journal reads.

Policy: `src/app/core/access-policy.ts`. To reopen access later, set `restricted: false` and change `restrictedAccess()` in `firestore.rules` to return `false`; deploy both. To extend the allowlist, update both email lists instead.

**Required Firebase step:** deploy the updated rules using `npx firebase deploy --only firestore:rules --project trading-journal-55b0f`, or paste the entire `firestore.rules` file into Firebase Console → Firestore Database → Rules and Publish. GitHub Pages only deploys the frontend; committing rules does not activate them in Firebase. The rules keep owner-only access and schema validation even when the temporary restriction is disabled. Firebase Authentication may still list rejected accounts because Google authentication happens before application authorization.
