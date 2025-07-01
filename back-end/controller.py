import time
import model
import threading


# definição da classe Controller, responsável por gerenciar a coleta e o cache de dados do sistema
class Controller:

    # função construtora da classe Controller
    def __init__(self):

        # intervalo de atualização do cache em segundos
        self.update_interval_seconds = 5

        # criação de uma trava para garantir que os dados do cache não sejam acessados simultaneamente pelas threads
        self.data_cache_lock = threading.Lock()

        # dicionário que armazena os dados do cache - processos, uso de memória e uso de CPU
        self.current_data_cache = {
            'processes': [],
            'memory': {"ram": {}, "swap": {}}, 
            'cpu': {
                "overall_usage_percent": 0.0, 
                "overall_idle_percent": 100.0,
                "number_of_cores": 0, 
                "cores": [],
                "total_processes": 0, 
                "total_threads": 0
            },
            'filesystem': [],
            'directory': {},
            'process_io': {}
        }

        # inicialização da thread de atualização periódica do cache como None
        self._update_thread = None

        # tempo de validade do cache em segundos, apenas para directory e process_io
        self.cache_expiry_seconds = 5  # tempo de validade do cache

    #---------------------------------------------------------------------------------------------------#

    # função interna que atualiza os dados do cache e coleta informações sobre processos, uso de memória e uso de CPU
    def _update_data_cache_internal(self):
        
        # Colete os dados fora do lock!
        processes_list_data = model.get_processes()
        memory_system_data = model.get_memory_usage()
        cpu_model_raw_data = model.get_cpu_usage()
        filesystem_list_data = model.get_filesystem_info()

        self._clean_expired_cache() # Limpa o cache de dados expirados
        # bloqueia o acesso ao cache para garantir que os dados não sejam acessados simultaneamente
        # Atualiza o cache com os dados coletados
        with self.data_cache_lock:
            self.current_data_cache["processes"] = processes_list_data
            self.current_data_cache["memory"] = memory_system_data
            self.current_data_cache["cpu"] = {
                **cpu_model_raw_data,
                "total_processes": len(processes_list_data),
                "total_threads": sum(int(p.get("threads", 0)) for p in processes_list_data),
            }
            self.current_data_cache["filesystem"] = filesystem_list_data
        """# atualiza o cache do conteúdo do diretório atual (padrão é '/')
        self.current_data_cache['process_io'] = {}
        for proc in processes_list_data:
            pid = proc['pid']
            self.current_data_cache['process_io'][pid] = {
                'io_stats': model.get_process_es_info(pid),
                'open_files': model.get_process_open_files(pid)
            }"""

    #---------------------------------------------------------------------------------------------------#

    # função que inicia a thread de atualização periódica do cache
    def start_periodic_cache_update_thread(self):

        # verifica se a thread de atualização já está em execução; se não, inicia uma nova thread
        if self._update_thread is None or not self._update_thread.is_alive():
            print("Controller: Iniciando thread de atualização periódica do cache.")
            
            # função interna que executa o loop de atualização do cache
            def _cache_update_loop():
                while True:
                    try:
                        self._update_data_cache_internal() # chama a função que atualiza os dados do cache
                    except Exception as e_thread_loop:
                        print(f"Erro crítico na thread de atualização do cache do Controller: {e_thread_loop}")
                    time.sleep(self.update_interval_seconds) # aguarda 5s antes de atualizar novamente
            
            #cria thread como daemon para que ela seja finalizada quando o programa principal for encerrado
            self._update_thread = threading.Thread(target=_cache_update_loop, daemon=True)
            self._update_thread.start()
        else:
            print("Controller: Thread de atualização periódica do cache já está em execução.")

    #---------------------------------------------------------------------------------------------------#

    # função que limpa o cache de dados expirados, removendo entradas antigas
    def _clean_expired_cache(self):

        # obtém o timestamp atual para verificar a validade dos dados no cache
        now = time.time()

        # bloqueia o acesso ao cache para garantir que os dados não sejam acessados simultaneamente
        with self.data_cache_lock:

            # limpa cache de E/S
            self.current_data_cache['process_io'] = {
                pid: data for pid, data in self.current_data_cache['process_io'].items()
                if (now - data['timestamp']) <= self.cache_expiry_seconds
            }

            # limpa cache de diretórios
            self.current_data_cache['directory'] = {
                k: v for k, v in self.current_data_cache['directory'].items()
                if (now - v['timestamp']) <= self.cache_expiry_seconds
            }



    #---------------------------------------------------------------------------------------------------#

    """             PROJETO A - Implementação da Funcionalidade Inicial do Dashboard                  """

    #---------------------------------------------------------------------------------------------------#



    # função que retorna todas as informações dos processos em execução a partir do cache
    def get_all_processes_info_from_cache(self):

        # bloqueia o acesso ao cache para garantir que os dados não sejam acessados simultaneamente
        with self.data_cache_lock:
            return list(self.current_data_cache.get('processes', []))

    #---------------------------------------------------------------------------------------------------#
    
    # função que retorna as informações de uso de memória do sistema a partir do cache
    def get_system_memory_info_from_cache(self):

        # bloqueia o acesso ao cache para garantir que os dados não sejam acessados simultaneamente
        with self.data_cache_lock:
            return dict(self.current_data_cache.get('memory', {}))

    #---------------------------------------------------------------------------------------------------#
    
    # função que retorna as informações de uso de CPU do sistema a partir do cache
    def get_system_cpu_info_from_cache(self):

        # bloqueia o acesso ao cache para garantir que os dados não sejam acessados simultaneamente
        with self.data_cache_lock:
            return dict(self.current_data_cache.get('cpu', {}))
    
    #---------------------------------------------------------------------------------------------------#
    
    # função que busca informações específicas de um processo com base no PID no cache
    def get_specific_process_info_from_cache(self, pid_to_find):

        # bloqueia o acesso ao cache para garantir que os dados não sejam acessados simultaneamente
        with self.data_cache_lock:

            # percorre a lista de processos no cache e retorna os dados do processo com o PID correspondente
            processes_in_cache = self.current_data_cache.get('processes', [])

            # se a lista de processos estiver vazia, retorna None
            for proc_data in processes_in_cache:
                if proc_data.get('pid') == pid_to_find:
                    return dict(proc_data)
            return None
        

    #---------------------------------------------------------------------------------------------------#

    """          PROJETO B - Mostrar dados do uso dos dispositivos de E/S pelos processos             """

    #---------------------------------------------------------------------------------------------------#


    # função para obter informações do sistema de arquivos
    def get_filesystem_info_from_cache(self):

        # bloqueia o acesso ao cache para garantir que os dados não sejam acessados simultaneamente
        with self.data_cache_lock:
            return list(self.current_data_cache.get('filesystem', []))
        
    #---------------------------------------------------------------------------------------------------#

    # função para obter o conteúdo de um diretório específico do cache
    def get_directory_contents(self, path='/'):

        # obtém o timestamp atual para verificar a validade do cache
        now = time.time()

        # cria uma chave de cache única baseada no caminho do diretório
        cache_key = f"dir_{path}"
        
        # verifica se os dados estão em cache e ainda são válidos
        cached_data = self.current_data_cache['directory'].get(cache_key)
        if cached_data and (now - cached_data['timestamp']) <= self.cache_expiry_seconds:
            return cached_data['data']
        
        # se não houver cache válido, busca novos dados
        new_dir_data = model.get_directory_contents(path)
        
        # atualiza o cache com os novos dados e garante acesso exclusivo para evitar condições de corrida
        with self.data_cache_lock:
            self.current_data_cache['directory'][cache_key] = {
                'data': new_dir_data,
                'timestamp': now
            }
        
        return new_dir_data
        
    #---------------------------------------------------------------------------------------------------#

    # função para obter informações de E/S de um processo específico do cache
    def get_process_io_info(self, pid):

        # obtém o timestamp atual para verificar a validade do cache
        now = time.time()
    
        # verifica se os dados estão em cache e ainda são válidos
        cached_data = self.current_data_cache['process_io'].get(pid)
        if cached_data and (now - cached_data['timestamp']) <= self.cache_expiry_seconds:
            return cached_data['data']
        
        # se não houver cache válido, busca novos dados
        io_details = {
            'io_stats': model.get_process_es_info(pid),
            'open_files': model.get_process_open_files(pid),
            'timestamp': now  # armazena o timestamp para controle de validade
        }
        
        # atualiza o cache
        with self.data_cache_lock:  # garante acesso exclusivo ao cache para evitar condições de corrida
            self.current_data_cache['process_io'][pid] = {
                'data': io_details,
                'timestamp': now
            }
        
        return io_details
