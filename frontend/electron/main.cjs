const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 850,
    minHeight: 650,
    backgroundColor: '#f7f8fb',
    title: 'Northstar | Controller Monitor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const builtPage = path.join(__dirname, '../dist/frontend/browser/index.html');
  const development = process.argv.includes('--dev');
  if (!development && (app.isPackaged || fs.existsSync(builtPage))) {
    window.loadFile(builtPage);
  } else {
    window.loadURL('http://127.0.0.1:4200');
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
