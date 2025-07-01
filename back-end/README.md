# Backend – SO Dashboard

Este diretório contém a API backend do projeto SO Dashboard, desenvolvida em Python com Flask.

## Funcionalidades
- Fornece endpoints REST para monitoramento de:
  - Processos do sistema
  - Uso de CPU e memória
  - Estatísticas de E/S de processos
  - Sistema de arquivos e navegação de diretórios

## Estrutura
- `main.py` — Inicializa o servidor Flask e registra as rotas.
- `controller.py` — Lógica das rotas e integração com o modelo.
- `model.py` — Funções de acesso ao sistema operacional (leitura de /proc, etc).
- `requirements.txt` — Dependências Python do backend.

## Como executar

### Pré-requisitos
- Python 3.x
- (Recomendado) Ambiente virtual Python

### Instalação

1. Crie e ative um ambiente virtual (opcional, mas recomendado):

```sh
python3 -m venv venv
source venv/bin/activate
```

2. Instale as dependências:

```sh
pip install -r requirements.txt
```

Ou, na raiz do projeto, use o Makefile para instalar tudo automaticamente:

```sh
make setup_backend
```

### Execução

Para rodar o backend manualmente:

```sh
python main.py
```

Ou, usando o Makefile na raiz do projeto:

```sh
make run_backend
```

O backend estará disponível em http://localhost:5000

## Observações
- O backend foi projetado para rodar em sistemas Linux.
- Para integração completa, utilize também o frontend React disponível na pasta `../front-end`.

## Limpeza
Para remover o ambiente virtual e arquivos temporários:

```sh
make clean_backend
```

---
Desenvolvido para a disciplina de Sistemas Operacionais – UTFPR.
