# eDEUR operator app

Canonical source: [`equipmentdeptpsc/edeur-mobile`](https://github.com/equipmentdeptpsc/edeur-mobile). The existing EAS project is **@psc-ed/edeur**, project ID `efd2d3a1-c3b4-405d-b571-78a605f3f575`. Keep this linkage when building from a fresh clone; do not initialize a new project.

## Fresh clone

Install Node.js and npm, then run `npm ci` from this repository. The lockfile is tracked; `node_modules` is generated locally and is not committed. This works on Windows, Linux, or Android/Termux where Expo's Node requirements are met.

Copy `.env.uat.example` to `.env.uat` and supply the UAT client configuration for local development. `.env.uat` is ignored. For cloud development or EAS, provide those same `EXPO_PUBLIC_*` values through the process/EAS build environment; `app.config.js` uses process variables first and the local file as a fallback. The Supabase anon key is client-visible, while privileged keys, tokens, PINs, and service-role credentials must never be put in the app config, repository, or Expo environment. Missing UAT configuration fails closed in the app.

`npm run dev:uat` starts a clean LAN development session. `npm run web:uat` starts UAT web using the local environment file. `npm run dev` uses the cross-platform Node invocation of the Expo CLI.

## Checks

Run `npm run typecheck`, `npm run test:operator-pin-login`, `npm run test:post-submit`, `npm run test:turnover-ui`, `npm run test:session-hydration`, `npm run test:keep-awake`, `npm run test:routing-bootstrap`, `npm run test:scenario8-idempotency`, and `npm run build:web`. Other focused checks are in `scripts/` and can be run with `node scripts/<filename>.mjs`. The existing `npm run lint` command needs tracked ESLint configuration and dependencies before it can serve as a reproducible check. `npx expo config --type public` confirms the resolved Expo identity; do not share its output when real environment values are loaded.

## Existing Android preview build

The tracked `app.json` links **@psc-ed/edeur** to the existing project ID. `eas.json` records an internal Android APK preview profile. The last independently verified installed APK was version **1.0.0**, Android version code **13**. Before the next build, check the existing EAS Android application identifier, signing credentials, and version-code source against that build. No Android package identifier or automatic version increment is introduced here because neither is established by this repository.

After that check and after configuring the UAT client values in the EAS **preview** environment, the build command is `eas build --platform android --profile preview`. A build is not part of this repository cleanup.
