# WhatsApp API Documentation

REST API backend for WhatsApp messaging using Baileys.

## Base URL
```
http://localhost:3000/api
```

## Authentication

The API uses QR code authentication. Once authenticated, the session is saved and you won't need to scan again.

## Endpoints

### 1. Get Connection Status
**GET** `/api/status`

Get the current connection status and client information.

**Response:**
```json
{
  "status": "connected",
  "info": {
    "pushname": "Your Name",
    "wid": "1234567890",
    "platform": "Baileys"
  },
  "hasQR": false
}
```

**Status values:**
- `disconnected` - Not connected
- `connecting` - Connecting to WhatsApp
- `connected` - Connected and ready

---

### 2. Get QR Code
**GET** `/api/qr`

Get QR code for authentication. Only available when status is `disconnected` or `connecting`.

**Response:**
```json
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Usage in Flutter:**
```dart
// Fetch QR code
final response = await http.get(Uri.parse('http://your-server:3000/api/qr'));
final data = jsonDecode(response.body);
final qrImage = data['qr']; // Base64 image data
```

---

### 3. Send Text Message
**POST** `/api/send`

Send a text message to a WhatsApp number.

**Request Body:**
```json
{
  "number": "1234567890",
  "message": "Hello, this is a test message!"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "3EB0123456789ABCDEF",
  "to": "1234567890@s.whatsapp.net"
}
```

**Flutter Example:**
```dart
final response = await http.post(
  Uri.parse('http://your-server:3000/api/send'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'number': '1234567890',
    'message': 'Hello from Flutter!',
  }),
);
```

**Error Response (503):**
```json
{
  "error": "WhatsApp is not connected"
}
```

---

### 4. Send Media Message
**POST** `/api/send-media`

Send an image, video, audio, or document.

**Request Body:**
```json
{
  "number": "1234567890",
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "image",
  "caption": "Check out this image!"
}
```

**Media Types:**
- `image` - Send image
- `video` - Send video
- `audio` - Send audio
- `document` - Send document

**Response:**
```json
{
  "success": true,
  "messageId": "3EB0123456789ABCDEF",
  "to": "1234567890@s.whatsapp.net"
}
```

**Flutter Example:**
```dart
final response = await http.post(
  Uri.parse('http://your-server:3000/api/send-media'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'number': '1234567890',
    'mediaUrl': 'https://example.com/image.jpg',
    'mediaType': 'image',
    'caption': 'Check this out!',
  }),
);
```

---

### 5. Get Received Messages
**GET** `/api/messages?limit=50`

Get received messages. Messages are stored in a queue (last 100 messages).

**Query Parameters:**
- `limit` (optional) - Number of messages to return (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "messages": [
    {
      "id": "3EB0123456789ABCDEF",
      "body": "Hello!",
      "from": "1234567890@s.whatsapp.net",
      "timestamp": 1234567890,
      "fromMe": false,
      "hasMedia": false,
      "type": "text",
      "mediaUrl": null
    }
  ]
}
```

**Flutter Example:**
```dart
final response = await http.get(
  Uri.parse('http://your-server:3000/api/messages?limit=20'),
);
final data = jsonDecode(response.body);
final messages = data['messages'] as List;
```

---

### 6. Get Specific Message
**GET** `/api/messages/:id`

Get a specific message by ID.

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "3EB0123456789ABCDEF",
    "body": "Hello!",
    "from": "1234567890@s.whatsapp.net",
    "timestamp": 1234567890,
    "fromMe": false,
    "hasMedia": false,
    "type": "text"
  }
}
```

---

### 7. Clear Message Queue
**DELETE** `/api/messages`

Clear all messages from the queue.

**Response:**
```json
{
  "success": true,
  "message": "Message queue cleared"
}
```

---

### 8. Logout
**POST** `/api/logout`

Logout and clear the authentication session. You'll need to scan QR code again after logout.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 9. Health Check
**GET** `/api/health`

Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "connection": "connected"
}
```

---

## Flutter Integration Example

### Complete Flutter Example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class WhatsAppAPI {
  final String baseUrl;
  
  WhatsAppAPI({this.baseUrl = 'http://your-server:3000/api'});
  
  // Get connection status
  Future<Map<String, dynamic>> getStatus() async {
    final response = await http.get(Uri.parse('$baseUrl/status'));
    return jsonDecode(response.body);
  }
  
  // Get QR code
  Future<String?> getQRCode() async {
    final response = await http.get(Uri.parse('$baseUrl/qr'));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['qr'];
    }
    return null;
  }
  
  // Send message
  Future<bool> sendMessage(String number, String message) async {
    final response = await http.post(
      Uri.parse('$baseUrl/send'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'number': number,
        'message': message,
      }),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['success'] == true;
    }
    return false;
  }
  
  // Get messages
  Future<List<dynamic>> getMessages({int limit = 50}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/messages?limit=$limit'),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['messages'] as List;
    }
    return [];
  }
}
```

### Usage in Flutter Widget

```dart
class WhatsAppScreen extends StatefulWidget {
  @override
  _WhatsAppScreenState createState() => _WhatsAppScreenState();
}

class _WhatsAppScreenState extends State<WhatsAppScreen> {
  final api = WhatsAppAPI();
  String? qrCode;
  String status = 'disconnected';
  
  @override
  void initState() {
    super.initState();
    checkStatus();
  }
  
  Future<void> checkStatus() async {
    final statusData = await api.getStatus();
    setState(() {
      status = statusData['status'];
      if (status == 'disconnected' || status == 'connecting') {
        loadQRCode();
      }
    });
  }
  
  Future<void> loadQRCode() async {
    final qr = await api.getQRCode();
    setState(() {
      qrCode = qr;
    });
  }
  
  Future<void> sendMessage() async {
    final success = await api.sendMessage('1234567890', 'Hello!');
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Message sent!')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('WhatsApp API')),
      body: Column(
        children: [
          if (qrCode != null) Image.memory(base64Decode(qrCode!.split(',')[1])),
          Text('Status: $status'),
          ElevatedButton(
            onPressed: sendMessage,
            child: Text('Send Message'),
          ),
        ],
      ),
    );
  }
}
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Not Found (QR code not available, message not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (WhatsApp not connected)

Error responses follow this format:
```json
{
  "error": "Error message here"
}
```

---

## Notes

1. **Phone Number Format**: Always include country code without the `+` sign (e.g., `1234567890` for US number)
2. **Message Queue**: Only the last 100 messages are stored. For production, consider implementing webhooks or a database.
3. **Session Persistence**: Once authenticated, the session is saved. You only need to scan QR code once.
4. **CORS**: CORS is enabled, so you can access the API from any origin (configure for production).

---

## Production Considerations

1. **Add Authentication**: Implement API keys or JWT tokens
2. **Use Webhooks**: Instead of polling `/api/messages`, set up webhooks for real-time message delivery
3. **Database**: Store messages in a database instead of in-memory queue
4. **Rate Limiting**: Add rate limiting to prevent abuse
5. **HTTPS**: Use HTTPS in production
6. **Environment Variables**: Store sensitive data in environment variables

