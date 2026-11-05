const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let serverProcess;

function startBackendServer() {
  try {
    // Start backend server
    process.env.PORT = '5000';
    // Set writable database path in user data folder if packaged, or current directory
    const userDataPath = app.getPath('userData');
    process.env.DB_PATH = path.join(userDataPath, 'daybook.db');

    require('./server/index.js');
    console.log('DayBook embedded backend started.');
  } catch (err) {
    console.error('Error starting backend server:', err);
  }
}

function waitForServer(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Server start timed out'));
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
}

async function createWindow() {
  startBackendServer();

  try {
    await waitForServer('http://localhost:5000/api/health');
  } catch (e) {
    console.error('Failed to wait for backend server:', e);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Personal Digital Day Book',
    icon: path.join(__dirname, 'client/public/favicon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  // Load backend (which serves the built production React frontend)
  mainWindow.loadURL('http://localhost:5000');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Standard clean window menu
  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
