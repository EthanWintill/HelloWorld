# Local development

Updated September 19, 2026. Commands run from this checkout; generated dependencies contain temporary workarounds, so a clean install is not yet proven reproducible.

## Mobile

See [mobile setup](../GreekGeekStudy/README.md). Use a native development build. The source API target currently points to the live service; changing the Metro URL does not switch the backend.

## Backend

From the repository root, create or repair the local environment:

```bash
python3 -m venv Backend/.venv
Backend/.venv/bin/pip install -r Backend/requirements.txt
cd Backend/GreekGeekApi
../.venv/bin/python manage.py check
../.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Settings call `load_dotenv()` without an explicit path. This checkout has an ignored root `.env`; configure environment variables or a discoverable local `.env`, and keep secrets out of git. PostgreSQL configuration uses `DB_NAME`, `DB_USER_NM`, `DB_USER_PW`, `DB_HOST`, and `DB_PORT`. Email uses `ZEPTOMAIL_TOKEN`, `ZEPTOMAIL_API_URL`, and `DEFAULT_FROM_EMAIL`; public URLs use `FRONTEND_URL`. Billing requires Stripe keys/price/webhook configuration and RevenueCat webhook authorization. Inspect [settings](../Backend/GreekGeekApi/GreekGeekApi/settings.py) for exact names and defaults.

With a reachable PostgreSQL database and test-database permissions:

```bash
cd Backend/GreekGeekApi
../.venv/bin/python manage.py test Study
```

`Backend/scripts/test.sh` currently points to `../venv/bin/python`, which does not match this machine's `.venv`; use the direct command above. The last backend system check passed, but the billing test run was blocked by PostgreSQL password authentication. Do not treat the historical test report as a fresh suite result.

Deployment scripts contain server-specific paths and service operations. Review them and configure production secrets separately before deployment; this documentation update does not deploy anything.

## Local Simulator Run — 2026-09-18

- Current checkout: `442a2a3` (merge of `origin/main`). This Mac now has Xcode 27.0 (`27A266a`) with the license accepted and simulator runtimes installed.
- Xcode 27 exposes simulators in **Device Hub** (`/Applications/Xcode.app/Contents/Applications/DeviceHub.app`, bundle id `com.apple.dt.Devices`). The installed Expo CLI cannot find the former Simulator app, so `expo run:ios` fails before building. Direct `xcodebuild` plus `xcrun simctl` works.
- A Debug simulator build succeeded after regenerating native configuration with `expo prebuild --platform ios --no-install` and applying the local dependency workarounds below. The native app installs and remains running on **iPhone 17 Pro / iOS 26.5**, device `97D9CF00-30B0-42AC-B5F2-45EBE3B74BBD`.
- **iOS 27 launch is currently broken:** the OS terminates this SDK-27-built app with `UIScene life cycle is required for apps built with this SDK`. Adopting the scene lifecycle through the Expo/React Native integration remains required before claiming iOS 27 compatibility.
- Metro must listen on IPv4 for this simulator setup. Use `NODE_OPTIONS=--dns-result-order=ipv4first npx expo start --dev-client --localhost --port 8081`. Without this, Node bound only to `::1` and the simulator's IPv4 connection was refused.
- API remains `https://greekgeek.app/`; its public landing route returned HTTP 200. After the Mac was unlocked, the existing simulator login for the `Apple Paid` organization loaded successfully.
- Rebuilt with `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-` for simulator signing; this removed the unsigned build's Keychain entitlement error banner. Leave signing enabled in future simulator builds.
- UI smoke checks passed: Study/dashboard and map load; a synthetic San Francisco location shows the expected outside-study-area state; History displays existing sessions, filters the current empty period, and restores all sessions after clearing; individual rankings load; Groups shows its empty state; Profile loads account/org data; admin navigation and Clock In both open the Pro paywall for this unpaid admin. This describes the September 18 run; September 19 account-flow checks signed out the simulator.
- Test limits: successful clock-in/out, background geofence exit, premium admin operations, purchase/restore, and notification delivery were not exercised. The saved organization is non-premium. No subscription was purchased and no study session was created.
- **Push registration backend issue observed:** `/api/notifications/token/` returns HTTP 500 with a duplicate-key violation on `Study_notificationtoken_user_id_device_id_71bdca3c_uniq`. The app remains usable, but push registration is not healthy for this saved account/device.
- RevenueCat is using its development Test Store key. The fetched preview is `$79.99/year` with no introductory trial, which differs from the documented launch offer. Production App Store pricing/trial configuration was not verified.

### Local build workarounds

These edits affect ignored generated/native dependency files, not committed app implementation. Reinstalling dependencies or regenerating Pods can remove them:

1. Pass `IPHONEOS_DEPLOYMENT_TARGET=16.4` to `xcodebuild`; Xcode 27 rejects several dependency resource targets' older minimum OS versions.
2. In `ios/Pods/RevenueCat/Sources/Paywalls/PaywallColor.swift`, move the existing private `init(stringRepresentation:underlyingColor:)` from its extension into the struct declaration. This suppresses a conflicting synthesized initializer under the new Swift compiler. Original backup: `/tmp/GreekGeek-PaywallColor.original.swift`.
3. In `node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift`, replace the conditional function-pointer argument (`set == nil ? nil : setter`) with an `if/else` that constructs `expo.HostObjectCallbacks` using either `nil` or a direct `setter` reference. Original backup: `/tmp/GreekGeek-JavaScriptRuntime.original.swift`.
4. Correct stale `/Users/mymac/Desktop/Workstation/projects/greekgeekstudy/GreekGeekStudy` references in generated `ios/Pods/Pods.xcodeproj/project.pbxproj` to this checkout. The stale path caused the ExpoImageManipulator shared framework phase to fail.

Build command, from `GreekGeekStudy`:

```bash
xcodebuild -workspace ios/GreekGeekStudy.xcworkspace -scheme GreekGeekStudy \
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=97D9CF00-30B0-42AC-B5F2-45EBE3B74BBD' \
  -derivedDataPath /tmp/greekgeek-simulator-build \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- IPHONEOS_DEPLOYMENT_TARGET=16.4 build
```

The first successful build targeted iOS 27; the final signed build targets iOS 26.5 to avoid the lifecycle failure. Build output: `/tmp/greekgeek-simulator-build/Build/Products/Debug-iphonesimulator/GreekGeekStudy.app`. Log: `/tmp/greekgeek-simulator-build.log`.
