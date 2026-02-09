# BudgetCal

BudgetCal is a lightweight checking-account planner that combines a modern calendar UI with recurring and one-off transactions, all wrapped inside an Electron shell.

## Running the app

- `npm run dev` starts the Vite development server for quick front-end iterations inside a browser.
- `npm run electron:dev` waits for the dev server, launches Electron, and renders the same experience inside a frameless desktop window with a custom title bar (minimize / maximize / close).
- `npm run build` compiles the renderer bundle into `dist/`.
- `npm run electron:prod` opens the built bundle inside Electron for validation.
- `npm run lint` runs ESLint across the project.

### Optional Chromium flags (Electron)

You can pass Chromium flags to Electron for diagnostics or behavior tweaks using `ELECTRON_FLAGS`.

Windows PowerShell:

```
$env:ELECTRON_FLAGS="disable-features=DelegatedCompositing"
npm run electron:prod
```

Command Prompt:

```
set ELECTRON_FLAGS=disable-features=DelegatedCompositing
npm run electron:prod
```

## Local data persistence

When running under Electron, BudgetCal saves the transaction list, starting balance, and balance date to your OS's user-data folder (for example `%APPDATA%/BudgetCal/budgetcal-data.json` on Windows). The custom hook in `src/hooks/useTransactions.js` loads that file on every launch and mirrors every change back to disk, so your estimates persist between sessions without extra configuration.

## Key files

- `src/components/TitleBar.jsx` – renders the gradient navigation bar that hosts the brand, status copy, and minimize/maximize/close buttons wired to Electron via the `preload` bridge.
- `src/hooks/useTransactions.js` – now checks for `window.electronApi` and saves/loads the shared state using the IPC handlers exposed in `electron/main.js`.
- `electron/main.js` – boots a frameless `BrowserWindow`, registers the IPC handlers for file persistence and window controls, and feeds the renderer URL depending on the environment.
- `electron/preload.js` – exposes a safe API to the renderer so React can manipulate the host window and trigger filesystem writes without enabling node integration.

## Tips

- Keep the Vite dev server running while using `npm run electron:dev`; the `wait-on` utility ensures Electron waits for the front-end bundle.
- Production builds run from the `dist/` folder, so you can test by running `npm run build` before `npm run electron:prod`.
