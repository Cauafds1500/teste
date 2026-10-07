# Arena Voice - POC (Proof of Concept)

Esta POC demonstra e valida o fluxo de comunicação ponta a ponta entre um botão conectado a um **ESP32** (simulado no Wokwi ou físico) e uma **aplicação web em tempo real**.

```
[ BOTÃO FÍSICO / VIRTUAL ]
            ↓ (GPIO 18 → GND)
         [ ESP32 ]
            ↓ (Wi-Fi)
       [ HTTP POST ]  /api/support
            ↓
     [ ASP.NET Core ]
            ↓ (SignalR Hub: /arenaHub)
     [ ATUALIZAÇÃO EM TEMPO REAL ]
            ↓
 [ PÁGINA WEB (React + Vite) ]
   "CADEIRA 1 APOIOU!"
```

---

## 📁 Estrutura de Arquivos

```text
testebotao/
├── backend/
│   ├── ArenaVoiceBackend.csproj
│   ├── Program.cs
│   ├── Hubs/
│   │   └── ArenaHub.cs
│   └── Properties/
│       └── launchSettings.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── esp32/
│   ├── sketch.ino
│   └── diagram.json
└── README.md
```

---

## 1. Como Executar o Backend (ASP.NET Core)

O backend mantém o estado em memória e transmite eventos via **SignalR**.

### Passo a passo:
1. Abra um terminal e acesse a pasta `backend`:
   ```bash
   cd backend
   ```
2. Execute a aplicação:
   ```bash
   dotnet run
   ```
   *(Caso o comando `dotnet` não seja reconhecido no PowerShell, use `$env:PATH = "$env:LOCALAPPDATA\Microsoft\dotnet;$env:PATH"; dotnet run`)*

3. O backend iniciará escutando em:
   - **`http://localhost:5000`** e **`http://0.0.0.0:5000`**

### Endpoints disponíveis:
- **`POST /api/support`**: Registra o apoio da cadeira.
  - Payload: `{"seatNumber": 1}`
  - Resposta: `{"accepted": true, "seatNumber": 1}` (HTTP 200)
- **`GET /api/state`**: Retorna o último apoio registrado para recuperação de estado ao recarregar a página.
  - Resposta: `{"lastSupportedSeat": 1}`
- **`HUB /arenaHub`**: Endpoint WebSocket/SignalR para conexão em tempo real. Evento emitido: `ChairSupported`.

---

## 2. Como Executar o Frontend (React + Vite)

### Passo a passo:
1. Abra um segundo terminal e acesse a pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências (já instaladas nesta máquina):
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abra o navegador em:
   - **`http://localhost:5173/`**

---

## 3. Como Testar Usando "SIMULAR CADEIRA 1" (Sem ESP32)

Este teste valida **Backend + SignalR + Frontend**:

1. Abra a página `http://localhost:5173/`.
2. Verifique o status no topo: deve exibir **`CONECTADO`** em verde.
3. Clique no botão verde: **`SIMULAR CADEIRA 1`**.
4. Observe imediatamente:
   - O card principal atualiza para:
     ```
     CADEIRA 1
     APOIOU!
     ```
   - O console do backend registra: `CADEIRA 1 APOIOU!`
   - A lista de histórico adiciona o registro com o horário exato: `14:32:10 - Cadeira 1 apoiou`.
5. **Teste C (Recuperação de estado)**:
   - Dê **F5 (Refresh)** na página do React.
   - O frontend fará uma chamada automática a `GET /api/state` e manterá `CADEIRA 1 APOIOU!`.

---

## 4. Como Publicar / Expor o Backend para a Internet

Como o simulador **Wokwi** roda nos servidores da nuvem do Wokwi, ele **não consegue acessar `http://localhost:5000` diretamente**. Precisamos expor temporariamente o backend para a internet com uma URL pública HTTPS.

Você pode escolher **qualquer uma** das seguintes ferramentas gratuitas:

### Opção A: Usando Cloudflare Tunnel (Recomendado - Grátis e sem cadastro)
1. Baixe o executável `cloudflared` ou use via winget/npx:
   ```bash
   npx cloudflared tunnel --url http://localhost:5000
   ```
2. O terminal gerará uma URL HTTPS pública como:
   `https://alguma-palavra-aleatoria.trycloudflare.com`

### Opção B: Usando Ngrok
1. Se tiver o `ngrok` instalado:
   ```bash
   ngrok http 5000
   ```
2. Copie a URL `https://xxxx.ngrok-free.app` gerada.

### Opção C: Usando VS Code Port Forwarding (Dev Tunnels)
1. No VS Code, abra a aba **Ports** (Portas).
2. Adicione a porta `5000`.
3. Clique com o botão direito na porta e mude o acesso de **Private** para **Public**.
4. Copie o endereço HTTPS público gerado.

---

## 5. Onde Colocar a URL Pública no `sketch.ino`

Abra o arquivo [`esp32/sketch.ino`](file:///c:/Users/CAUAS/Desktop/testebotao/esp32/sketch.ino) e altere a constante `SERVIDOR`:

```cpp
// Substitua pela sua URL pública HTTPS seguido de /api/support
const char* SERVIDOR = "https://sua-url-publica.trycloudflare.com/api/support";
```

> **Nota:** Não remova o `/api/support` do final da URL.

---

## 6. Como Criar e Rodar o Projeto no Wokwi

1. Acesse: **[https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32)**.
2. Na aba de código (**`sketch.ino`**):
   - Apague o código padrão e cole todo o conteúdo do arquivo [`esp32/sketch.ino`](file:///c:/Users/CAUAS/Desktop/testebotao/esp32/sketch.ino).
   - Certifique-se de que a variável `SERVIDOR` está apontando para o seu backend público.
3. Na aba do diagrama (**`diagram.json`**):
   - Clique na aba `diagram.json` no Wokwi (ou crie um novo botão).
   - Cole o conteúdo do arquivo [`esp32/diagram.json`](file:///c:/Users/CAUAS/Desktop/testebotao/esp32/diagram.json).

### 7 e 8. Como Adicionar o Pushbutton e Fazer a Ligação Manualmente (se preferir no editor visual):
- Clique no ícone de `+` (Add Part) no Wokwi e selecione **Pushbutton**.
- Conecte:
  - Terminal **1.l** (ou um lado do botão) ao pino **GND** do ESP32.
  - Terminal **2.l** (ou outro lado do botão) ao pino **D18 (GPIO 18)** do ESP32.

```text
ESP32 (GPIO 18) ────────┐
                       [BOTÃO]
ESP32 (GND)     ────────┘
```

### 9, 10 e 11. Iniciar Simulação e Testar:
1. Clique no botão verde **Play / Start Simulation** no Wokwi.
2. Observe o **Serial Monitor** na lateral inferior direita:
   - Ele imprimirá:
     ```
     Conectando ao Wi-Fi: Wokwi-GUEST
     ......
     Wi-Fi Conectado com sucesso!
     Aguardando clique no botao (GPIO 18 -> GND)...
     ```
3. Abra a sua página React em `http://localhost:5173/` (coloque a janela do Wokwi e a do React lado a lado!).
4. Clique no **Pushbutton virtual** no Wokwi.
5. Veja no Serial Monitor:
   ```
   BOTAO APERTADO!
   Enviando apoio...
   Resposta HTTP: 200
   SINAL ENVIADO COM SUCESSO!
   ```
6. Olhe imediatamente para a página web:
   - Ela exibirá instantaneamente em tempo real:
     ```
     CADEIRA 1
     APOIOU!
     ```

---

## 7. Como Posteriormente Usar o Código em um ESP32 Físico

O código [`esp32/sketch.ino`](file:///c:/Users/CAUAS/Desktop/testebotao/esp32/sketch.ino) foi projetado para ser **100% idêntico no hardware real**, sem nenhuma alteração de lógica.

### Únicos valores a alterar no início do arquivo:
```cpp
// 1. O nome da sua rede Wi-Fi real (2.4 GHz)
const char* WIFI_NOME = "MinhaRedeWifi";

// 2. A senha da sua rede Wi-Fi
const char* WIFI_SENHA = "MinhaSenha123";

// 3. O endereço do seu backend:
// Se o ESP32 estiver na MESMA rede Wi-Fi que o seu PC:
// Descubra o IP do seu computador (no terminal: ipconfig -> IPv4)
// Exemplo:
const char* SERVIDOR = "http://192.168.1.105:5000/api/support";

// Ou se o backend estiver na nuvem / túnel:
// const char* SERVIDOR = "https://seu-dominio.com/api/support";
```

### Ligação Física:
- Conecte uma perna do botão no pino **GPIO 18** do ESP32.
- Conecte a outra perna do botão no pino **GND** do ESP32.
- **Não é necessário resistor externo**: o código utiliza `pinMode(18, INPUT_PULLUP)`, aproveitando o resistor interno de pull-up do ESP32.
- A detecção é feita exclusivamente na transição `HIGH -> LOW` com `debounce`, garantindo que manter o botão apertado não enviará múltiplos registros.
