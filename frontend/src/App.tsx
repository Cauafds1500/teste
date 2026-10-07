import { useEffect, useState, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import './App.css';

interface HistoryItem {
  id: string;
  time: string;
  seatNumber: number;
}

export default function App() {
  const [backendUrl, setBackendUrl] = useState<string>(() => {
    return localStorage.getItem('arena_voice_backend_url') || 'http://localhost:5000';
  });
  const [connectionStatus, setConnectionStatus] = useState<'CONECTADO' | 'RECONECTANDO' | 'DESCONECTADO'>('DESCONECTADO');
  const [lastSupportedSeat, setLastSupportedSeat] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const connectionRef = useRef<HubConnection | null>(null);

  // Salva backendUrl no localStorage sempre que alterado
  const handleBackendUrlChange = (url: string) => {
    const cleaned = url.trim().replace(/\/+$/, '');
    setBackendUrl(cleaned);
    localStorage.setItem('arena_voice_backend_url', cleaned);
  };

  // Carregar estado inicial via GET /api/state (TESTE C)
  const fetchInitialState = async (baseUrl: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/state`);
      if (response.ok) {
        const data = await response.json();
        if (data.lastSupportedSeat && typeof data.lastSupportedSeat === 'number') {
          setLastSupportedSeat(data.lastSupportedSeat);
        }
      }
    } catch (err) {
      console.warn('Não foi possível buscar estado inicial do backend:', err);
    }
  };

  // Conexão SignalR com reconexão automática
  useEffect(() => {
    const hubUrl = `${backendUrl}/arenaHub`;

    // 1. Busca estado inicial
    fetchInitialState(backendUrl);

    // 2. Cria conexão do Hub
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    connectionRef.current = connection;

    // Tratar eventos de status da conexão
    connection.onreconnecting(() => {
      setConnectionStatus('RECONECTANDO');
    });

    connection.onreconnected(() => {
      setConnectionStatus('CONECTADO');
      fetchInitialState(backendUrl);
    });

    connection.onclose(() => {
      setConnectionStatus('DESCONECTADO');
    });

    // Evento em tempo real vindo do ESP32 / Backend
    connection.on('ChairSupported', (data: { seatNumber: number }) => {
      const seat = data.seatNumber;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false });

      // Atualiza o último apoio
      setLastSupportedSeat(seat);

      // Adiciona ao histórico em memória
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          time: timeStr,
          seatNumber: seat,
        },
        ...prev.slice(0, 19), // Mantém até 20 registros para visualização limpa
      ]);
    });

    // Iniciar conexão
    connection
      .start()
      .then(() => {
        setConnectionStatus('CONECTADO');
        setApiError(null);
      })
      .catch((err) => {
        console.error('Erro ao conectar ao SignalR:', err);
        setConnectionStatus('DESCONECTADO');
      });

    // Limpeza ao desmontar ou trocar de URL
    return () => {
      connection.stop();
    };
  }, [backendUrl]);

  // Função para simular clique de uma cadeira
  const simularCadeira = async (seatNumber: number) => {
    setIsSimulating(true);
    setApiError(null);

    try {
      const response = await fetch(`${backendUrl}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seatNumber }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao disparar requisição';
      setApiError(message);
      console.error('Falha na simulação:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>ARENA VOICE</h1>
        <p className="subtitle">Teste de comunicação</p>
      </header>

      {/* Configuração de URL do Backend para testes fáceis (local, ngrok, cloudflare) */}
      <div className="config-card">
        <label htmlFor="backend-url-input">URL do Backend:</label>
        <div className="input-group">
          <input
            id="backend-url-input"
            type="text"
            value={backendUrl}
            onChange={(e) => handleBackendUrlChange(e.target.value)}
            placeholder="http://localhost:5000"
          />
        </div>
      </div>

      {/* Status da Conexão */}
      <div className="status-section">
        <div className="status-label">Status Backend:</div>
        <div className={`status-badge ${connectionStatus.toLowerCase()}`}>
          <span className="dot"></span>
          {connectionStatus}
        </div>
      </div>

      {/* Destaque do Último Apoio */}
      <div className="card main-card">
        <h2>Último apoio:</h2>
        {lastSupportedSeat !== null ? (
          <div className="support-display active">
            <div className="seat-badge">CADEIRA {lastSupportedSeat}</div>
            <div className="support-text">APOIOU!</div>
          </div>
        ) : (
          <div className="support-display waiting">
            <div className="waiting-text">AGUARDANDO BOTÃO...</div>
          </div>
        )}
      </div>

      {/* Botões de Teste / Simulação */}
      <div className="card action-card">
        <h3>Ferramenta de Desenvolvimento</h3>
        <p className="hint">
          Dispara <code>POST /api/support</code> com o mesmo payload e rota do ESP32.
        </p>
        <button
          id="btn-simular-cadeira-1"
          className="btn-simulate primary"
          onClick={() => simularCadeira(1)}
          disabled={isSimulating}
        >
          {isSimulating ? 'ENVIANDO...' : 'SIMULAR CADEIRA 1'}
        </button>

        <div className="secondary-simulations">
          <span>Testar outras cadeiras:</span>
          <div className="seat-buttons">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                className="btn-seat-small"
                onClick={() => simularCadeira(num)}
                disabled={isSimulating}
              >
                Cadeira {num}
              </button>
            ))}
          </div>
        </div>

        {apiError && <div className="error-message">Aviso: {apiError}</div>}
      </div>

      {/* Histórico em Memória */}
      <div className="card history-card">
        <h3>Histórico (em memória)</h3>
        {history.length === 0 ? (
          <div className="empty-history">Nenhum evento registrado ainda nesta sessão.</div>
        ) : (
          <ul className="history-list">
            {history.map((item) => (
              <li key={item.id} className="history-item">
                <span className="time">{item.time}</span>
                <span className="separator">-</span>
                <span className="detail">Cadeira {item.seatNumber} apoiou</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
