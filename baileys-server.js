const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const qrcode = require('qrcode');
const pino = require('pino');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store for the socket
let sock = null;
let qrCode = null;
let connectionStatus = 'disconnected';
let clientInfo = null;

// Initialize Baileys
async function startBaileys() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['WhatsApp Web API', 'Chrome', '1.0.0'],
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCode = qr;
            try {
                const qrImage = await qrcode.toDataURL(qr);
                io.emit('qr', qrImage);
            } catch (err) {
                io.emit('qr', qr);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            connectionStatus = 'disconnected';
            io.emit('disconnected', lastDisconnect?.error?.message || 'Connection closed');
            
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
            
            io.emit('ready', clientInfo);
        } else if (connection === 'connecting') {
            connectionStatus = 'connecting';
            io.emit('connecting');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    const messageData = {
                        id: msg.key.id,
                        body: msg.message?.conversation || 
                              msg.message?.extendedTextMessage?.text || 
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
                              'text'
                    };
                    
                    io.emit('message', messageData);
                }
            }
        }
    });
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Send current status
    if (connectionStatus === 'connected' && clientInfo) {
        socket.emit('ready', clientInfo);
    } else if (qrCode) {
        qrcode.toDataURL(qrCode).then(qrImage => {
            socket.emit('qr', qrImage);
        }).catch(() => {
            socket.emit('qr', qrCode);
        });
    }
    
    socket.on('send_message', async (data) => {
        if (connectionStatus !== 'connected' || !sock) {
            socket.emit('error', 'Client is not connected yet');
            return;
        }
        
        try {
            const { number, message } = data;
            const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
            
            await sock.sendMessage(jid, { text: message });
            socket.emit('message_sent', { success: true, to: jid });
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', error.message);
        }
    });
    
    socket.on('get_chats', async () => {
        if (connectionStatus !== 'connected' || !sock) {
            socket.emit('error', 'Client is not connected yet');
            return;
        }
        
        try {
            // Baileys doesn't have a direct getChats method
            // You would need to maintain your own chat list
            socket.emit('chats', []);
        } catch (error) {
            console.error('Error getting chats:', error);
            socket.emit('error', error.message);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Initialize Baileys
startBaileys().catch(console.error);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n✅ Baileys server running on http://localhost:${PORT}`);
    console.log('📱 Open your browser and navigate to the URL above\n');
});

