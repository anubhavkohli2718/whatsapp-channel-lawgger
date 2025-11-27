# WhatsApp Web API - Baileys Implementation

A reliable WhatsApp Web API implementation using Baileys (no browser automation required).

## Features

- ✅ **No Browser Automation** - Uses WhatsApp's Multi-Device protocol directly
- ✅ **More Reliable** - Better compatibility with WhatsApp updates
- ✅ **Better Performance** - Faster and more efficient
- ✅ **Web Interface** - Beautiful web UI for testing
- ✅ **Real-time Updates** - Socket.io for live message updates
- ✅ **QR Code Authentication** - Easy setup with QR code scanning

## Installation

```bash
npm install
```

## Usage

1. **Start the server:**
```bash
npm start
```

2. **Open your browser:**
Navigate to `http://localhost:3000`

3. **Authenticate:**
- Scan the QR code with your WhatsApp
- Once connected, you can send and receive messages

## How It Works

- **Baileys** uses WhatsApp's Multi-Device protocol directly
- No browser automation needed (unlike wajs/whatsapp-web.js)
- More stable and reliable
- Better performance

## Project Structure

```
whatsapp web api/
├── baileys-server.js    # Main Baileys server
├── public/
│   └── index.html       # Web interface
├── auth_info_baileys/   # Authentication data (auto-created)
└── package.json
```

## Notes

- Authentication data is stored in `auth_info_baileys/` folder
- You only need to scan QR code once (session is saved)
- To start fresh, delete the `auth_info_baileys/` folder

## Comparison with wajs

| Feature | wajs | Baileys |
|---------|------|---------|
| Browser Automation | ✅ Required | ❌ Not needed |
| Reliability | ⚠️ Compatibility issues | ✅ More stable |
| Performance | ⚠️ Slower | ✅ Faster |
| Maintenance | ⚠️ Frequent updates needed | ✅ Less maintenance |

## Troubleshooting

- **QR Code not appearing**: Check console for errors
- **Connection issues**: Delete `auth_info_baileys/` and restart
- **Messages not sending**: Ensure phone number includes country code

