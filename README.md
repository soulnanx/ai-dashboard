# 🖥️ AI Dashboard

Dashboard web para monitoramento de sistema em tempo real no macOS.

![Node.js](https://img.shields.io/badge/Node.js-24.11.0-green)
![macOS](https://img.shields.io/badge/macOS-15.7.7-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Comandos Makefile](#-comandos-makefile)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API](#-api)
- [Serviço macOS (LaunchAgent)](#-serviço-macos-launchagent)
- [Solução de Problemas](#-solução-de-problemas)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## ✨ Funcionalidades

- ⚡ **CPU** — Uso atual, carga e número de cores
- 🌡️ **Temperatura CPU** — Temperatura atual (quando disponível)
- 🧠 **Memória RAM** — Usada, livre e total com barra de progresso
- 🔋 **Bateria** — Nível, status de carregamento e tempo restante
- 💾 **Armazenamento** — Discos com uso em GB
- 📊 **Top 10 Processos** — Consumo de CPU e RAM em tempo real
- ℹ️ **Sistema** — Hostname, macOS e uptime
- 💰 **OpenRouter** — Créditos, uso e modelos configurados
- 🔄 **Atualização automática** — Dados atualizados via WebSocket a cada 2 segundos

---

## 🌡️ Temperatura da CPU

### Linux
- ✅ Funciona nativamente via biblioteca `systeminformation`
- Temperatura exibida em °C com cores indicativas:
  - 🔵 Azul: < 60°C
  - 🟡 Amarelo: 60-80°C
  - 🔴 Vermelho: > 80°C

### macOS
- ⚠️ **Limitação do sistema:** O macOS não expõe a temperatura da CPU via APIs padrão
- O dashboard exibe **"N/A"** no macOS por padrão
- **Solução:** Instalar uma das ferramentas abaixo para ler os sensores SMC

#### Opção 1: `osx-cpu-temp` (via Homebrew)
```bash
# Instalar
brew install osx-cpu-temp

# Testar
osx-cpu-temp
```

#### Opção 2: `smc` (SMC Reader)
```bash
# Instalar
brew install smc

# Testar (retorna temperatura)
smc -t
```

#### Opção 3: `powermetrics` (nativo, requer sudo)
```bash
# Executar com sudo
sudo powermetrics --samplers smc -i1 -n1 | grep "CPU die temperature"
```

> **Nota:** Após instalar uma das ferramentas, reinicie o serviço do dashboard:
> ```bash
> make restart
> ```

---

## 🛠️ Tecnologias

- **Backend:** Node.js 24.11.0 + Express + Socket.io
- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **Bibliotecas:**
  - `systeminformation` — Coleta de dados do sistema
  - `express` — Servidor web
  - `socket.io` — WebSocket para tempo real
- **Deploy:** LaunchAgent (macOS service manager)

---

## 📥 Instalação

### Pré-requisitos

- macOS 15.7.7 ou superior
- Node.js (recomendado via nvm)

### Passo a passo

```bash
# 1. Clonar repositório
git clone https://github.com/renansan/ai-dashboard.git
cd ai-dashboard

# 2. Instalar dependências
make install
# ou
npm install

# 3. (Opcional) Instalar como serviço macOS
make install-service
```

---

## 🚀 Uso

### Iniciar servidor (desenvolvimento)

```bash
make dev
# ou
node server.js
```

Acesse: [http://localhost:3000](http://localhost:3000)

### Iniciar como serviço (LaunchAgent)

```bash
make start
```

Acesse via IP da rede local:
```
http://192.168.3.30:3000
```

### Parar serviço

```bash
make stop
```

---

## 🔧 Comandos Makefile

| Comando | Descrição |
|---------|-----------|
| `make install` | Instalar dependências npm |
| `make dev` | Iniciar servidor em modo dev |
| `make start` | Iniciar serviço via LaunchAgent |
| `make stop` | Parar serviço |
| `make restart` | Reiniciar serviço |
| `make status` | Ver status do serviço |
| `make logs` | Ver logs em tempo real |
| `make test` | Testar API REST |
| `make install-service` | Instalar LaunchAgent |
| `make uninstall-service` | Desinstalar LaunchAgent |
| `make deploy` | Instalar deps + serviço |
| `make clean` | Limpar arquivos de log |
| `make help` | Mostrar ajuda |

---

## 📂 Estrutura do Projeto

```
ai-dashboard/
├── server.js                          # Servidor Node.js + Express + Socket.io
├── package.json                       # Dependências npm
├── Makefile                           # Automação de tarefas
├── README.md                          # Documentação
├── com.renansan.ai-dashboard.plist   # Configuração LaunchAgent
├── public/
│   ├── index.html                    # Página principal
│   ├── style.css                     # Estilos (tema escuro)
│   └── app.js                       # Lógica frontend + WebSocket
├── server.log                         # Log do servidor (gerado)
└── server.error.log                   # Log de erros (gerado)
```

---

## 🔌 API

### GET `/api/system`

Retorna dados pontuais do sistema.

**Exemplo de resposta:**

```json
{
  "cpu": { "brand": "Core™ i7-7700HQ", "cores": 8, "speed": 2.8 },
  "mem": { "total": 17179869184, "free": 4632285184, "used": 12547584000 },
  "battery": { "percent": 100, "isCharging": false },
  "disk": [ { "mount": "/", "size": 250685575168, "used": 25396563968 } ],
  "topProcesses": [
    { "name": "node", "pcpu": 5.5, "pmem": 0.4 }
  ],
  "osInfo": { "hostname": "MacBook-Pro", "distro": "macOS", "release": "15.7.7" }
}
```

### WebSocket `system-update`

Evento emitido a cada 2 segundos com dados em tempo real.

---

## 🍎 Serviço macOS (LaunchAgent)

O projeto inclui um **LaunchAgent** para inicialização automática.

### Localização

```
~/Library/LaunchAgents/com.renansan.ai-dashboard.plist
```

### Comandos

```bash
# Instalar serviço
make install-service

# Desinstalar
make uninstall-service

# Ver logs
tail -f server.log
tail -f server.error.log
```

### Configuração manual

Se precisar ajustar o caminho do Node.js:

```bash
# Ver caminho do Node
which node

# Editar plist
nano com.renansan.ai-dashboard.plist

# Recarregar serviço
make restart
```

---

## 🐛 Solução de Problemas

### ❌ Top 10 processos não aparecem

**Causa:** Propriedades incorretas na lib `systeminformation`.

**Solução:**
- ✅ Corrigido na v2.0.0 — usa `p.cpu` e `p.memRss`
- Reinicie o serviço: `make restart`

---

### ❌ Serviço não inicia (caminho do Node errado)

**Causa:** LaunchAgent usa caminho fixo do Node.

**Solução:**

```bash
# 1. Achar caminho correto
nvm which current

# 2. Atualizar plist
# Editar: com.renansan.ai-dashboard.plist
# Trocar: /usr/local/bin/node pelo caminho correto

# 3. Reinstalar serviço
make uninstall-service
make install-service
```

---

### ❌ WebSocket não conecta

**Sintomas:** Dados não atualizam, pontinho vermelho no dashboard.

**Solução:**

```bash
# 1. Verificar se servidor está rodando
make status

# 2. Verificar logs
make logs

# 3. Reiniciar
make restart
```

---

### ❌ Porta 3000 já em uso

```bash
# Achar processo usando a porta
lsof -i :3000

# Matar processo
kill -9 <PID>
```

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Add nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📝 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---

## 👤 Autor

**Renan Santana**

- 📧 Email: renansan@example.com
- 🐙 GitHub: [@renansan](https://github.com/renansan)

---

## 🎉 Agradecimentos

- [systeminformation](https://github.com/sebhildebrandt/systeminformation) — Biblioteca de coleta de dados
- [Socket.io](https://socket.io/) — WebSocket em tempo real
- [Express](https://expressjs.com/) — Servidor web minimalista

---

## 📊 Status do Projeto

✅ **Em produção** — Serviço rodando no macOS como LaunchAgent

**Versão atual:** 1.0.0  
**Última atualização:** Julho 2026

---

<p align="center">
  Feito com ❤️ por Renan Santana
</p>
