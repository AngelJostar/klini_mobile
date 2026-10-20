import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Requiere un servidor Laravel con sesión web. No carga Blade localmente.
class PatientWebView extends StatefulWidget {
  const PatientWebView({super.key, required this.server});
  final Uri server; // Ejemplo: Uri.parse('https://plataforma.example')

  @override
  State<PatientWebView> createState() => _PatientWebViewState();
}

class _PatientWebViewState extends State<PatientWebView> {
  late final WebViewController controller;
  int progress = 0;

  @override
  void initState() {
    super.initState();
    if (widget.server.scheme != 'https') {
      throw ArgumentError('Configure el servidor HTTPS de la plataforma.');
    }
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xfff5fbfa))
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (value) { if (mounted) setState(() => progress = value); },
        onNavigationRequest: (request) async {
          final uri = Uri.tryParse(request.url);
          if (uri == null) return NavigationDecision.prevent;
          if (uri.scheme == widget.server.scheme && uri.host == widget.server.host && uri.port == widget.server.port) {
            return NavigationDecision.navigate;
          }
          if (request.isMainFrame && ['https', 'mailto', 'tel'].contains(uri.scheme)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
          return NavigationDecision.prevent;
        },
      ))
      ..loadRequest(widget.server.resolve('/patient'));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Column(children: [
        if (progress < 100) LinearProgressIndicator(value: progress / 100),
        Expanded(child: WebViewWidget(controller: controller)),
      ]),
    ),
  );
}

// Instalar: flutter pub add webview_flutter url_launcher
// Integrar el botón Atrás de su router con controller.canGoBack()/goBack().
// Agregar INTERNET al AndroidManifest y configurar adjuntos/descargas en el host.
