import time
import model  # Importa o módulo model.py (que contém a lógica de coleta de dados)
import threading # Para criar a thread de atualização do cache

class Controller:
    def __init__(self):
        """
        Construtor da classe Controller.
        Inicializa o intervalo de atualização do cache, o lock para acesso thread-safe
        ao cache, a estrutura do cache e a thread de atualização (que será iniciada externamente).
        """
        # Intervalo em segundos para a atualização periódica do cache de dados.
        self.update_interval_seconds = 5 
        # Lock (trava) para garantir que o acesso ao cache de dados (leitura/escrita)
        # seja seguro em um ambiente com múltiplas threads (evita race conditions).
        self.data_cache_lock = threading.Lock()
        
        # Estrutura inicial do cache de dados.
        # Este dicionário armazenará os dados mais recentes coletados do sistema.
        self.current_data_cache = {
            'processes': [], # Lista de processos detalhados
            'memory': {"ram": {}, "swap": {}}, # Informações de memória RAM e SWAP
            'cpu': {"overall_usage_percent": 0.0, "overall_idle_percent": 100.0, 
                    "number_of_cores": 0, "cores": [], 
                    "total_processes": 0, "total_threads": 0} # Informações da CPU e contagens
        }
        # Atributo para rastrear a thread de atualização, inicializado como None.
        self._update_thread = None

    def _update_data_cache_internal(self):
        """
        Método privado responsável por atualizar o cache de dados (self.current_data_cache).
        Este método é chamado periodicamente pela thread de atualização em background.
        Ele adquire um lock para garantir que a atualização do cache seja atômica e segura.
        """
        # Adquire o lock. Apenas uma thread pode executar este bloco por vez.
        with self.data_cache_lock: 
            # print(f"[{time.strftime('%H:%M:%S')}] Controller: Atualizando cache de dados...") # Log para debug

            # Chama as funções do módulo 'model' para obter os dados mais recentes do sistema.
            processes_list_data = model.get_processes()
            memory_system_data = model.get_memory_usage()
            cpu_model_raw_data = model.get_cpu_usage() # Contém 'overall_usage_percent', 'cores', etc.

            # Atualiza as respectivas chaves no dicionário de cache.
            self.current_data_cache['processes'] = processes_list_data
            self.current_data_cache['memory'] = memory_system_data
            
            # Para os dados da CPU, combina os dados brutos do model com contagens de processos/threads
            # derivadas da lista de processos atualizada.
            self.current_data_cache['cpu'] = {
                **cpu_model_raw_data, # Desempacota os dados da CPU vindos do model
                'total_processes': len(processes_list_data), # Calcula o número total de processos
                # Calcula o número total de threads somando o campo 'threads' de cada processo
                'total_threads': sum(int(p.get('threads', 0)) for p in processes_list_data)
            }
            # print(f"[{time.strftime('%H:%M:%S')}] Controller: Cache de dados atualizado.") # Log para debug

    def start_periodic_cache_update_thread(self):
        """
        Inicia uma thread em background que chama `_update_data_cache_internal()` periodicamente.
        A thread é configurada como 'daemon', o que significa que ela não impedirá
        o programa principal de terminar.
        Evita iniciar múltiplas threads se uma já estiver rodando.
        """
        # Verifica se a thread já foi criada e se ainda está ativa.
        if self._update_thread is None or not self._update_thread.is_alive():
            print("Controller: Iniciando thread de atualização periódica do cache.")
            
            # Define a função que será executada em loop pela thread.
            def _cache_update_loop():
                while True: # Loop infinito para atualização contínua.
                    try:
                        self._update_data_cache_internal() # Chama o método de atualização do cache.
                    except Exception as e_thread_loop:
                        # Captura exceções dentro do loop da thread para evitar que a thread morra silenciosamente.
                        print(f"Erro crítico na thread de atualização do cache do Controller: {e_thread_loop}")
                    time.sleep(self.update_interval_seconds) # Aguarda o intervalo definido antes da próxima atualização.
            
            # Cria a nova thread.
            self._update_thread = threading.Thread(target=_cache_update_loop, daemon=True)
            # Inicia a execução da thread.
            self._update_thread.start()
        else:
            print("Controller: Thread de atualização periódica do cache já está em execução.")

    # --- Métodos Públicos para Acesso ao Cache (chamados pelos endpoints da API) ---

    def get_all_processes_info_from_cache(self):
        """
        Retorna a lista de informações de todos os processos armazenados no cache.
        Adquire um lock para leitura segura e retorna uma cópia da lista
        para evitar modificações externas acidentais no cache.

        Retorna:
          list: Uma cópia da lista de dicionários de processos do cache.
                Retorna uma lista vazia se o cache de processos não existir.
        """
        with self.data_cache_lock: # Garante leitura segura do cache.
            # .get('processes', []) retorna [] se 'processes' não estiver no cache.
            # list(...) cria uma cópia superficial da lista.
            return list(self.current_data_cache.get('processes', [])) 
    
    def get_system_memory_info_from_cache(self):
        """
        Retorna as informações de uso de memória do sistema armazenadas no cache.
        Adquire um lock para leitura segura e retorna uma cópia do dicionário.

        Retorna:
          dict: Uma cópia do dicionário de informações de memória do cache.
                Retorna um dicionário vazio se o cache de memória não existir.
        """
        with self.data_cache_lock:
            # dict(...) cria uma cópia superficial do dicionário.
            return dict(self.current_data_cache.get('memory', {})) 
    
    def get_system_cpu_info_from_cache(self):
        """
        Retorna as informações de uso da CPU do sistema (incluindo totais de processos/threads)
        armazenadas no cache. Adquire um lock para leitura segura e retorna uma cópia do dicionário.

        Retorna:
          dict: Uma cópia do dicionário de informações da CPU do cache.
                Retorna um dicionário vazio se o cache da CPU não existir.
        """
        with self.data_cache_lock:
            return dict(self.current_data_cache.get('cpu', {}))
            
    def get_specific_process_info_from_cache(self, pid_to_find):
        """
        Busca um processo específico pelo seu PID na lista de processos do cache.
        Adquire um lock para leitura segura.

        Parâmetros:
          pid_to_find (int): O ID do processo a ser encontrado.
        Retorna:
          dict or None: Uma cópia do dicionário do processo se encontrado no cache,
                        caso contrário, retorna None.
        """
        with self.data_cache_lock:
            processes_in_cache = self.current_data_cache.get('processes', [])
            for proc_data in processes_in_cache:
                if proc_data.get('pid') == pid_to_find:
                    return dict(proc_data) # Retorna uma cópia do dicionário do processo.
            return None # Processo não encontrado no cache.