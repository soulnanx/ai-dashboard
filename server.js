const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

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
    const [cpu, mem, battery, fsSize, osInfo, processes] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.battery(),
      si.fsSize(),
      si.osInfo(),
      si.processes()
    ]);

    const topProcesses = formatProcesses(processes.list, mem.total);

    res.json({
      cpu,
      mem,
      battery,
      disk: fsSize,
      osInfo,
      topProcesses,
      uptime: osInfo.uptime
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
      const [cpu, mem, battery, currentLoad, processes] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.battery(),
        si.currentLoad(),
        si.processes()
      ]);

      const topProcesses = formatProcesses(processes.list, mem.total);

      socket.emit('system-update', {
        cpu,
        mem,
        battery,
        currentLoad,
        topProcesses,
        timestamp: Date.now()
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
