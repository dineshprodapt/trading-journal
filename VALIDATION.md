# Delivery validation

Validated 7 October 2026.

## Executed

- Angular production build (`npm run build`) passed with strict template/type checking.
- Development server (`npm start -- --host 127.0.0.1`) compiled and started.
- All seven calculation and export tests (`npm test`) passed. They cover workbook blank/zero behavior, chronological totals, earlier edits/deletion, month boundaries, counts, validation, CSV injection escaping and Excel serialization.
- The delivered lockfile resolves Angular core/CLI 22.2.1, Bootstrap 5.3.8, Chart.js 4.5.1 and Firebase 12.19.0.

## Not executed successfully in this environment

- Browser interaction/visual tests: Chromium download returned an invalid archive. The Playwright suite is included, but desktop/mobile visual behavior has not been verified by a browser run here.
- Firestore rules emulator: installed Java is 17; Firebase CLI requires Java 21+. The owner-isolation/validation test is included for local execution after installing a suitable JDK.
- Live Firebase sign-in, cross-device persistence and deployment: the supplied public configuration is now installed, but no authenticated Firebase administrator session is available here. Run the setup checks in README.md before relying on the app with real data.

- Production dependency audit (`npm audit --omit=dev`) reported zero vulnerabilities after the dependency overrides. This is not a security certification.
- Included browser/rules test sources passed TypeScript checking.

## Implementation notes

- Firebase's Node-side gRPC transitive dependency is overridden to 1.14.5 to address the high-severity advisories found during dependency review. This is not a browser API change.
- ExcelJS’s transitive uuid package is overridden to 11.1.1; the in-memory Excel serialization test passed with this override.
- ExcelJS is a CommonJS dependency. Angular may print an optimization warning; export code is lazy loaded, and the production build succeeds.
- CSV and XLSX are snapshots. The original workbook's existing contents are not imported automatically.
- The cloud journal reads all of one user's daily documents and paginates locally. Suitable for a personal daily journal; large-scale products would need a different aggregation/query design.

The tests describe implemented behavior; included tests that could not run are not evidence of a successful end-to-end deployment.

## Firebase configuration update

Configured project trading-journal-55b0f; disabled demo in both environments; added .firebaserc and FIREBASE-SETUP.md. Authentication providers, Firestore database creation, project billing status and deployed rules have not been inspected or changed remotely. No real user data was written.
