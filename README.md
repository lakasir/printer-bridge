# Lakasir Printer Bridge

Electron app that connects your web application to thermal printers via HTTP API. Supports Windows, Linux, and macOS.

## Installation

### Option 1: Download Pre-built Installer (Recommended)

**Windows:**
1. Download `Lakasir-Printer-Bridge-Setup-1.0.0.exe` from releases
2. Run the installer
3. Launch "Lakasir Printer Bridge" from Start Menu

**macOS:**
1. Download `Lakasir-Printer-Bridge-1.0.0.dmg` from releases
2. Open the DMG and drag to Applications
3. Launch from Applications folder

**Linux:**
1. Download `Lakasir-Printer-Bridge-1.0.0.AppImage` or `.deb`
2. For AppImage: `chmod +x Lakasir-Printer-Bridge-1.0.0.AppImage && ./Lakasir-Printer-Bridge-1.0.0.AppImage`
3. For deb: `sudo dpkg -i Lakasir-Printer-Bridge-1.0.0.deb`

### Option 2: Build from Source

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build for current platform
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

Built installers will be in the `dist/` folder.

## Configuration

1. Launch the app
2. HTTP server starts automatically on port 8888
3. Use "Start Server" / "Stop Server" buttons to control server state
4. Select your printer from the dropdown (lists all system printers)
5. Set paper width if needed (default: 48 characters)
6. Click "Save Settings"

Settings are automatically saved and persist between restarts.

**Note:** The app uses your operating system's native print system, so ensure your printer is properly installed and configured in your OS settings first.

## Usage

### HTTP API

```javascript
// Send print job
fetch('http://localhost:8888/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello World',
    items: ['Line 1', 'Line 2']
  })
})
.then(res => res.json())
.then(data => console.log(data));

// Get available printers
fetch('http://localhost:8888/printers')
  .then(res => res.json())
  .then(data => console.log(data.printers));

// Get current settings
fetch('http://localhost:8888/settings')
  .then(res => res.json())
  .then(data => console.log(data));
```

## Data Format

Send JSON with either:
- `text`: Single string to print
- `items`: Array of strings (each on new line)

```json
{
  "text": "Hello World"
}
```

or

```json
{
  "items": ["Line 1", "Line 2", "Line 3"]
}
```

## Endpoints

- **HTTP API:** `http://localhost:8888`
  - `POST /print` - Send print job
  - `GET /printers` - List available printers
  - `GET /settings` - Get current settings

## Supported Platforms

- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, Debian, Fedora, etc.)

## Troubleshooting

**Printer not showing up?**
- Ensure printer is connected and drivers installed
- Restart the application
- Check printer name matches system printer name

**Connection refused?**
- Ensure app is running
- Click "Start Server" button in the app if server is stopped
- Check firewall settings allow connections to port 8888
- Try `localhost` instead of `127.0.0.1` or vice versa

## Files

- `main.js` - Electron main process with HTTP server
- `index.html` - Settings UI
- `print.js` - Original print script (reference)
- `example-client.js` - Example HTTP client
