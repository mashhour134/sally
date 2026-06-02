import 'package:flutter/foundation.dart';

class MqttService {
  final ValueNotifier<double> gasLevel = ValueNotifier<double>(0.0);
  final ValueNotifier<String?> connectionStatus = ValueNotifier<String?>(null);

  Future<void> connect(String host, String password) async {
    connectionStatus.value = 'connecting';
    await Future<void>.delayed(const Duration(milliseconds: 100));
    connectionStatus.value = 'connected';
  }
}
