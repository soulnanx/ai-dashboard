#!/bin/bash

# Carregar variáveis do arquivo .env (se existir)
if [ -f "$(dirname "$0")/.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/.env" | xargs)
fi

# Caminho direto para o Node do NVM (evita problemas com lazy load)
export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"

# Manter o Mac acordado enquanto o dashboard rodar
# -i  = impedir que o sistema durma (idle sleep)
# -m = impedir que a tela durma (display sleep)
# -s = impedir sleep quando fechado (se tiver um monitor externo)

exec /usr/bin/caffeinate -i -m node server.js
