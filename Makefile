# Makefile para configurar e executar o Projeto Dashboard de SO

# --- Configurações e Variáveis ---

# Detecta o interpretador Python 3.x.
# Tenta 'python3' primeiro, depois 'python' como fallback.
PYTHON := $(shell command -v python3 || command -v python)

# Define o comando pip correspondente ao Python detectado.
PIP := $(PYTHON) -m pip

# Caminho para a pasta do backend.
# Se seus arquivos .py estão na raiz do projeto, use: BACKEND_DIR := .
BACKEND_DIR := ./backend

# Caminho para a pasta do frontend React.
FRONTEND_DIR := ./so-dashboard/front-end

# Comandos para gerenciamento de pacotes Node.js.
# Detecta se 'yarn' está disponível; caso contrário, usa 'npm'.
YARN_EXISTS := $(shell command -v yarn 2>/dev/null)
ifeq ($(strip $(YARN_EXISTS)),)
    # Yarn não encontrado, usando npm
    NPM_INSTALL_CMD := npm install --legacy-peer-deps
    NPM_START_CMD   := npm start
else
    # Yarn encontrado
    NPM_INSTALL_CMD := yarn install
    NPM_START_CMD   := yarn start
endif

# Nome do arquivo principal do backend Flask.
FLASK_APP_FILE := main.py


# --- Alvos Principais (Comandos que você pode executar) ---

# Alvo padrão: exibe uma mensagem de ajuda com os comandos disponíveis.
# .PHONY garante que o alvo seja executado mesmo que exista um arquivo com o mesmo nome.
.PHONY: help
help:
	@echo "----------------------------------------------------"
	@echo " Makefile para o Projeto Dashboard de SO            "
	@echo "----------------------------------------------------"
	@echo "Comandos disponíveis:"
	@echo "  make setup          - Instala todas as dependências (backend e frontend)."
	@echo "  make setup_backend  - Instala apenas as dependências do backend Python."
	@echo "  make setup_frontend - Instala apenas as dependências do frontend React."
	@echo ""
	@echo "  make run_backend    - Inicia o servidor backend Flask (em um terminal)."
	@echo "  make run_frontend   - Inicia o servidor de desenvolvimento do frontend React (em outro terminal)."
	@echo ""
	@echo "  make run_all        - (Experimental) Tenta iniciar backend e frontend em background."
	@echo "                      Requer 'nohup' e pode dificultar a visualização de logs."
	@echo "                      Use 'killall $(PYTHON)' e 'killall node' (ou pkill) para parar."
	@echo ""
	@echo "  make clean          - Remove pastas de dependências (node_modules, venv, __pycache__)."
	@echo "  make clean_backend  - Limpa apenas arquivos gerados pelo backend."
	@echo "  make clean_frontend - Limpa apenas arquivos gerados pelo frontend."
	@echo "----------------------------------------------------"
	@echo "Pré-requisitos: Python 3, pip, Node.js, e npm (ou yarn)."

# Alvo para instalar todas as dependências do projeto.
.PHONY: setup
setup: setup_backend setup_frontend
	@echo ">>> Configuração de todas as dependências concluída."

# --- Alvos do Backend ---

# Cria e ativa um ambiente virtual Python, e instala dependências.
.PHONY: setup_backend
setup_backend: $(BACKEND_DIR)/venv/bin/activate
$(BACKEND_DIR)/venv/bin/activate: $(BACKEND_DIR)/requirements.txt
	@echo ">>> Configurando ambiente virtual e dependências do backend..."
	@if [ ! -d "$(BACKEND_DIR)/venv" ]; then \
		$(PYTHON) -m venv $(BACKEND_DIR)/venv; \
		echo "Ambiente virtual criado em $(BACKEND_DIR)/venv"; \
	fi
	@# Ativa o venv para o comando pip
	@( . $(BACKEND_DIR)/venv/bin/activate && \
	   echo "Instalando dependências de $(BACKEND_DIR)/requirements.txt no ambiente virtual..." && \
	   $(PIP) install -r $(BACKEND_DIR)/requirements.txt \
	)
	@echo ">>> Dependências do backend Python instaladas no ambiente virtual."
	@echo ">>> Para ativar o ambiente virtual manualmente: source $(BACKEND_DIR)/venv/bin/activate"

# Inicia o servidor backend Flask usando o ambiente virtual.
.PHONY: run_backend
run_backend:
	@echo ">>> Iniciando servidor backend Flask em http://localhost:5000..."
	@echo ">>> (Certifique-se de que o ambiente virtual está ativo se rodar manualmente,"
	@echo ">>>  ou use este comando que o ativa temporariamente)"
	@echo ">>> Pressione CTRL+C para parar o servidor backend."
	@( . $(BACKEND_DIR)/venv/bin/activate && \
	   cd $(BACKEND_DIR) && $(PYTHON) $(FLASK_APP_FILE) \
	) || echo "Falha ao iniciar backend. O ambiente virtual existe em $(BACKEND_DIR)/venv?"


# --- Alvos do Frontend ---

# Instala dependências do frontend React.
# Verifica a existência do package.json.
.PHONY: setup_frontend
setup_frontend:
	@echo ">>> Configurando dependências do frontend (pode levar alguns minutos)..."
ifeq ("$(wildcard $(FRONTEND_DIR)/package.json)","")
	@echo "ERRO: $(FRONTEND_DIR)/package.json não encontrado!"
	@echo "Não é possível instalar dependências do frontend."
	@exit 1
else
	cd $(FRONTEND_DIR) && $(NPM_INSTALL_CMD)
	@echo ">>> Dependências do frontend instaladas com sucesso."
endif

# Inicia o servidor de desenvolvimento do frontend React.
.PHONY: run_frontend
run_frontend:
	@echo ">>> Iniciando servidor de desenvolvimento do frontend React..."
	@echo ">>> Geralmente disponível em http://localhost:3000 (verifique a saída do comando)."
	@echo ">>> Pressione CTRL+C para parar o servidor frontend."
ifeq ("$(wildcard $(FRONTEND_DIR)/package.json)","")
	@echo "ERRO: $(FRONTEND_DIR)/package.json não encontrado!"
	@echo "Não é possível iniciar o frontend."
	@exit 1
else
	cd $(FRONTEND_DIR) && $(NPM_START_CMD)
endif


# --- Alvo Experimental para Rodar Ambos em Background ---
# NOTA: Rodar em background assim pode dificultar o debug.
# Para produção, use gerenciadores de processo como systemd, PM2, ou Docker.
.PHONY: run_all
run_all:
	@echo ">>> (Experimental) Iniciando backend e frontend em background..."
	@echo ">>> Backend logs -> $(BACKEND_DIR)/backend.log | Frontend logs -> $(FRONTEND_DIR)/frontend.log"
	@echo ">>> Use 'killall $(PYTHON)' e 'killall node' (ou pkill) para parar."
	@( . $(BACKEND_DIR)/venv/bin/activate && \
	   cd $(BACKEND_DIR) && nohup $(PYTHON) $(FLASK_APP_FILE) > backend.log 2>&1 & \
	) && echo "Backend (PID $$!) iniciado em background." || echo "Falha ao iniciar backend."
	@( cd $(FRONTEND_DIR) && nohup $(NPM_START_CMD) > frontend.log 2>&1 & \
	) && echo "Frontend (PID $$!) iniciado em background." || echo "Falha ao iniciar frontend."
	@echo "Aguarde alguns instantes para os servidores iniciarem completamente."


# --- Alvos de Limpeza ---

.PHONY: clean_backend
clean_backend:
	@echo ">>> Limpando arquivos gerados pelo backend..."
	@find $(BACKEND_DIR) -type d -name "__pycache__" -exec rm -rf {} +
	@find $(BACKEND_DIR) -type f -name "*.pyc" -delete
	@if [ -d "$(BACKEND_DIR)/venv" ]; then rm -rf $(BACKEND_DIR)/venv; fi
	@if [ -f "$(BACKEND_DIR)/backend.log" ]; then rm -f $(BACKEND_DIR)/backend.log; fi
	@echo ">>> Limpeza do backend concluída."

.PHONY: clean_frontend
clean_frontend:
	@echo ">>> Limpando arquivos gerados pelo frontend..."
	@if [ -d "$(FRONTEND_DIR)/node_modules" ]; then rm -rf $(FRONTEND_DIR)/node_modules; fi
	@# Remova lock files com base no que você usa (npm ou yarn)
	@if [ -f "$(FRONTEND_DIR)/package-lock.json" ]; then rm -f $(FRONTEND_DIR)/package-lock.json; fi
	@if [ -f "$(FRONTEND_DIR)/yarn.lock" ]; then rm -f $(FRONTEND_DIR)/yarn.lock; fi
	@# Se você tiver uma pasta de build para produção do frontend:
	@if [ -d "$(FRONTEND_DIR)/build" ]; then rm -rf $(FRONTEND_DIR)/build; fi
	@if [ -f "$(FRONTEND_DIR)/frontend.log" ]; then rm -f $(FRONTEND_DIR)/frontend.log; fi
	@echo ">>> Limpeza do frontend concluída."

# Alvo para limpar todos os arquivos gerados e pastas de dependências.
.PHONY: clean
clean: clean_backend clean_frontend
	@echo ">>> Limpeza geral do projeto concluída."