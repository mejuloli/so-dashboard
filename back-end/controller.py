import time
import model  # Importa o módulo model.py (que contém a lógica de coleta de dados)
import threading # Para criar a thread de atualização do cache

"""#####################################################################################################
######################################### PROJETO A ####################################################
#####################################################################################################"""

class Controller:
    def __init__(self):

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
                    "total_processes": 0, "total_threads": 0}, # Informações da CPU e contagens
            'filesystem': [],       # Lista de partições e uso
            'directory': {},        # Conteúdo do diretório atual
            'process_io': {}        # Cache de E/S por processo
        }

        # Atributo para rastrear a thread de atualização, inicializado como None.
        self._update_thread = None

    #--------------------------------------------------------------------------------------------------------------------------

    def _update_data_cache_internal(self):
        """
        Método privado responsável por atualizar o cache de dados (self.current_data_cache).
        Este método é chamado periodicamente pela thread de atualização em background.
        Ele adquire um lock para garantir que a atualização do cache seja atômica e segura.
        """
        # Adquire o lock. Apenas uma thread pode executar este bloco por vez.
        with self.data_cache_lock: 

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

            # Atualiza o cache de informações do sistema de arquivos
            self.current_data_cache['filesystem'] = model.get_filesystem_info()

            # Atualiza o cache do conteúdo do diretório atual (padrão é '/')
            self.current_data_cache['process_io'] = {}
            for proc in processes_list_data:
                pid = proc['pid']
                self.current_data_cache['process_io'][pid] = {
                    'io_stats': model.get_process_es_info(pid),
                    'open_files': model.get_process_open_files(pid)
                }
    
    #--------------------------------------------------------------------------------------------------------------------------

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

    #--------------------------------------------------------------------------------------------------------------------------

    def get_all_processes_info_from_cache(self):
        with self.data_cache_lock: # Garante leitura segura do cache.
            # .get('processes', []) retorna [] se 'processes' não estiver no cache.
            # list(...) cria uma cópia superficial da lista.
            return list(self.current_data_cache.get('processes', [])) 
        
    #--------------------------------------------------------------------------------------------------------------------------
    
    def get_system_memory_info_from_cache(self):
        with self.data_cache_lock:
            # dict(...) cria uma cópia superficial do dicionário.
            return dict(self.current_data_cache.get('memory', {})) 
        
    #--------------------------------------------------------------------------------------------------------------------------
    
    def get_system_cpu_info_from_cache(self):
        with self.data_cache_lock:
            return dict(self.current_data_cache.get('cpu', {}))
        
    #--------------------------------------------------------------------------------------------------------------------------
            
    def get_specific_process_info_from_cache(self, pid_to_find):
        with self.data_cache_lock:
            processes_in_cache = self.current_data_cache.get('processes', [])
            for proc_data in processes_in_cache:
                if proc_data.get('pid') == pid_to_find:
                    return dict(proc_data) # Retorna uma cópia do dicionário do processo.
            return None # Processo não encontrado no cache.


    """#####################################################################################################
    ######################################### PROJETO B ####################################################
    #####################################################################################################"""


    # método para obter informações do sistema de arquivos
    def get_filesystem_info_from_cache(self):
        with self.data_cache_lock:
            return list(self.current_data_cache.get('filesystem', []))
        
    #--------------------------------------------------------------------------------------------------------------------------

    # método para obter o conteúdo de um diretório específico do cache
    def get_directory_contents_from_cache(self, path='/'):
        with self.data_cache_lock:
            return dict(self.current_data_cache.get('directory', {}))
        
    #--------------------------------------------------------------------------------------------------------------------------

    # método para obter informações de E/S de um processo específico do cache
    def get_process_io_info_from_cache(self, pid):
        with self.data_cache_lock:
            return dict(self.current_data_cache['process_io'].get(pid, {}))
