import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class GasBluetoothService {
  final ValueNotifier<bool> isConnected = ValueNotifier<bool>(false);
  final ValueNotifier<bool> isScanning = ValueNotifier<bool>(false);
  final ValueNotifier<List<ScanResult>> scanResults =
      ValueNotifier<List<ScanResult>>(<ScanResult>[]);
  final ValueNotifier<double> gasLevel = ValueNotifier<double>(0.0);

  void init() {
    isConnected.value = false;
  }

  void startScan() {
    isScanning.value = true;
    Future<void>.delayed(const Duration(milliseconds: 500), () {
      isScanning.value = false;
    });
  }

  void stopScan() {
    isScanning.value = false;
  }

  void connect(BluetoothDevice device) {
    isConnected.value = true;
  }
}
