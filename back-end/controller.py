import time
import model
import threading


# classe que gerencia a coleta e o cache de dados do sistema
class Controller:
    def __init__(self):
        # intervalo de atualização do cache
        self.update_interval_seconds = 5

        # trava para acesso seguro entre threads
        self.data_cache_lock = threading.Lock()

        # cache atual de dados do sistema
        self.current_data_cache = {
            "processes": [],
            "memory": {"ram": {}, "swap": {}},
            "cpu": {
                "overall_usage_percent": 0.0,
                "overall_idle_percent": 100.0,
                "number_of_cores": 0,
                "cores": [],
                "total_processes": 0,
                "total_threads": 0,
            },
            "filesystem": [],
            "directory": {},
            "process_io": {},
        }

        # thread de atualização
        self._update_thread = None

        # tempo de validade do cache (em segundos)
        self.cache_expiry_seconds = 5

    # atualiza os dados do cache
    def _update_data_cache_internal(self):
        processes_list_data = model.get_processes()
        memory_system_data = model.get_memory_usage()
        cpu_model_raw_data = model.get_cpu_usage()
        filesystem_list_data = model.get_filesystem_info()

        self._clean_expired_cache()
        with self.data_cache_lock:
            self.current_data_cache["processes"] = processes_list_data
            self.current_data_cache["memory"] = memory_system_data
            self.current_data_cache["cpu"] = {
                **cpu_model_raw_data,
                "total_processes": len(processes_list_data),
                "total_threads": sum(
                    int(p.get("threads", 0)) for p in processes_list_data
                ),
            }
            self.current_data_cache["filesystem"] = filesystem_list_data

    # inicia a thread de atualização periódica
    def start_periodic_cache_update_thread(self):
        if self._update_thread is None or not self._update_thread.is_alive():
            print("controller: iniciando thread de atualização do cache.")

            def _cache_update_loop():
                while True:
                    try:
                        self._update_data_cache_internal()
                    except Exception as e_thread_loop:
                        print(f"erro na thread do cache: {e_thread_loop}")
                    time.sleep(self.update_interval_seconds)

            self._update_thread = threading.Thread(
                target=_cache_update_loop, daemon=True
            )
            self._update_thread.start()
        else:
            print("controller: thread de atualização já em execução.")

    # remove dados expirados do cache
    def _clean_expired_cache(self):
        now = time.time()
        with self.data_cache_lock:
            self.current_data_cache["process_io"] = {
                pid: data
                for pid, data in self.current_data_cache["process_io"].items()
                if (now - data["timestamp"]) <= self.cache_expiry_seconds
            }
            self.current_data_cache["directory"] = {
                k: v
                for k, v in self.current_data_cache["directory"].items()
                if (now - v["timestamp"]) <= self.cache_expiry_seconds
            }

    # retorna todos os processos do cache
    def get_all_processes_info_from_cache(self):
        with self.data_cache_lock:
            return list(self.current_data_cache.get("processes", []))

    # retorna informações de memória do cache
    def get_system_memory_info_from_cache(self):
        with self.data_cache_lock:
            return dict(self.current_data_cache.get("memory", {}))

    # retorna informações de cpu do cache
    def get_system_cpu_info_from_cache(self):
        with self.data_cache_lock:
            return dict(self.current_data_cache.get("cpu", {}))

    # retorna dados de um processo específico pelo pid
    def get_specific_process_info_from_cache(self, pid_to_find):
        with self.data_cache_lock:
            for proc_data in self.current_data_cache.get("processes", []):
                if proc_data.get("pid") == pid_to_find:
                    return dict(proc_data)
            return None

    # retorna informações do sistema de arquivos
    def get_filesystem_info_from_cache(self):
        with self.data_cache_lock:
            return list(self.current_data_cache.get("filesystem", []))

    # retorna o conteúdo de um diretório
    def get_directory_contents(self, path="/"):
        now = time.time()
        cache_key = f"dir_{path}"
        cached_data = self.current_data_cache["directory"].get(cache_key)

        if (
            cached_data
            and (now - cached_data["timestamp"]) <= self.cache_expiry_seconds
        ):
            return cached_data["data"]

        new_dir_data = model.get_directory_contents(path)
        with self.data_cache_lock:
            self.current_data_cache["directory"][cache_key] = {
                "data": new_dir_data,
                "timestamp": now,
            }
        return new_dir_data

    # retorna informações de e/s de um processo
    def get_process_io_info(self, pid):
        now = time.time()
        cached_data = self.current_data_cache["process_io"].get(pid)

        if (
            cached_data
            and (now - cached_data["timestamp"]) <= self.cache_expiry_seconds
        ):
            return cached_data["data"]

        io_details = {
            "io_stats": model.get_process_es_info(pid),
            "open_files": model.get_process_open_files(pid),
            "timestamp": now,
        }

        with self.data_cache_lock:
            self.current_data_cache["process_io"][pid] = {
                "data": io_details,
                "timestamp": now,
            }

        return io_details
