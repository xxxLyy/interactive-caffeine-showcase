mixin () {
  public query func getApiDoc() : async Text {
    "# Backend API\n" #
    "\n" #
    "## Purpose\n" #
    "\n" #
    "This app is a frontend-only interactive audiovisual instrument. The backend stores no app-specific data: no presets, recordings, sessions or user content. Its public surface is limited to shared sign-in / role bookkeeping and an empty OQL data endpoint. There is nothing domain-specific to read or write through this canister.\n" #
    "\n" #
    "## Methods\n" #
    "\n" #
    "### Identity and roles\n" #
    "\n" #
    "- `_internet_identity_sign_in_start() : async Blob` (update) - issues a sign-in challenge used by the app's Internet Identity attribute flow. Intended for the app frontend; direct callers rarely need it.\n" #
    "- `_internet_identity_sign_in_finish() : async Result<(), Error>` (update) - registers the caller (see Registration) and then verifies the pending sign-in challenge. Returns `#err` when verification fails; registration still happens for a non-anonymous caller even when verification returns `#err`.\n" #
    "- `_initialize_access_control() : async ()` (update) - registers the caller. Anonymous callers are ignored (no-op). Already-registered callers are unchanged.\n" #
    "- `getCallerUserRole() : async UserRole` (query) - returns `#admin`, `#user` or `#guest` for the caller. Anonymous callers get `#guest`. A signed-in but unregistered caller traps with `User is not registered`.\n" #
    "- `isCallerAdmin() : async Bool` (query) - `true` only for the admin. Anonymous callers get `false`. Unregistered signed-in callers trap with `User is not registered`.\n" #
    "- `assignCallerUserRole(user : Principal, role : UserRole) : async ()` (update) - admin-only; sets `user`'s role. Non-admins trap with `Unauthorized: Only admins can assign user roles`; unregistered callers trap with `User is not registered`.\n" #
    "\n" #
    "`UserRole` is the Candid variant `{ admin; user; guest }`.\n" #
    "\n" #
    "### Data query (OQL)\n" #
    "\n" #
    "- `schema() : async Text` (query) - JSON schema document of queryable entities. This app registers **no entities**, so the schema lists none.\n" #
    "- `execute(qJson : Text) : async Result` (query) - runs a JSON OQL query. With no entities registered, any query naming an entity finds nothing to read. Malformed JSON traps with a message starting `OQL: invalid query - `.\n" #
    "\n" #
    "## Authentication and identity\n" #
    "\n" #
    "- No app method requires sign-in for product features, because the app has no backend product features.\n" #
    "- Role methods distinguish anonymous callers (treated as `#guest`) from signed-in callers.\n" #
    "- The app's frontend pins an Internet Identity derivation origin, published at `/.well-known/ii-derivation-origin` when available. An agent already holding the user's Internet Identity authorization derives the correct per-app principal against that origin (for example `icp identity link web <name> --app <host>`). Such a delegation acts with the user's full authority in this app until it expires.\n" #
    "\n" #
    "## Registration\n" #
    "\n" #
    "- A direct API caller registers by calling `_initialize_access_control` once as a signed-in (non-anonymous) caller, before calling `getCallerUserRole`, `isCallerAdmin` or `assignCallerUserRole`.\n" #
    "- The first principal ever to register becomes `#admin`; every later principal becomes `#user`.\n" #
    "- Registration normally happens only when a user signs in through the app's own frontend. A principal that never did so is unregistered even if it belongs to the app's owner, and a principal derived against a different origin is a different principal from the one the frontend registered. Unregistered signed-in callers trap with `User is not registered` on role queries.\n" #
    "\n" #
    "## Units and encoding\n" #
    "\n" #
    "- Principals are standard IC principals. The challenge is an opaque `Blob`. OQL queries and schema are JSON text. No timestamps or amounts are exposed.\n" #
    "\n" #
    "## Lifecycle and polling\n" #
    "\n" #
    "- There is no asynchronous work, job state or data that changes over time beyond role registration. Polling is never needed.\n" #
    "\n" #
    "## Retry safety\n" #
    "\n" #
    "- `_initialize_access_control` is idempotent: repeating it never changes an existing role.\n" #
    "- `assignCallerUserRole` is idempotent for the same arguments; it overwrites the target's role, including demoting an admin.\n" #
    "- Queries have no side effects.\n" #
    "\n" #
    "## Errors and gotchas\n" #
    "\n" #
    "- Errors are traps (rejects), not result values, except `_internet_identity_sign_in_finish`, which returns `#err` on failed verification.\n" #
    "- Calling a role query before registering traps rather than returning `#guest`.\n" #
    "- Presets, recordings and other instrument state live only in the browser and are not available from this backend."
  };
};
