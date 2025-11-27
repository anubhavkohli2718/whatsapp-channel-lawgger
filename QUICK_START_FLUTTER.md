# Quick Start: Flutter Integration

## 🚀 5-Minute Setup

### Step 1: Add Dependencies

Add to `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.1.0
```

### Step 2: Create API Service

Create `lib/services/whatsapp_api.dart` (see `FLUTTER_INTEGRATION.md` for full code)

### Step 3: Connect WhatsApp

```dart
import 'services/whatsapp_api.dart';

final api = WhatsAppAPI();

// 1. Check status
final status = await api.getStatus();
print('Status: ${status['status']}'); // disconnected, connecting, or connected

// 2. Get QR code if not connected
if (status['status'] != 'connected' && status['hasQR'] == true) {
  final qrCode = await api.getQRCode();
  // Display QR code image
  // User scans with WhatsApp
}

// 3. Poll until connected
Timer.periodic(Duration(seconds: 3), (timer) async {
  final status = await api.getStatus();
  if (status['status'] == 'connected') {
    timer.cancel();
    print('Connected!');
  }
});
```

### Step 4: Send Message

```dart
try {
  final result = await api.sendMessage('1234567890', 'Hello!');
  print('Sent! Message ID: ${result['messageId']}');
} catch (e) {
  print('Error: $e');
}
```

### Step 5: Receive Messages

```dart
final messages = await api.getMessages();
for (var msg in messages) {
  print('${msg['from']}: ${msg['body']}');
}
```

## 📱 Complete Example

See `FLUTTER_INTEGRATION.md` for:
- Full UI implementation
- QR code display
- Message list
- Error handling
- Best practices

## 🔗 API Endpoints

Base URL: `https://whatsapp-channel-lawgger-production.up.railway.app/api`

- `GET /status` - Connection status
- `GET /qr` - QR code for authentication
- `POST /send` - Send text message
- `POST /send-media` - Send media
- `GET /messages` - Get received messages

## ⚡ That's it!

Your Flutter app can now connect to WhatsApp and send/receive messages!

