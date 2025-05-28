import time
import model
import threading

class Controller:
    def __init__(self):
        self.interval = 5 
        self.data_lock = threading.Lock()
        self.current_data_cache = {
            'processes': [],
            'memory': {},
            'cpu': {}
        }
        # self.start_periodic_update_cache() # Descomente para usar o cache

    def _update_data_cache(self):
        with self.data_lock:
            print(f"[{time.strftime('%H:%M:%S')}] Atualizando cache de dados do backend...")
            processes_list = model.get_processes() # Model agora retorna todos os detalhes
            self.current_data_cache = {
                'processes': processes_list,
                'memory': model.get_memory_usage(),
                'cpu': {
                    **model.get_cpu_usage(),
                    'total_processes': len(processes_list),
                    'total_threads': sum(int(p.get('threads', 0)) for p in processes_list) # Garante que threads seja int
                }
            }
            print(f"[{time.strftime('%H:%M:%S')}] Cache atualizado.")

    def start_periodic_update_cache(self):
        def update_loop():
            while True:
                self._update_data_cache()
                time.sleep(self.interval)
        update_thread = threading.Thread(target=update_loop, daemon=True)
        update_thread.start()

    def get_all_processes_info(self):
        return model.get_processes() # Model já retorna todos os detalhes
    
    def get_system_memory_info(self):
        return model.get_memory_usage()
    
    def get_system_cpu_info(self):
        # Se quiser que total_processes e total_threads venham de /api/cpu
        # e você NÃO estiver usando o cache ativamente, você teria que buscá-los aqui:
        cpu_model_data = model.get_cpu_usage()
        # processes_for_stats = model.get_processes() # CUIDADO: Chamada extra e cara
        # cpu_model_data['total_processes'] = len(processes_for_stats)
        # cpu_model_data['total_threads'] = sum(int(p.get('threads', 0)) for p in processes_for_stats)
        return cpu_model_data