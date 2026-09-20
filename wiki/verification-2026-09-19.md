# Verification record — September 18–19, 2026

Scope: source `442a2a3` plus the account-browser change; signed Debug app, Xcode 27.0 (27A266a), iPhone 17 Pro / iOS 26.5, live API target. This is a smoke check, not a full regression run or release certification.

| Check | Result |
| --- | --- |
| Native build/install | Passed after temporary local dependency workarounds; see runbook |
| TypeScript / iOS development bundle | Passed |
| Study dashboard/map | Loaded; synthetic San Francisco coordinates correctly showed outside-area state |
| History | Existing sessions loaded; current-period filter and clearing worked |
| Rankings | Individual rankings loaded; groups showed empty state |
| Profile | Account/org and free-subscription state loaded |
| Unpaid-admin gates | Admin navigation and Clock In opened the paywall |
| Organization registration | Opened inside Safari View Controller with visible greekgeek.app domain; Done returned to welcome |
| Profile password recovery | Reset form opened inside Safari View Controller; dismissal returned to Profile |
| Native auth screens | Sign-in displayed; Register With Code opened native lookup screen |
| Account deletion | UI/API source inspected; deletion not executed |
| Push token registration | Failed: HTTP 500, duplicate user/device unique constraint |
| iOS 27 launch | Failed: required UIScene lifecycle missing |
| Backend | Earlier system check passed; billing tests blocked by local PostgreSQL password authentication |

The saved test organization was non-premium despite its label. RevenueCat development offering showed $79.99/year without an introductory trial. No purchase, new account, password reset email, deletion or study session was created. September 19 account-flow checks signed the simulator out.

## Not verified in this run

Successful credential submission, complete new organization/member onboarding, email delivery, successful clock-in/out, offline recovery, physical-device geofence exits, premium admin operations, purchase/restore, production subscription configuration, push delivery, Android and release/TestFlight behavior remain to be tested. No App Review submission or backend deployment was performed.

The April QA record is historical and must not be combined with these results to claim a current full pass.
