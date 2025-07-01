# so-dashboard
Repositório contendo o projeto final da disciplina de Sistemas Operacionais, ministrada pelo Prof. Marco Aurélio Wehrmeister (UTFPR).

O projeto consiste em um Dashboard de SO, que monitora processos, CPU, memória, E/S e sistema de arquivos em Linux. Desenvolvido com Python (leitura de /proc e APIs de baixo nível) e React, seguindo arquitetura multitarefa e padrão MVC.

## Como executar

### Pré-requisitos
- Python 3.x
- pip
- Node.js e npm (ou yarn)

### Instalação e execução rápida

1. Instale todas as dependências (backend e frontend):

```sh
make setup
```

2. Em um terminal, inicie o backend Flask:

```sh
make run_backend
```

3. Em outro terminal, inicie o frontend React:

```sh
make run_frontend
```

Acesse o dashboard em [http://localhost:3000](http://localhost:3000).

### Outros comandos úteis
- `make clean` — Remove dependências e arquivos temporários de backend e frontend.
- `make help` — Exibe todos os comandos disponíveis.

Veja o Makefile para mais detalhes e opções.
