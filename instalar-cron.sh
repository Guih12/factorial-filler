#!/bin/bash
# Instala os agendamentos de ponto no launchd do macOS
# Horários: 08:00, 12:00, 13:00, 17:00 (seg-sex)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_PATH="$(which node)"
PLIST_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p "$LOG_DIR"

criar_plist() {
  local nome="$1"
  local hora="$2"
  local minuto="$3"
  local arquivo="$PLIST_DIR/com.ponto-factorial.${nome}.plist"

  cat > "$arquivo" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ponto-factorial.${nome}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${SCRIPT_DIR}/ponto.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <dict>
            <key>Hour</key>
            <integer>${hora}</integer>
            <key>Minute</key>
            <integer>${minuto}</integer>
            <key>Weekday</key>
            <integer>1</integer>
        </dict>
        <dict>
            <key>Hour</key>
            <integer>${hora}</integer>
            <key>Minute</key>
            <integer>${minuto}</integer>
            <key>Weekday</key>
            <integer>2</integer>
        </dict>
        <dict>
            <key>Hour</key>
            <integer>${hora}</integer>
            <key>Minute</key>
            <integer>${minuto}</integer>
            <key>Weekday</key>
            <integer>3</integer>
        </dict>
        <dict>
            <key>Hour</key>
            <integer>${hora}</integer>
            <key>Minute</key>
            <integer>${minuto}</integer>
            <key>Weekday</key>
            <integer>4</integer>
        </dict>
        <dict>
            <key>Hour</key>
            <integer>${hora}</integer>
            <key>Minute</key>
            <integer>${minuto}</integer>
            <key>Weekday</key>
            <integer>5</integer>
        </dict>
    </array>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/${nome}.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/${nome}.err</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

  # Descarrega se já estava carregado
  launchctl unload "$arquivo" 2>/dev/null
  launchctl load "$arquivo"
  echo "Agendado: ${nome} às ${hora}:$(printf '%02d' ${minuto})"
}

criar_plist "entrada"       8  0
criar_plist "saida-almoco" 12  0
criar_plist "retorno"      13  0
criar_plist "saida"        17  0

echo ""
echo "Ponto automatizado! Agendamentos ativos:"
launchctl list | grep ponto-factorial
