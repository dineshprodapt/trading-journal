# Finish connecting your Firebase backend

Project: **trading-journal-55b0f**

Your web configuration is already in `src/environments/firebase.config.ts`. Development and production have demo disabled. The code is ready to save records to Firestore after these project-owner steps.

## 1. Keep the project on Spark

Open https://console.firebase.google.com/project/trading-journal-55b0f/overview and confirm the plan is Spark. Do not link a billing account or upgrade to Blaze for this journal. The app uses Authentication and Firestore, not Cloud Functions, Cloud Storage or Firebase App Hosting. The supplied storageBucket and measurementId are configuration metadata; no uploads or Analytics are enabled by this app.

## 2. Enable sign-in

In Firebase Console → Build → Authentication → Get started:

- Enable Email/Password (standard password login; email-link login is not required).
- Enable Google and choose the support email when prompted.
- Under Settings → Authorized domains, ensure `localhost` is present. Add `127.0.0.1` only if you use that hostname. Later add your actual deployed site's hostname.

## 3. Create the database

Open Build → Firestore Database → Create database. Choose Standard edition if an edition choice appears, the `(default)` database, and an available region appropriate for you. Choose production/locked mode. Do not enable open test-mode rules. If a step requests a billing upgrade, stop and confirm you selected Firestore Standard rather than another service or paid feature.

## 4. Install and deploy access rules

Extract the ZIP and open a terminal inside `trading-journal`:

```sh
npm ci
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project trading-journal-55b0f
```

Sign in to the Google account that owns this project when the CLI opens your browser. Do not send the CLI token or Google password to anyone. The `.firebaserc` file also selects this project by default.

The command deploys the supplied owner-only rules and index configuration; it does not publish the website. It replaces this project's existing Firestore rules, so if this is an existing shared database, merge its rules with the included rules before deploying. No app-specific composite indexes are needed.

## 5. Run the app

```sh
npm start
```

Visit http://localhost:4200. Use **Create an account** or **Continue with Google**. Enter one daily record and save it.

Verify:

1. A successful save message appears.
2. Refresh the page; the entry remains.
3. In Firestore Console, find `users → your Firebase UID → entries → YYYY-MM-DD`.
4. Sign in on a second browser with the same account; the record is visible.
5. Sign in with a different account; the journal is separate.

Starting capital and P&L are stored in paise (₹100 = 10000); that is intentional. Only the signed-in owner's UID can access their documents through the web app rules. Your Firebase project administrators still retain administrative access.

## Optional hosting

After checking the app locally:

```sh
npm run build
npx firebase deploy --only hosting --project trading-journal-55b0f
```

Use Firebase **Hosting**, not App Hosting. Authorize the hostname printed by the deployment in Firebase Authentication. Hosting has its own quotas; check Firebase Console usage. No deployment has been made from this environment.

## If something fails

- `npm ci` fails with `EBUSY` while removing a path under `node_modules` on Windows: stop `npm start`, Angular serve/watch processes, and project tests, then close terminals using this folder. From Command Prompt in the project folder, remove the generated dependency directory and retry:

	```bat
	rmdir /s /q node_modules
	npm ci
	```

	If removal still reports that a file is in use, restart Windows to release the lock and retry. Do not remove files outside `node_modules`. The `Unknown user config "python"` warning is separate and does not cause `EBUSY`.
- `auth/operation-not-allowed`: enable the relevant sign-in provider.
- `auth/unauthorized-domain`: add the hostname under Authentication settings.
- `permission-denied`: sign in and deploy the supplied rules to this exact project.
- Missing database: create the default Firestore database first.
- Save fails offline: reconnect and retry; the form retains your input.
- Old demo entries missing: demo data is local-only and is not automatically copied into Firebase.

The public Firebase configuration does not grant permission to deploy rules or administer the project. Those actions require your authenticated owner session. Cloud sign-in/storage have not been verified until you complete the steps above.

#### Commands to connect firebase
npm ci
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project trading-journal-55b0f
npm start