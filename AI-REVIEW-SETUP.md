# Monthly AI review

The Mistakes page sends a month identifier to an authenticated Firebase callable function. The function reads that user's notes itself, applies the same account policy as the app, and sends only dates, notes and the configured trading rules to OpenAI. No capital, P&L, email or user ID is sent to the model. The API key stays in Secret Manager.

## Enable live analysis

1. Enable Firebase's Blaze billing plan for Cloud Functions and provide an OpenAI API project with billing and access to the chosen model. Configure spending alerts in both services.
2. From the repository root, run:

   ```powershell
   npm.cmd ci --prefix functions
   npx.cmd firebase login
   npx.cmd firebase functions:secrets:set OPENAI_API_KEY --project trading-journal-55b0f
   npx.cmd firebase deploy --only "functions:journal:analyzeMonth,firestore:rules" --project trading-journal-55b0f
   ```

   Enter the key only into the secret prompt, never into Angular source or chat. The deployment uses Node 22 and region `asia-south1`. `REVIEW_MODEL` defaults to `gpt-4.1`; change it via Firebase parameter configuration to a model supporting Responses and Structured Outputs, then redeploy. The client region must match the function region.
3. Build and publish the updated frontend using the existing Firebase Hosting or GitHub Pages deployment workflow. GitHub Pages can call the Firebase function directly through the Firebase SDK.
4. Sign in, open Mistakes, select a month and choose **Analyze month with AI**. Compare the findings and excerpts with your notes before relying on them.

No cloud deployment, billing activation or live model evaluation is implied by local tests.

## Behavior and limits

- Supported repeated mistakes appear first, followed by isolated observations and uncertain interpretations. Counts are distinct journal days, never inferred trade counts.
- Every citation must match the original note exactly. Invalid citations, incomplete responses and refusals fail the review without replacing an existing report. Citation validation cannot prove the model's interpretation is correct.
- Reports are saved under `users/{uid}/monthlyReviews/{month}`. Only their owner may read them; only the backend writes them. Rate-limit documents are server-only.
- A SHA-256 fingerprint covers all nonblank notes, trading rules and review version. Changed/deleted notes or changed rules mark the report stale. Unchanged requests reuse the saved report. Model changes invalidate the backend cache.
- Each account may start at most 10 noncached attempts per UTC day, including failed attempts. A processing lock across all months is released when the request finishes; it expires after three minutes if interrupted. Processing conflicts and daily limits have separate messages. Requests are bounded to 31 notes of 2,000 characters and 12,000 output tokens. Existing cached reports do not consume attempts.
- Requests set `store: false`. This does not promise zero provider retention; review the provider's data policies for your account. Saved reports contain private note excerpts in your Firestore account.
- The old phrase detector remains in an explicitly labeled collapsed section; it is never presented as AI output. Demo mode cannot call paid analysis.
- Rules are compiled from [trading-rules.config.ts](src/app/core/trading-rules.config.ts). Redeploy both backend and frontend when these rules or [access-policy.ts](src/app/core/access-policy.ts) change; keep Firestore rules in sync with account access.

## Validation

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build --prefix functions
npm.cmd test --prefix functions
npm.cmd run test:rules
npx.cmd playwright test tests/e2e/mistakes.spec.ts
```

For a live quality check use a test account/project allowed by its access policy. Include differently worded loss-recovery entries on two dates, a negated example ('avoided revenge trading'), a future intention, a profitable rule violation, a normal losing trade and an ambiguous note. Verify semantic grouping, exclusion of negations/intentions, uncertainty labels and correct date counts. Edit/delete a note, confirm staleness, regenerate, and confirm reuse on a second unchanged request. These checks require a deployed backend and a real API key.

References: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Firebase callable functions](https://firebase.google.com/docs/functions/callable), [Firebase secrets and parameters](https://firebase.google.com/docs/functions/config-env).
