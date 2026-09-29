# Astra local checks

Production loads none of these test fixtures. No test makes Firebase calls.

Requirements: Node.js compatible with jsdom 30.1.1 and npm. Install test-only dependencies and run from this directory:

```sh
cd tests
npm install
npm test
```

The schedule test also runs without dependencies:

```sh
node tests/astra-schedule.test.cjs
```

- `astra-schedule.test.cjs`: isolated ISO calendar / recurrence boundary cases.
- `dom-check.cjs`: mounts the real local script owners in JSDOM; exposes setup to other tests. Browser layout and media queries are not exercised.
- `integration.cjs`: selected-day Home, completion, XP, composer, metadata draft, calendar and reports.
- `split-test.cjs`: preserves task/habit history and rewards when editing future occurrences.
- `social-test.cjs`: imports stripped only in test memory, Firebase construction/auth mocked, real render function exercised with explicit test fixtures. This does not validate Firestore rules or network writes.

To preview the application, serve the project root with an HTTP server. The application still requires its existing Firebase configuration and authorized origin for account operations.
