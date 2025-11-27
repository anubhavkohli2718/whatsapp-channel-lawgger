# Flutter Integration Guide

Complete guide to integrate WhatsApp API into your Flutter app.

## 📦 Required Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  qr_flutter: ^4.1.0  # For displaying QR code
  image: ^4.1.0       # For decoding base64 images
```

Then run:
```bash
flutter pub get
```

## 🔧 API Service Class

Create `lib/services/whatsapp_api.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class WhatsAppAPI {
  // Update this with your Railway URL
  final String baseUrl = 'https://whatsapp-channel-lawgger-production.up.railway.app/api';
  
  // Get connection status
  Future<Map<String, dynamic>> getStatus() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/status'));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      throw Exception('Failed to get status: ${response.statusCode}');
    } catch (e) {
      throw Exception('Error getting status: $e');
    }
  }
  
  // Get QR code for authentication
  Future<String?> getQRCode() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/qr'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['qr'] as String?;
      } else if (response.statusCode == 404) {
        return null; // QR code not available
      }
      throw Exception('Failed to get QR code: ${response.statusCode}');
    } catch (e) {
      throw Exception('Error getting QR code: $e');
    }
  }
  
  // Send text message
  Future<Map<String, dynamic>> sendMessage(String number, String message) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/send'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'number': number,
          'message': message,
        }),
      );
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 503) {
        throw Exception('WhatsApp is not connected. Please scan QR code first.');
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to send message');
      }
    } catch (e) {
      throw Exception('Error sending message: $e');
    }
  }
  
  // Send media message
  Future<Map<String, dynamic>> sendMedia({
    required String number,
    required String mediaUrl,
    required String mediaType, // 'image', 'video', 'audio', 'document'
    String? caption,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/send-media'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'number': number,
          'mediaUrl': mediaUrl,
          'mediaType': mediaType,
          'caption': caption,
        }),
      );
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 503) {
        throw Exception('WhatsApp is not connected. Please scan QR code first.');
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to send media');
      }
    } catch (e) {
      throw Exception('Error sending media: $e');
    }
  }
  
  // Get received messages
  Future<List<dynamic>> getMessages({int limit = 50}) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/messages?limit=$limit'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['messages'] as List;
      }
      throw Exception('Failed to get messages: ${response.statusCode}');
    } catch (e) {
      throw Exception('Error getting messages: $e');
    }
  }
  
  // Get specific message by ID
  Future<Map<String, dynamic>> getMessage(String messageId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/messages/$messageId'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['message'] as Map<String, dynamic>;
      } else if (response.statusCode == 404) {
        throw Exception('Message not found');
      }
      throw Exception('Failed to get message: ${response.statusCode}');
    } catch (e) {
      throw Exception('Error getting message: $e');
    }
  }
  
  // Logout
  Future<bool> logout() async {
    try {
      final response = await http.post(Uri.parse('$baseUrl/logout'));
      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Error logging out: $e');
    }
  }
  
  // Health check
  Future<Map<String, dynamic>> healthCheck() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/health'));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      throw Exception('Health check failed: ${response.statusCode}');
    } catch (e) {
      throw Exception('Error checking health: $e');
    }
  }
}
```

## 📱 Complete Flutter UI Example

Create `lib/screens/whatsapp_screen.dart`:

```dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:image/image.dart' as img;
import '../services/whatsapp_api.dart';

class WhatsAppScreen extends StatefulWidget {
  @override
  _WhatsAppScreenState createState() => _WhatsAppScreenState();
}

class _WhatsAppScreenState extends State<WhatsAppScreen> {
  final WhatsAppAPI _api = WhatsAppAPI();
  final TextEditingController _numberController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  
  String _status = 'disconnected';
  String? _qrCode;
  Map<String, dynamic>? _clientInfo;
  bool _isLoading = false;
  List<dynamic> _messages = [];
  
  @override
  void initState() {
    super.initState();
    _checkStatus();
    _startPolling();
  }
  
  // Check status periodically
  void _startPolling() {
    Future.delayed(Duration(seconds: 3), () {
      if (mounted) {
        _checkStatus();
        _startPolling();
      }
    });
  }
  
  Future<void> _checkStatus() async {
    try {
      final status = await _api.getStatus();
      setState(() {
        _status = status['status'] ?? 'disconnected';
        _clientInfo = status['info'];
        if (status['hasQR'] == true && _qrCode == null) {
          _loadQRCode();
        }
      });
    } catch (e) {
      print('Error checking status: $e');
    }
  }
  
  Future<void> _loadQRCode() async {
    try {
      final qr = await _api.getQRCode();
      setState(() {
        _qrCode = qr;
      });
    } catch (e) {
      print('Error loading QR code: $e');
    }
  }
  
  Future<void> _sendMessage() async {
    if (_numberController.text.isEmpty || _messageController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter number and message')),
      );
      return;
    }
    
    if (_status != 'connected') {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('WhatsApp is not connected. Please scan QR code first.')),
      );
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      final result = await _api.sendMessage(
        _numberController.text.trim(),
        _messageController.text,
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Message sent successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      
      _messageController.clear();
      _loadMessages();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
  
  Future<void> _loadMessages() async {
    try {
      final messages = await _api.getMessages();
      setState(() {
        _messages = messages;
      });
    } catch (e) {
      print('Error loading messages: $e');
    }
  }
  
  Color _getStatusColor() {
    switch (_status) {
      case 'connected':
        return Colors.green;
      case 'connecting':
        return Colors.orange;
      default:
        return Colors.red;
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('WhatsApp API'),
        backgroundColor: Color(0xFF25D366),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: _getStatusColor(),
                            shape: BoxShape.circle,
                          ),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Status: $_status',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    if (_clientInfo != null) ...[
                      SizedBox(height: 8),
                      Text('Connected as: ${_clientInfo!['pushname']}'),
                      Text('Phone: ${_clientInfo!['wid']}'),
                    ],
                  ],
                ),
              ),
            ),
            
            SizedBox(height: 16),
            
            // QR Code Section
            if (_status != 'connected' && _qrCode != null)
              Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Text(
                        'Scan QR Code',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 16),
                      // Display QR code image
                      Container(
                        width: 250,
                        height: 250,
                        child: Image.memory(
                          base64Decode(_qrCode!.split(',')[1]),
                          fit: BoxFit.contain,
                        ),
                      ),
                      SizedBox(height: 16),
                      Text(
                        '1. Open WhatsApp on your phone\n'
                        '2. Go to Settings → Linked Devices\n'
                        '3. Tap "Link a Device"\n'
                        '4. Scan this QR code',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              ),
            
            SizedBox(height: 16),
            
            // Send Message Section
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Send Message',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),
                    TextField(
                      controller: _numberController,
                      decoration: InputDecoration(
                        labelText: 'Phone Number (with country code)',
                        hintText: '1234567890',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.phone),
                      ),
                      keyboardType: TextInputType.phone,
                    ),
                    SizedBox(height: 16),
                    TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        labelText: 'Message',
                        hintText: 'Type your message...',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.message),
                      ),
                      maxLines: 3,
                    ),
                    SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isLoading || _status != 'connected' 
                          ? null 
                          : _sendMessage,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Color(0xFF25D366),
                        padding: EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? CircularProgressIndicator(color: Colors.white)
                          : Text('Send Message'),
                    ),
                  ],
                ),
              ),
            ),
            
            SizedBox(height: 16),
            
            // Messages Section
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Received Messages',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.refresh),
                          onPressed: _loadMessages,
                        ),
                      ],
                    ),
                    SizedBox(height: 16),
                    if (_messages.isEmpty)
                      Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text(
                            'No messages yet',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          return ListTile(
                            title: Text(
                              msg['from']?.toString().split('@')[0] ?? 'Unknown',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text(msg['body'] ?? '[Media]'),
                            trailing: Text(
                              _formatTimestamp(msg['timestamp']),
                              style: TextStyle(fontSize: 12),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  String _formatTimestamp(int? timestamp) {
    if (timestamp == null) return '';
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp * 1000);
    return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
  
  @override
  void dispose() {
    _numberController.dispose();
    _messageController.dispose();
    super.dispose();
  }
}
```

## 🎯 Quick Start Example

Simple example to get started:

```dart
import 'package:flutter/material.dart';
import 'services/whatsapp_api.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WhatsApp API',
      theme: ThemeData(
        primarySwatch: Colors.green,
      ),
      home: WhatsAppScreen(),
    );
  }
}
```

## 📝 Step-by-Step Usage

### Step 1: Check Connection Status

```dart
final api = WhatsAppAPI();
final status = await api.getStatus();

print('Status: ${status['status']}'); // 'disconnected', 'connecting', or 'connected'
print('Has QR: ${status['hasQR']}'); // true/false
```

### Step 2: Get QR Code (if not connected)

```dart
if (status['status'] != 'connected' && status['hasQR'] == true) {
  final qrCode = await api.getQRCode();
  // Display QR code image in your UI
  // User scans with WhatsApp
}
```

### Step 3: Wait for Connection

Poll the status endpoint every few seconds:

```dart
Timer.periodic(Duration(seconds: 3), (timer) async {
  final status = await api.getStatus();
  if (status['status'] == 'connected') {
    timer.cancel();
    // Show success message
    // Enable send message button
  }
});
```

### Step 4: Send Message

```dart
try {
  final result = await api.sendMessage('1234567890', 'Hello from Flutter!');
  print('Message sent! ID: ${result['messageId']}');
} catch (e) {
  print('Error: $e');
}
```

### Step 5: Receive Messages

```dart
// Get messages
final messages = await api.getMessages(limit: 50);

// Display in your UI
for (var msg in messages) {
  print('From: ${msg['from']}');
  print('Body: ${msg['body']}');
  print('Time: ${msg['timestamp']}');
}
```

## 🔄 Polling for New Messages

To get real-time updates, poll the messages endpoint:

```dart
Timer.periodic(Duration(seconds: 5), (timer) async {
  try {
    final messages = await api.getMessages();
    // Update your UI with new messages
  } catch (e) {
    print('Error: $e');
  }
});
```

## 📤 Send Media Example

```dart
try {
  final result = await api.sendMedia(
    number: '1234567890',
    mediaUrl: 'https://example.com/image.jpg',
    mediaType: 'image',
    caption: 'Check this out!',
  );
  print('Media sent! ID: ${result['messageId']}');
} catch (e) {
  print('Error: $e');
}
```

## 🎨 UI Components

### QR Code Display

```dart
import 'dart:convert';
import 'package:flutter/material.dart';

Widget buildQRCode(String qrBase64) {
  // Remove data URL prefix
  final base64String = qrBase64.split(',')[1];
  final bytes = base64Decode(base64String);
  
  return Image.memory(
    bytes,
    width: 250,
    height: 250,
    fit: BoxFit.contain,
  );
}
```

### Status Indicator

```dart
Widget buildStatusIndicator(String status) {
  Color color;
  switch (status) {
    case 'connected':
      color = Colors.green;
      break;
    case 'connecting':
      color = Colors.orange;
      break;
    default:
      color = Colors.red;
  }
  
  return Container(
    width: 12,
    height: 12,
    decoration: BoxDecoration(
      color: color,
      shape: BoxShape.circle,
    ),
  );
}
```

## ⚠️ Error Handling

Always handle errors properly:

```dart
try {
  await api.sendMessage(number, message);
} on Exception catch (e) {
  // Handle specific errors
  if (e.toString().contains('not connected')) {
    // Show QR code again
  } else {
    // Show error message
  }
}
```

## 🔐 Best Practices

1. **Store API URL in config:**
   ```dart
   class AppConfig {
     static const String apiUrl = 'https://whatsapp-channel-lawgger-production.up.railway.app/api';
   }
   ```

2. **Use State Management:**
   - Consider using Provider, Riverpod, or Bloc for better state management

3. **Handle Network Errors:**
   ```dart
   try {
     // API call
   } on SocketException {
     // No internet
   } on HttpException {
     // Server error
   } catch (e) {
     // Other errors
   }
   ```

4. **Cache QR Code:**
   - Don't fetch QR code too frequently
   - Cache it until connection is established

5. **Polling Strategy:**
   - Poll status every 3-5 seconds when connecting
   - Poll messages every 5-10 seconds when connected
   - Stop polling when app is in background

## 📱 Complete Example App Structure

```
lib/
├── main.dart
├── services/
│   └── whatsapp_api.dart
├── screens/
│   └── whatsapp_screen.dart
├── models/
│   └── message.dart
└── widgets/
    ├── qr_code_widget.dart
    └── message_list_item.dart
```

## 🚀 Ready to Use!

Your Flutter app can now:
- ✅ Connect to WhatsApp via QR code
- ✅ Send text messages
- ✅ Send media messages
- ✅ Receive messages
- ✅ Check connection status

Just copy the code above and customize it for your needs!

