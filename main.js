require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Store = require('electron-store');

const store = new Store();
const HTTP_PORT = process.env.HTTP_PORT || 8888;
let mainWindow;
let httpServer;
let serverRunning = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

function startHttpServer() {
  if (httpServer) return;

  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());

  expressApp.post('/print', async (req, res) => {
    try {
      console.log('Received HTTP print request:', req.body);
      await printData(req.body);
      res.json({ status: 'success', message: 'Print job completed' });
    } catch (error) {
      console.error('Error processing print request:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  expressApp.get('/printers', (req, res) => {
    const printers = printerDriver.getPrinters();
    res.json({ printers });
  });

  expressApp.get('/settings', (req, res) => {
    res.json({
      printerName: store.get('printerName', ''),
      paperWidth: store.get('paperWidth', 48)
    });
  });

  httpServer = expressApp.listen(HTTP_PORT, () => {
    console.log(`HTTP server started on http://localhost:${HTTP_PORT}`);
  });

  serverRunning = true;
  if (mainWindow) {
    mainWindow.webContents.send('server-status', { running: true, port: HTTP_PORT });
  }
}

function stopHttpServer() {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => {
        console.log('HTTP server stopped');
        httpServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function startServer() {
  startHttpServer();
}

async function stopServer() {
  await stopHttpServer();
  serverRunning = false;
  if (mainWindow) {
    mainWindow.webContents.send('server-status', { running: false, port: HTTP_PORT });
  }
}

function getPrinters() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = 'wmic printer get name';
    } else if (platform === 'darwin') {
      command = 'lpstat -p | awk \'{print $2}\'';
    } else {
      command = 'lpstat -p | awk \'{print $2}\'';
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const printers = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line !== 'Name' && line !== 'printer')
        .map(name => ({ name }));

      resolve(printers);
    });
  });
}

async function printData(data) {
  const printerName = store.get('printerName', 'POS_PRINTER');
  const paperWidth = store.get('paperWidth', 48);

  let content = '';

  if (data.text) {
    content += data.text + '\n';
  }

  if (data.items && Array.isArray(data.items)) {
    content += data.items.join('\n') + '\n';
  }

  const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, content);

  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command;

    if (platform === 'win32') {
      command = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${printerName}'"`;
    } else if (platform === 'darwin') {
      command = `lp -d "${printerName}" "${tempFile}"`;
    } else {
      command = `lp -d "${printerName}" "${tempFile}"`;
    }

    exec(command, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile);

      if (error) {
        console.error('Print error:', error);
        reject(error);
        return;
      }

      console.log('Printed successfully!');
      resolve();
    });
  });
}

ipcMain.handle('get-printers', async () => {
  try {
    return await getPrinters();
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
});

ipcMain.handle('get-settings', () => {
  return {
    printerName: store.get('printerName', ''),
    paperWidth: store.get('paperWidth', 48)
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('printerName', settings.printerName);
  store.set('paperWidth', settings.paperWidth);
  return { success: true };
});

ipcMain.handle('start-servers', async () => {
  await startServer();
  return { success: true, running: true, port: HTTP_PORT };
});

ipcMain.handle('stop-servers', async () => {
  await stopServer();
  return { success: true, running: false, port: HTTP_PORT };
});

ipcMain.handle('get-server-status', () => {
  return { running: serverRunning, port: HTTP_PORT };
});

app.whenReady().then(() => {
  createWindow();
  startServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer().then(() => {
      app.quit();
    });
  }
});
