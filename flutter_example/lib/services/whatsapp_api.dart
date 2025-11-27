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
  
  // Logout
  Future<bool> logout() async {
    try {
      final response = await http.post(Uri.parse('$baseUrl/logout'));
      return response.statusCode == 200;
    } catch (e) {
      throw Exception('Error logging out: $e');
    }
  }
}

