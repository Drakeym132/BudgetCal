import { app, BrowserWindow, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// Reduce resize lag on Windows by disabling smooth resize
app.commandLine.appendSwitch('disable-smooth-resize');

// Optional Chromium flags for experimentation (comma or space separated)
// Example: ELECTRON_FLAGS="disable-features=DelegatedCompositing,enable-features=SomeFlag"
const extraFlags = process.env.ELECTRON_FLAGS;
if (extraFlags) {
  extraFlags
    .split(/[\s,]+/)
    .map((flag) => flag.trim())
    .filter(Boolean)
    .forEach((flag) => {
      const [name, value] = flag.split('=');
      if (value !== undefined) {
        app.commandLine.appendSwitch(name, value);
      } else {
        app.commandLine.appendSwitch(name);
      }
    });
}

let mainWindow;

const resolveDataPath = () => path.join(app.getPath('userData'), 'budgetcal-data.json');

const getActiveWindow = () => BrowserWindow.getFocusedWindow() ?? mainWindow;

const loadBudgetData = async () => {
  try {
    const contents = await fs.readFile(resolveDataPath(), 'utf-8');
    return JSON.parse(contents);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to load budget data', error);
    }
    return null;
  }
};

const saveBudgetData = async (payload) => {
  try {
    await fs.mkdir(path.dirname(resolveDataPath()), { recursive: true });
    await fs.writeFile(resolveDataPath(), JSON.stringify(payload, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Failed to persist budget data', error);
    return { success: false, error: error.message };
  }
};

const sendMaximizeState = () => {
  if (!mainWindow) return;
  mainWindow.webContents.send('window:maximize-changed', mainWindow.isMaximized());
};

const registerIpcHandlers = () => {
  ipcMain.handle('budget:load', () => loadBudgetData());
  ipcMain.handle('budget:save', (_event, payload) => saveBudgetData(payload));

  ipcMain.handle('window:minimize', () => getActiveWindow()?.minimize());
  ipcMain.handle('window:close', () => getActiveWindow()?.close());
  ipcMain.handle('window:is-maximized', () => getActiveWindow()?.isMaximized());
  ipcMain.handle('window:toggle-maximize', () => {
    const window = getActiveWindow();
    if (!window) return false;
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
    return window.isMaximized();
  });
};

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 1024,
    minHeight: 768,
    useContentSize: true,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fa',
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  const targetUrl = isDev ? 'http://localhost:5173' : new URL('../dist/index.html', import.meta.url).toString();

  if (isDev) {
    await mainWindow.loadURL(targetUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadURL(targetUrl);
  }

  // Some macOS setups never emit ready-to-show; ensure the window becomes visible.
  mainWindow.show();
  mainWindow.focus();

  mainWindow.webContents.setFrameRate(60);
  mainWindow.webContents.setBackgroundThrottling(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  mainWindow.on('maximize', sendMaximizeState);
  mainWindow.on('unmaximize', sendMaximizeState);
  mainWindow.on('closed', () => { mainWindow = null; });

  sendMaximizeState();
};

registerIpcHandlers();

app.whenReady().then(async () => {
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
