import 'package:flutter/foundation.dart';

class FirebaseService {
  final ValueNotifier<double> gasLevel = ValueNotifier<double>(0.0);
  final ValueNotifier<String?> lastError = ValueNotifier<String?>(null);
  final ValueNotifier<String> deviceStatus = ValueNotifier<String>('offline');
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    deviceStatus.value = 'connecting';
    try {
      await Future<void>.delayed(const Duration(milliseconds: 100));
      deviceStatus.value = 'connected';
    } catch (e) {
      lastError.value = e.toString();
      deviceStatus.value = 'error';
    }
  }
}
