require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const express = require('express');
const cors = require('cors');
const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");
const printerDriver = require("@thiagoelg/node-printer");
const Store = require('electron-store');

const store = new Store();
const HTTP_PORT = process.env.HTTP_PORT || 5463;
let mainWindow;
let httpServer;
let serverRunning = false;

function sendLog(message, type = 'info') {
  console.log(message);
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('log', { message, type });
  }
}

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
      sendLog('Received HTTP print request', 'info');
      await printData(req.body);
      sendLog('Print job completed', 'success');
      res.json({ status: 'success', message: 'Print job completed' });
    } catch (error) {
      sendLog(`Error processing print request: ${error.message}`, 'error');
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  expressApp.get('/printers', async (req, res) => {
    try {
      const printers = await getPrinters();
      res.json({ printers });
    } catch (error) {
      console.error('Error getting printers:', error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.get('/settings', (req, res) => {
    res.json({
      printerName: store.get('printerName', ''),
      paperWidth: store.get('paperWidth', 48)
    });
  });

  httpServer = expressApp.listen(HTTP_PORT, () => {
    sendLog(`HTTP server started on http://localhost:${HTTP_PORT}`, 'success');
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
        sendLog('HTTP server stopped', 'info');
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
  const printers = printerDriver.getPrinters();
  return printers.map(p => ({ name: p.name }));
}

async function printData(data) {
  const printerName = store.get('printerName', 'POS_PRINTER');
  const paperWidth = store.get('paperWidth', 48);

  let printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${printerName}`,
    driver: printerDriver,
    width: paperWidth,
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error("Printer couldn't connect");
  }

  if (data.text) {
    printer.println(data.text);
  }

  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(item => {
      printer.println(item);
    });
  }

  printer.cut();

  try {
    await printer.execute();
    console.log('Printed successfully!');
  } catch (err) {
    console.error('Error printing:', err);
    throw err;
  }
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
