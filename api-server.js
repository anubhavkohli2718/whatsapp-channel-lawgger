const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Store for the socket and state
let sock = null;
let qrCode = null;
let connectionStatus = 'disconnected';
let clientInfo = null;
let messageQueue = []; // Store incoming messages

// Ensure auth directory exists (important for Railway)
const authDir = path.join(__dirname, 'auth_info_baileys');
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

// Initialize Baileys
async function startBaileys() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['WhatsApp API', 'Chrome', '1.0.0'],
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCode = qr;
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            connectionStatus = 'disconnected';
            
            if (shouldReconnect) {
                console.log('Reconnecting...');
                setTimeout(() => startBaileys(), 3000);
            }
        } else if (connection === 'open') {
            connectionStatus = 'connected';
            console.log('Connected to WhatsApp!');
            
            // Get client info
            const me = sock.user;
            clientInfo = {
                pushname: me?.name || 'Unknown',
                wid: me?.id || 'Unknown',
                platform: 'Baileys'
            };
        } else if (connection === 'connecting') {
            connectionStatus = 'connecting';
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    const messageData = {
                        id: msg.key.id,
                        body: msg.message?.conversation || 
                              msg.message?.extendedTextMessage?.text || 
                              msg.message?.imageMessage?.caption ||
                              msg.message?.videoMessage?.caption ||
                              '[Media]',
                        from: msg.key.remoteJid,
                        timestamp: msg.messageTimestamp,
                        fromMe: msg.key.fromMe,
                        hasMedia: !!(msg.message?.imageMessage || 
                                    msg.message?.videoMessage || 
                                    msg.message?.audioMessage || 
                                    msg.message?.documentMessage),
                        type: msg.message?.imageMessage ? 'image' :
                              msg.message?.videoMessage ? 'video' :
                              msg.message?.audioMessage ? 'audio' :
                              msg.message?.documentMessage ? 'document' :
                              'text',
                        mediaUrl: msg.message?.imageMessage?.url ||
                                 msg.message?.videoMessage?.url ||
                                 msg.message?.audioMessage?.url ||
                                 msg.message?.documentMessage?.url ||
                                 null
                    };
                    
                    // Add to message queue
                    messageQueue.push(messageData);
                    
                    // Keep only last 100 messages
                    if (messageQueue.length > 100) {
                        messageQueue.shift();
                    }
                }
            }
        }
    });
}

// API Routes

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp API Server',
        version: '1.0.0',
        endpoints: '/api',
        health: '/api/health',
        status: '/api/status'
    });
});

// Get connection status
app.get('/api/status', (req, res) => {
    res.json({
        status: connectionStatus,
        info: clientInfo,
        hasQR: !!qrCode
    });
});

// Get QR code for authentication
app.get('/api/qr', async (req, res) => {
    if (!qrCode) {
        return res.status(404).json({ error: 'QR code not available' });
    }
    
    try {
        const qrImage = await qrcode.toDataURL(qrCode);
        res.json({ qr: qrImage });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Send message
app.post('/api/send', async (req, res) => {
    if (connectionStatus !== 'connected' || !sock) {
        return res.status(503).json({ error: 'WhatsApp is not connected' });
    }
    
    const { number, message } = req.body;
    
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }
    
    try {
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        const result = await sock.sendMessage(jid, { text: message });
        
        res.json({
            success: true,
            messageId: result.key.id,
            to: jid
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send media message
app.post('/api/send-media', async (req, res) => {
    if (connectionStatus !== 'connected' || !sock) {
        return res.status(503).json({ error: 'WhatsApp is not connected' });
    }
    
    const { number, mediaUrl, mediaType, caption } = req.body;
    
    if (!number || !mediaUrl) {
        return res.status(400).json({ error: 'Number and mediaUrl are required' });
    }
    
    try {
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        let message;
        
        if (mediaType === 'image') {
            message = { image: { url: mediaUrl }, caption: caption || '' };
        } else if (mediaType === 'video') {
            message = { video: { url: mediaUrl }, caption: caption || '' };
        } else if (mediaType === 'audio') {
            message = { audio: { url: mediaUrl } };
        } else if (mediaType === 'document') {
            message = { document: { url: mediaUrl }, mimetype: req.body.mimetype || 'application/octet-stream' };
        } else {
            return res.status(400).json({ error: 'Invalid mediaType. Use: image, video, audio, or document' });
        }
        
        const result = await sock.sendMessage(jid, message);
        
        res.json({
            success: true,
            messageId: result.key.id,
            to: jid
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get received messages
app.get('/api/messages', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const messages = messageQueue.slice(-limit).reverse();
    
    res.json({
        success: true,
        count: messages.length,
        messages: messages
    });
});

// Clear message queue
app.delete('/api/messages', (req, res) => {
    messageQueue = [];
    res.json({ success: true, message: 'Message queue cleared' });
});

// Get a specific message by ID
app.get('/api/messages/:id', (req, res) => {
    const message = messageQueue.find(m => m.id === req.params.id);
    
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json({ success: true, message: message });
});

// Logout / Disconnect
app.post('/api/logout', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
        }
        
        // Delete auth folder
        const authPath = path.join(__dirname, 'auth_info_baileys');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        connectionStatus = 'disconnected';
        clientInfo = null;
        qrCode = null;
        sock = null;
        
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check (Railway needs this)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        connection: connectionStatus,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Initialize Baileys
startBaileys().catch(console.error);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`\n✅ WhatsApp API Server running on http://${HOST}:${PORT}`);
    console.log(`📱 API endpoints available at http://${HOST}:${PORT}/api\n`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Auth directory: ${authDir}\n`);
    console.log('Available endpoints:');
    console.log('  GET  /                    - Root endpoint');
    console.log('  GET  /api/status          - Get connection status');
    console.log('  GET  /api/qr              - Get QR code for authentication');
    console.log('  POST /api/send            - Send text message');
    console.log('  POST /api/send-media      - Send media message');
    console.log('  GET  /api/messages        - Get received messages');
    console.log('  GET  /api/messages/:id    - Get specific message');
    console.log('  DELETE /api/messages      - Clear message queue');
    console.log('  POST /api/logout          - Logout and clear session');
    console.log('  GET  /api/health          - Health check\n');
});
