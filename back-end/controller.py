import time
import model
import view
import threading

class Controller:

    def __init__(self):
        self.interval = 5 # definição do intervalo de atualização em segundos
        self.data_lock = threading.Lock() # bloqueio para garantir que apenas uma thread acesse os dados por vez        
        
        # inicializa o dicionário para armazenar os dados atuais
        self.current_data = {
            'processes': [],
            'memory': {},
            'cpu': {}
        }

    # método que atualiza os dados e armazena em cache
    def update_data(self):
        with self.data_lock: # bloqueia o acesso aos dados enquanto atualiza
            self.current_data = {
                'processes': model.get_processes(),
                'memory': model.get_memory_usage(),
                'cpu': model.get_cpu_usage()
            }

    # método para iniciar a thread de atualização periódica
    def start_periodic_update(self):

        # cria uma thread para atualizar os dados a cada 5s
        def update_loop():
            while True:
                self.update_data()
                time.sleep(self.interval) # aguarda o intervalo para a próxima atualização

        # cria e inicia a thread de atualização
        update_thread = threading.Thread(target=update_loop, daemon=True)
        update_thread.start()

    def get_processes(self, limit=None):
        # Obtém a lista de processos do sistema
        processes = model.get_processes()
        # Limita a lista de processos ao número especificado ou retorna todos se o limite for 0
        return processes[:limit] if limit > 0 else processes

    def get_specific_process(self, pid):
        # Obtém informações de um processo específico pelo PID
        return model.get_specific_process_by_pid(pid)
    
    def get_memory_usage(self):
        # Obtém o uso de memória do sistema
        return model.get_memory_usage()
    
    def get_cpu_usage(self):
        # Obtém o uso de CPU do sistema
        return model.get_cpu_usage()
