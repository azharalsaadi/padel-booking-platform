## Padel Booking Platform — Local Development

Run this alongside the `backend` app (see `backend/README.md`, including the cross-origin cookie notes — required for admin login to work).

```bash
npm install
cp .env.example .env      # VITE_API_BASE_URL defaults to http://localhost:8000/api
npm run dev                # http://localhost:5173
```

Visit `http://localhost:5173` for the customer flow, or `http://localhost:5173/admin/login` for the admin dashboard (seeded demo login: `admin@padel.test` / `Password123!`, from the backend's `AdminUserSeeder`).

```bash
npm test                   # vitest — all API calls are HTTP-transport-mocked, no backend needed
npm run build               # tsc -b && vite build
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
