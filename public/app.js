const socket = io();

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

// WebSocket - Receber dados
socket.on('system-update', (data) => {
  updateCPU(data);
  updateMemory(data);
  updateBattery(data);

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
    updateSystemInfo(data.osInfo, data.osInfo.uptime);
  } catch (err) {
    console.error('Erro ao carregar dados iniciais:', err);
  }
}

// Status da conexão
socket.on('connect', () => {
  document.getElementById('statusDot').classList.add('connected');
  loadInitialData();
});

socket.on('disconnect', () => {
  document.getElementById('statusDot').classList.remove('connected');
});

// Carregar dados iniciais
loadInitialData();
