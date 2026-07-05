const socket = io({
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Formatação de bytes para GB
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Formatar uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Atualizar barra de progresso
function updateProgressBar(barId, percent) {
  const bar = document.getElementById(barId);
  bar.style.width = percent + '%';

  bar.classList.remove('medium', 'high');
  if (percent > 80) bar.classList.add('high');
  else if (percent > 50) bar.classList.add('medium');
}

// Atualizar informações de CPU
function updateCPU(data) {
  const usage = Math.round(data.currentLoad.currentLoad);
  document.getElementById('cpuUsage').textContent = usage + '%';
  document.getElementById('cpuLoad').textContent = data.currentLoad.avgLoad?.toFixed(2) || '--';
  document.getElementById('cpuCores').textContent = data.cpu.cores || '--';
  updateProgressBar('cpuBar', usage);
}

// Atualizar informações de Memória
function updateMemory(data) {
  const usedPercent = Math.round((data.mem.used / data.mem.total) * 100);
  document.getElementById('memUsed').textContent = formatBytes(data.mem.used);
  document.getElementById('memFree').textContent = formatBytes(data.mem.free);
  document.getElementById('memTotal').textContent = formatBytes(data.mem.total);
  updateProgressBar('memBar', usedPercent);
}

// Atualizar informações de Bateria
function updateBattery(data) {
  const percent = data.battery.percent || 0;
  document.getElementById('batteryPercent').textContent = percent + '%';

  const isCharging = data.battery.ischarging;
  document.getElementById('batteryStatus').textContent = isCharging ? '⚡ Carregando' : '🔋 Descarregando';

  // Tempo restante
  const time = data.battery.timeremaining;
  if (time > 0) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    document.getElementById('batteryTime').textContent = `${hours}h ${minutes}m`;
  } else {
    document.getElementById('batteryTime').textContent = 'Calculando...';
  }

  // Atualizar visual da bateria
  const batteryLevel = document.getElementById('batteryLevel');
  batteryLevel.style.width = percent + '%';

  batteryLevel.classList.remove('low', 'medium');
  if (percent < 20) batteryLevel.classList.add('low');
  else if (percent < 50) batteryLevel.classList.add('medium');
}

// Atualizar informações de Disco
function updateDisk(disks) {
  const diskInfo = document.getElementById('diskInfo');
  diskInfo.innerHTML = '';

  disks.forEach(disk => {
    if (disk.mount === '/' || disk.mount === '/System/Volumes/Data') {
      const usedPercent = Math.round((disk.used / disk.size) * 100);
      const diskItem = document.createElement('div');
      diskItem.className = 'disk-item';
      diskItem.innerHTML = `
        <div class="disk-header">
          <span class="disk-name">${disk.mount} (${disk.fs_type})</span>
          <span class="disk-size">${formatBytes(disk.used)} / ${formatBytes(disk.size)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${usedPercent}%"></div>
        </div>
      `;
      diskInfo.appendChild(diskItem);
    }
  });
}

// Atualizar lista de processos
function updateProcesses(processes) {
  const processList = document.getElementById('processList');
  processList.innerHTML = '';

  processes.forEach(proc => {
    const procItem = document.createElement('div');
    procItem.className = 'process-item';
    procItem.innerHTML = `
      <span class="process-name">${proc.name}</span>
      <span class="process-cpu">${proc.pcpu.toFixed(1)}%</span>
      <span class="process-mem">${proc.pmem.toFixed(1)}%</span>
    `;
    processList.appendChild(procItem);
  });
}

// Atualizar informações do sistema
function updateSystemInfo(osInfo, uptime) {
  document.getElementById('sysHostname').textContent = osInfo.hostname || '--';
  document.getElementById('sysVersion').textContent = `${osInfo.distro} ${osInfo.release}`;
  document.getElementById('sysUptime').textContent = formatUptime(uptime);
}

// Atualizar temperatura da CPU
function updateTemperature(cpuTemp) {
  const tempValue = document.getElementById('cpuTemp');
  const tempMax = document.getElementById('cpuTempMax');

  if (!cpuTemp || cpuTemp.main === null) {
    tempValue.textContent = 'N/A';
    tempMax.textContent = 'N/A';
    return;
  }

  // cpuTemp.main é a temperatura principal em Celsius
  // cpuTemp.max é a temperatura máxima (se disponível)
  const mainTemp = cpuTemp.main || 0;
  const maxTemp = cpuTemp.max || 0;

  tempValue.textContent = mainTemp.toFixed(1);
  tempMax.textContent = maxTemp > 0 ? `${maxTemp.toFixed(1)}°C` : 'N/A';

  // Mudar cor baseado na temperatura
  tempValue.classList.remove('temp-low', 'temp-medium', 'temp-high');
  if (mainTemp > 80) {
    tempValue.classList.add('temp-high');
  } else if (mainTemp > 60) {
    tempValue.classList.add('temp-medium');
  } else if (mainTemp > 0) {
    tempValue.classList.add('temp-low');
  }
}

// Mostrar/esconder botão de reconexão
function toggleReconnectButton(show) {
  const btn = document.getElementById('reconnectBtn');
  btn.style.display = show ? 'inline-block' : 'none';

  if (show) {
    btn.onclick = () => {
      socket.connect();
      toggleReconnectButton(false);
    };
  }
}

// WebSocket - Receber dados
socket.on('system-update', (data) => {
  updateCPU(data);
  updateMemory(data);
  updateBattery(data);
  updateProcesses(data.topProcesses);
  updateTemperature(data.cpuTemp);

  // Atualizar timestamp
  const now = new Date();
  document.getElementById('lastUpdate').textContent =
    `Última atualização: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
});

// Carregar dados iniciais via API REST
async function loadInitialData() {
  try {
    const response = await fetch('/api/system');
    const data = await response.json();

    updateDisk(data.disk);
    updateProcesses(data.topProcesses);
    updateSystemInfo(data.osInfo, data.uptime);
    updateTemperature(data.cpuTemp);
  } catch (err) {
    console.error('Erro ao carregar dados iniciais:', err);
  }
}

// Status da conexão
socket.on('connect', () => {
  document.getElementById('statusDot').classList.add('connected');
  toggleReconnectButton(false);
  loadInitialData();
});

socket.on('disconnect', () => {
  document.getElementById('statusDot').classList.remove('connected');
  toggleReconnectButton(true);
});

socket.on('reconnect_attempt', () => {
  console.log('Tentando reconectar...');
});

socket.on('reconnect_failed', () => {
  toggleReconnectButton(true);
});

// Carregar dados iniciais
loadInitialData();

// Prevenir zoom no iOS ao dar double-tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// ========== Sistema de Tabs ==========
let activeTab = 'system';
let openRouterRefreshInterval = null;

/**
 * Inicializa o sistema de tabs.
 * Adiciona event listeners aos botões e gerencia a troca de abas.
 */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      if (targetTab === activeTab) return;

      // Atualizar botões
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Atualizar conteúdo visível
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${targetTab}-tab`).classList.add('active');

      activeTab = targetTab;

      // Se entrou na tab do OpenRouter, carregar dados
      if (targetTab === 'openrouter') {
        loadOpenRouterData();
        startOpenRouterAutoRefresh();
      } else {
        stopOpenRouterAutoRefresh();
      }
    });
  });
}

// ========== OpenRouter Functions ==========

/**
 * Carrega todos os dados do OpenRouter (créditos, key, modelos, log local).
 */
async function loadOpenRouterData() {
  try {
    const [creditsRes, keyRes, modelsRes, logRes] = await Promise.all([
      fetch('/api/openrouter/credits'),
      fetch('/api/openrouter/key'),
      fetch('/api/openrouter/models'),
      fetch('/api/openrouter/usage-log')
    ]);

    const credits = await creditsRes.json();
    const key = await keyRes.json();
    const models = await modelsRes.json();
    const log = await logRes.json();

    renderCredits(credits.data);
    renderUsagePeriod(key.data);
    renderModels(models.data);
    renderUsageLog(log.data);
  } catch (err) {
    console.error('Erro ao carregar dados do OpenRouter:', err);
  }
}

/**
 * Renderiza o card de créditos.
 * @param {object} data - { total_credits, total_usage }
 */
function renderCredits(data) {
  if (!data) return;
  const credits = data.total_credits || 0;
  const usage = data.total_usage || 0;
  const remaining = credits - usage;

  document.getElementById('orTotalCredits').textContent = `$${credits.toFixed(2)}`;
  document.getElementById('orTotalUsage').textContent = `$${usage.toFixed(2)}`;
  document.getElementById('orRemaining').textContent = `$${remaining.toFixed(2)}`;
}

/**
 * Renderiza o card de uso por período.
 * @param {object} data - { usage_daily, usage_weekly, usage_monthly }
 */
function renderUsagePeriod(data) {
  if (!data) return;
  document.getElementById('orDaily').textContent = `$${data.usage_daily?.toFixed(2) || '0.00'}`;
  document.getElementById('orWeekly').textContent = `$${data.usage_weekly?.toFixed(2) || '0.00'}`;
  document.getElementById('orMonthly').textContent = `$${data.usage_monthly?.toFixed(2) || '0.00'}`;
}

/**
 * Renderiza a lista de modelos configurados com seus preços.
 * @param {Array} models - Lista de modelos da API
 */
function renderModels(models) {
  const container = document.getElementById('orModelsList');
  container.innerHTML = '';

  if (!models || models.length === 0) {
    container.innerHTML = '<p class="no-data">Nenhum modelo configurado encontrado.</p>';
    return;
  }

  models.forEach(model => {
    const pricePrompt = parseFloat(model.pricing?.prompt || 0) * 1000000; // por 1M tokens
    const priceCompletion = parseFloat(model.pricing?.completion || 0) * 1000000;
    const modelItem = document.createElement('div');
    modelItem.className = 'model-item';
    modelItem.innerHTML = `
      <div class="model-name">${model.name || model.id}</div>
      <div class="model-pricing">
        <span>Prompt: $${pricePrompt.toFixed(2)}/1M</span>
        <span>Completion: $${priceCompletion.toFixed(2)}/1M</span>
      </div>
    `;
    container.appendChild(modelItem);
  });
}

/**
 * Renderiza o log de uso local.
 * @param {Array} log - Lista de entradas de uso
 */
function renderUsageLog(log) {
  const container = document.getElementById('orUsageLog');
  container.innerHTML = '';

  if (!log || log.length === 0) {
    container.innerHTML = '<p class="no-data">Nenhum registro local ainda.</p>';
    return;
  }

  // Mostrar últimos 10 registros
  const recent = log.slice(-10).reverse();
  recent.forEach(entry => {
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    const date = new Date(entry.timestamp).toLocaleString('pt-BR');
    logItem.innerHTML = `
      <span class="log-model">${entry.model}</span>
      <span class="log-cost">$${entry.cost?.toFixed(4) || '0.0000'}</span>
      <span class="log-time">${date}</span>
    `;
    container.appendChild(logItem);
  });
}

/**
 * Inicia atualização automática da tab OpenRouter a cada 60s.
 */
function startOpenRouterAutoRefresh() {
  if (openRouterRefreshInterval) return;
  openRouterRefreshInterval = setInterval(loadOpenRouterData, 60000);
}

/**
 * Para a atualização automática da tab OpenRouter.
 */
function stopOpenRouterAutoRefresh() {
  if (openRouterRefreshInterval) {
    clearInterval(openRouterRefreshInterval);
    openRouterRefreshInterval = null;
  }
}

// Inicializar tabs ao carregar a página
document.addEventListener('DOMContentLoaded', initTabs);
