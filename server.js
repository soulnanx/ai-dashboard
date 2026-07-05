const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs');
// Node 18+ tem fetch global; não precisa de importar nada

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Para ler JSON no body de POST


// ========== OpenRouter API Proxy ==========
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const USAGE_LOG_FILE = path.join(__dirname, 'openrouter-usage.json');

/**
 * Faz uma requisição autenticada para a API do OpenRouter.
 * @param {string} endpoint - Caminho após /api/v1/
 * @param {object} options - Opções do fetch (method, body, etc)
 * @returns {Promise<object>} Resposta JSON
 */
async function openRouterRequest(endpoint, options = {}) {
  const url = `${OPENROUTER_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${text}`);
  }
  return response.json();
}

// GET /api/openrouter/credits → Proxy para /api/v1/credits
app.get('/api/openrouter/credits', async (req, res) => {
  try {
    const data = await openRouterRequest('/credits');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/openrouter/key → Proxy para /api/v1/key
app.get('/api/openrouter/key', async (req, res) => {
  try {
    const data = await openRouterRequest('/key');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/openrouter/models → Proxy para /api/v1/models (filtra pelos modelos do .zshrc)
app.get('/api/openrouter/models', async (req, res) => {
  try {
    const data = await openRouterRequest('/models');
    // Filtrar apenas os modelos que o usuário configurou no .zshrc
    const configuredModels = [
      'z-ai/glm-5.2',
      'moonshotai/kimi-k2.7-code',
      'tencent/hy3-preview'
    ];
    const filtered = data.data.filter(m => configuredModels.includes(m.id));
    res.json({ data: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/openrouter/usage-log → Lê o arquivo de log local
app.get('/api/openrouter/usage-log', (req, res) => {
  if (!fs.existsSync(USAGE_LOG_FILE)) {
    return res.json({ data: [] });
  }
  try {
    const content = fs.readFileSync(USAGE_LOG_FILE, 'utf8');
    const log = JSON.parse(content);
    res.json({ data: log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/openrouter/log → Registra uso no log local
app.post('/api/openrouter/log', (req, res) => {
  const entry = req.body;
  // Validação básica
  if (!entry.model || !entry.cost) {
    return res.status(400).json({ error: 'Campos obrigatórios: model, cost' });
  }
  entry.timestamp = entry.timestamp || Date.now();
  let log = [];
  if (fs.existsSync(USAGE_LOG_FILE)) {
    try {
      log = JSON.parse(fs.readFileSync(USAGE_LOG_FILE, 'utf8'));
    } catch (e) {
      log = [];
    }
  }
  log.push(entry);
  // Manter apenas os últimos 1000 registros
  if (log.length > 1000) {
    log = log.slice(-1000);
  }
  fs.writeFileSync(USAGE_LOG_FILE, JSON.stringify(log, null, 2));
  res.json({ success: true });
});

// Função pra formatar processos
function formatProcesses(processList, totalMem) {
  return processList
    .sort((a, b) => {
      const cpuA = parseFloat(a.cpu) || 0;
      const cpuB = parseFloat(b.cpu) || 0;
      return cpuB - cpuA;
    })
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      pcpu: parseFloat(p.cpu) || 0,
      pmem: totalMem > 0 ? ((p.memRss * 1024) / totalMem) * 100 : 0
    }));
}

// API REST para dados pontuais
app.get('/api/system', async (req, res) => {
  try {
    const [cpu, mem, battery, fsSize, osInfo, processes, timeData, cpuTemp] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.battery(),
      si.fsSize(),
      si.osInfo(),
      si.processes(),
      si.time(),
      si.cpuTemperature()
    ]);

    const topProcesses = formatProcesses(processes.list, mem.total);

    res.json({
      cpu,
      mem,
      battery,
      disk: fsSize,
      osInfo,
      topProcesses,
      uptime: timeData.uptime || 0,
      cpuTemp: cpuTemp || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket para dados em tempo real
io.on('connection', (socket) => {
  console.log('📱 Dashboard conectado');

  const sendRealTimeData = async () => {
    try {
      const [cpu, mem, battery, currentLoad, processes, timeData, cpuTemp] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.battery(),
        si.currentLoad(),
        si.processes(),
        si.time(),
        si.cpuTemperature()
      ]);

      const topProcesses = formatProcesses(processes.list, mem.total);

      socket.emit('system-update', {
        cpu,
        mem,
        battery,
        currentLoad,
        topProcesses,
        uptime: timeData.uptime || 0,
        timestamp: Date.now(),
        cpuTemp: cpuTemp || null
      });
    } catch (err) {
      console.error('Erro ao coletar dados:', err.message);
    }
  };

  // Envia imediatamente e depois a cada 2 segundos
  sendRealTimeData();
  const interval = setInterval(sendRealTimeData, 2000);

  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log('📴 Dashboard desconectado');
  });
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Dashboard rodando em:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Rede:    http://${getLocalIP()}:${PORT}`);
});

function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
