/*
  =============================================================
  ARENA VOICE - PROOF OF CONCEPT (POC)
  Comunicação ESP32 -> Wi-Fi -> HTTP POST -> Backend ASP.NET
  =============================================================

  Conexão do Botão:
  GPIO 18 -> BOTÃO -> GND
  (Usando pull-up interno: pinMode(18, INPUT_PULLUP))

  Transição monitorada: HIGH -> LOW (quando o botão é pressionado)
  Com debounce para evitar múltiplos registros enquanto pressionado.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// =============================================================
// CONFIGURAÇÕES (Altere aqui para Wokwi ou ESP32 Físico)
// =============================================================
const char* WIFI_NOME = "Wokwi-GUEST";
const char* WIFI_SENHA = "";

// Coloque a URL do endpoint POST do seu backend
// Exemplos:
// - Wokwi / Nuvem / Túnel: "https://meu-backend.exemplo.com/api/support"
// - ESP32 Físico na mesma rede Wi-Fi do PC: "http://192.168.1.100:5000/api/support"
const char* SERVIDOR = "https://teste-91g3.onrender.com/api/support";

const int CADEIRA = 1;

// =============================================================
// PINOS E VARIÁVEIS DE CONTROLE
// =============================================================
const int PINO_BOTAO = 18;

// Estado anterior do botão para detectar somente transição HIGH -> LOW
int ultimoEstadoBotao = HIGH;
unsigned long ultimoTempoDebounce = 0;
const unsigned long TEMPO_DEBOUNCE = 50; // milissegundos

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(WIFI_NOME);

  WiFi.begin(WIFI_NOME, WIFI_SENHA);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Conectado com sucesso!");
    Serial.print("IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFalha ao conectar no Wi-Fi. Verifique as credenciais.");
  }
}

void enviarApoio() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado! Tentando reconectar...");
    conectarWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("ERRO: Nao foi possivel conectar ao Wi-Fi.");
      return;
    }
  }

  Serial.println("\nBOTAO APERTADO!");
  Serial.println("Enviando apoio...");

  HTTPClient http;
  String url = String(SERVIDOR);

  // Suporte transparente tanto a HTTPS (Wokwi / Produção / Túneis) quanto HTTP (Rede Local)
  if (url.startsWith("https://")) {
    WiFiClientSecure *client = new WiFiClientSecure();
    client->setInsecure(); // Permite certificados públicos/túneis sem carregar CA raiz na POC
    http.begin(*client, url);
  } else {
    WiFiClient client;
    http.begin(client, url);
  }

  http.addHeader("Content-Type", "application/json");

  // Payload conforme especificado
  String payload = "{\"seatNumber\":" + String(CADEIRA) + "}";

  int codigoHttp = http.POST(payload);

  Serial.print("Resposta HTTP: ");
  Serial.println(codigoHttp);

  if (codigoHttp >= 200 && codigoHttp <= 299) {
    Serial.println("SINAL ENVIADO COM SUCESSO!");
    String resposta = http.getString();
    Serial.print("Resposta do Servidor: ");
    Serial.println(resposta);
  } else {
    Serial.println("ERRO AO ENVIAR SINAL.");
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=========================================");
  Serial.println("   ARENA VOICE - POC ESP32 INICIADO     ");
  Serial.println("=========================================");

  // Configuração do pino com resistor de pull-up interno
  pinMode(PINO_BOTAO, INPUT_PULLUP);

  // Conecta ao Wi-Fi configurado
  conectarWiFi();

  Serial.println("Aguardando clique no botao (GPIO 18 -> GND)...");
}

void loop() {
  int leituraAtual = digitalRead(PINO_BOTAO);

  // Detecção de transição com debounce
  if ((millis() - ultimoTempoDebounce) > TEMPO_DEBOUNCE) {
    // Detecta EXCLUSIVAMENTE a transição HIGH -> LOW (apertou o botão)
    if (ultimoEstadoBotao == HIGH && leituraAtual == LOW) {
      ultimoTempoDebounce = millis();
      enviarApoio();
    }
  }

  ultimoEstadoBotao = leituraAtual;

  // Pequeno delay para estabilidade de loop
  delay(10);
}
