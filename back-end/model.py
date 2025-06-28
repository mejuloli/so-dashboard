import os
import time
import datetime # Para formatação de timestamps

"""#####################################################################################################
######################################### PROJETO A ####################################################
#####################################################################################################"""

# --- Variáveis Globais para Cálculo de Uso de CPU Delta ---
previous_overall_cpu_times = None
previous_per_core_cpu_times = {} 
previous_process_cpu_times = {}

# --- Constantes ---
PROCESS_STATUS_MAP = {
    'S': 'Dormindo', 'R': 'Rodando', 'Z': 'Zumbi', 'T': 'Parado', 
    'D': 'Disco Sleep', 'I': 'Inativo', 'X': 'Morto', 'K': 'Wakekill', 
    'P': 'Parked', 't': 'Parado (Tracing)'
}

# --- Função Auxiliar para Obter Nome de Usuário (MODIFICADA) ---
def get_username_from_uid(uid_str_or_int_param):
    """
    Obtém o nome de usuário a partir de um UID (User ID), lendo e parseando
    diretamente o arquivo /etc/passwd do sistema.
    Esta função não utiliza o módulo 'pwd'.

    Parâmetros:
      uid_str_or_int_param (str or int): O User ID. Se for uma string, tentará converter
                                         o primeiro token numérico para int.
    Retorna:
      str: O nome de usuário ou o UID como string em caso de falha.
    """
    uid_to_find = -1
    if isinstance(uid_str_or_int_param, str):
        try:
            uid_to_find = int(uid_str_or_int_param.split()[0])
        except (ValueError, IndexError):
            return str(uid_str_or_int_param) 
    elif isinstance(uid_str_or_int_param, int):
        uid_to_find = uid_str_or_int_param
    else:
        return str(uid_str_or_int_param)

    if uid_to_find < 0:
        return str(uid_to_find)

    try:
        with open("/etc/passwd", "r") as passwd_file:
            for line_content in passwd_file:
                parts = line_content.strip().split(":")
                if len(parts) >= 3 and parts[2].isdigit() and int(parts[2]) == uid_to_find:
                    return parts[0]
    except Exception: # Ignora erros de permissão, arquivo não encontrado, etc.
        pass
    return str(uid_to_find) # Fallback

# --- Outras Funções Auxiliares ---
def get_process_creation_time_iso(pid_param, hertz_param):
    """
    Calcula e formata o tempo de criação de um processo para o formato ISO 8601.
    Parâmetros:
      pid_param (int): O ID do processo (PID).
      hertz_param (int): A frequência do clock do sistema em Hz.
    Retorna:
      str or None: Timestamp ISO 8601 ou None em caso de erro.
    """
    try:
        with open(f"/proc/{pid_param}/stat", 'r') as stat_file:
            parts = stat_file.read().split()
        starttime_jiffies = int(parts[21]) # 22º campo
        with open('/proc/uptime', 'r') as uptime_file:
            system_uptime_seconds = float(uptime_file.readline().split()[0])
        boot_time_unix = time.time() - system_uptime_seconds
        process_create_time_unix = boot_time_unix + (starttime_jiffies / hertz_param)
        return datetime.datetime.fromtimestamp(process_create_time_unix).isoformat()
    except (FileNotFoundError, IndexError, ValueError, OSError, ZeroDivisionError):
        try: # Fallback
            return datetime.datetime.fromtimestamp(os.stat(f"/proc/{pid_param}").st_mtime).isoformat()
        except Exception:
            return None

def get_thread_details(pid_param, tid_str_param):
    """
    Obtém detalhes de uma thread específica (ID da thread, nome e estado).
    Parâmetros:
      pid_param (int): O ID do processo (PID) ao qual a thread pertence.
      tid_str_param (str): O ID da thread (TID) como uma string.
    Retorna:
      dict: Dicionário com "id", "name", "status" da thread.
    """
    tid = int(tid_str_param)
    thread_status_char, thread_name = "N/A", f"Thread {tid}" 
    try:
        with open(f"/proc/{pid_param}/task/{tid}/status", 'r') as status_file:
            for line in status_file:
                if line.startswith("State:"):
                    thread_status_char = line.split(":", 1)[1].strip().split()[0]
                elif line.startswith("Name:"): 
                    thread_name = line.split(":", 1)[1].strip()
        with open(f"/proc/{pid_param}/task/{tid}/comm", 'r') as comm_file:
             thread_name_comm = comm_file.read().strip()
             if thread_name_comm: thread_name = thread_name_comm
    except FileNotFoundError:
        thread_status_char = "Terminada" 
    except Exception:
        pass
    return {"id": tid, "name": thread_name, "status": PROCESS_STATUS_MAP.get(thread_status_char, thread_status_char)}

# --- Função Principal de Coleta de Processos ---
def get_processes():
    """
    Coleta informações detalhadas sobre todos os processos atualmente em execução.
    Retorna:
      list: Lista de dicionários, cada um representando um processo e seus atributos.
    """
    global previous_process_cpu_times 
    processes_list_result, current_process_cpu_snapshot = [], {}
    hertz = os.sysconf(os.sysconf_names['SC_CLK_TCK'])
    if hertz == 0: hertz = 100 # Fallback defensivo

    try:
        active_pids = [p_str for p_str in os.listdir('/proc') if p_str.isdigit()]
    except FileNotFoundError: 
        return []

    for pid_str_current in active_pids:
        pid_int_current = int(pid_str_current)
        try:
            # Inicializa o dicionário de informações do processo
            proc_info = {
                "pid": pid_int_current, "name": "N/A", "user_name": "N/A", "threads": 0, "uid": -1,
                "threads_detailed_info": [], "status": "N/A", "cpu_percent": 0.0,
                "memory_rss_mb": 0.0, "ppid": 0, "nice": 0, "priority": 0,
                "create_time_iso": None, "executable_path": None, "command_line": None,
                "memory_details_kb": { 
                    "vms": 0, "rss": 0, "vm_peak": 0, "code": 0, "data": 0,
                    "stack": 0, "shared": 0, "swap": 0, "page_tables": 0,
                    "vm_lck_kb": 0, "vm_pin_kb": 0, "vm_hwm_kb": 0, 
                    "rss_anon_kb": 0, "rss_file_kb": 0, "rss_shmem_kb": 0
                }
            }

            # Leitura de /proc/[pid]/status (com lógica de parsing robusta)
            with open(f"/proc/{pid_int_current}/status", "r") as f_status_file:
                for line_content_status in f_status_file:
                    line_stripped = line_content_status.strip()
                    if not line_stripped: continue
                    parts_line = line_stripped.split(":", 1)
                    if len(parts_line) != 2: continue
                    key_status = parts_line[0].strip()
                    value_str_status = parts_line[1].strip()
                    value_parts_status = value_str_status.split()
                    current_field_int_value = 0
                    if value_parts_status and value_parts_status[0].isdigit():
                        try: current_field_int_value = int(value_parts_status[0])
                        except ValueError: current_field_int_value = 0
                    
                    if key_status == "Name": proc_info["name"] = value_str_status
                    elif key_status == "State":
                        if value_parts_status: proc_info["status"] = PROCESS_STATUS_MAP.get(value_parts_status[0], value_parts_status[0])
                    elif key_status == "PPid": proc_info["ppid"] = current_field_int_value
                    elif key_status == "Uid":
                        if value_parts_status: 
                            proc_info["user_name"] = get_username_from_uid(value_str_status) 
                            try: proc_info["uid"] = int(value_parts_status[0])
                            except ValueError: proc_info["uid"] = -1
                    elif key_status == "Threads": proc_info["threads"] = current_field_int_value
                    elif key_status == "VmPeak": proc_info["memory_details_kb"]["vm_peak"] = current_field_int_value
                    elif key_status == "VmSize": proc_info["memory_details_kb"]["vms"] = current_field_int_value
                    elif key_status == "VmLck": proc_info["memory_details_kb"]["vm_lck_kb"] = current_field_int_value
                    elif key_status == "VmPin": proc_info["memory_details_kb"]["vm_pin_kb"] = current_field_int_value
                    elif key_status == "VmHWM": proc_info["memory_details_kb"]["vm_hwm_kb"] = current_field_int_value
                    elif key_status == "VmRSS": proc_info["memory_details_kb"]["rss"] = current_field_int_value
                    elif key_status == "RssAnon": proc_info["memory_details_kb"]["rss_anon_kb"] = current_field_int_value
                    elif key_status == "RssFile": proc_info["memory_details_kb"]["rss_file_kb"] = current_field_int_value
                    elif key_status == "RssShmem": proc_info["memory_details_kb"]["rss_shmem_kb"] = current_field_int_value
                    elif key_status == "VmData": proc_info["memory_details_kb"]["data"] = current_field_int_value
                    elif key_status == "VmStk": proc_info["memory_details_kb"]["stack"] = current_field_int_value
                    elif key_status == "VmExe": proc_info["memory_details_kb"]["code"] = current_field_int_value
                    elif key_status == "VmLib": proc_info["memory_details_kb"]["shared"] = current_field_int_value
                    elif key_status == "VmPTE": proc_info["memory_details_kb"]["page_tables"] = current_field_int_value
                    elif key_status == "VmSwap": proc_info["memory_details_kb"]["swap"] = current_field_int_value
            
            # Leitura de cmdline
            try:
                with open(f"/proc/{pid_int_current}/cmdline", 'rb') as cmd_f:
                    cmd_str_bytes = cmd_f.read().replace(b'\x00', b' ').strip()
                    cmd_str_decoded = cmd_str_bytes.decode('utf-8', 'replace')
                    proc_info["command_line"] = cmd_str_decoded or f"[{proc_info.get('name', 'unknown')}]"
            except Exception: 
                proc_info["command_line"] = f"[{proc_info.get('name', 'unknown')}]"
            
            # Leitura de executable_path
            try:
                proc_info["executable_path"] = os.readlink(f"/proc/{pid_int_current}/exe")
            except (FileNotFoundError, PermissionError, OSError): 
                proc_info["executable_path"] = None
            
            # Leitura de memory_rss_mb de statm
            try:
                with open(f"/proc/{pid_int_current}/statm", 'r') as statm_f:
                    rss_pages = int(statm_f.read().split()[1]) 
                    page_size_bytes = os.sysconf('SC_PAGE_SIZE') 
                    proc_info["memory_rss_mb"] = round(rss_pages * (page_size_bytes / (1024**2)), 1)
            except (FileNotFoundError, IndexError, ValueError, OSError):
                if proc_info["memory_details_kb"].get("rss", 0) > 0 and proc_info["memory_rss_mb"] == 0.0:
                    proc_info["memory_rss_mb"] = round(proc_info["memory_details_kb"]["rss"] / 1024, 1)
            
            # Leitura de /proc/[pid]/stat
            with open(f"/proc/{pid_int_current}/stat", 'r') as stat_f_p:
                stat_parts_list = stat_f_p.read().split()
                if len(stat_parts_list) > 21: 
                    utime_jiffies, stime_jiffies = int(stat_parts_list[13]), int(stat_parts_list[14])
                    proc_info["priority"], proc_info["nice"] = int(stat_parts_list[17]), int(stat_parts_list[18])
                    current_total_jiffies_proc = utime_jiffies + stime_jiffies
                    current_timestamp_sec = time.time()
                    current_process_cpu_snapshot[pid_int_current] = {
                        'active_jiffies': current_total_jiffies_proc, 
                        'timestamp': current_timestamp_sec
                    }
                    if pid_int_current in previous_process_cpu_times:
                        prev_snapshot_proc = previous_process_cpu_times[pid_int_current]
                        delta_time_seconds = current_timestamp_sec - prev_snapshot_proc['timestamp']
                        delta_jiffies_proc = current_total_jiffies_proc - prev_snapshot_proc['active_jiffies']
                        if delta_time_seconds > 0: 
                            cpu_usage_raw = (delta_jiffies_proc / hertz) / delta_time_seconds * 100.0
                            num_system_cores = os.cpu_count() or 1
                            proc_info["cpu_percent"] = round(max(0.0, min(cpu_usage_raw, 100.0 * num_system_cores)), 1)
                    proc_info["create_time_iso"] = get_process_creation_time_iso(pid_int_current, hertz)
                else: 
                    proc_info["create_time_iso"] = None
            
            # Coleta de threads
            task_dir_path_proc = f"/proc/{pid_int_current}/task"
            if os.path.isdir(task_dir_path_proc):
                for tid_str_val in os.listdir(task_dir_path_proc):
                    if tid_str_val.isdigit():
                        proc_info["threads_detailed_info"].append(get_thread_details(pid_int_current, tid_str_val))
            processes_list_result.append(proc_info)
        except (FileNotFoundError, IndexError, ValueError, OSError, PermissionError) as e_process_loop:
            # print(f"Aviso: Erro ao processar PID {pid_int_current}: {e_process_loop}") # Debug
            continue 
    previous_process_cpu_times = current_process_cpu_snapshot
    return processes_list_result

# --- Funções de Coleta de Dados do Sistema (Memória e CPU) ---
def get_memory_usage():
    """
    Coleta informações sobre o uso de memória RAM e SWAP do sistema.
    Lê dados de /proc/meminfo.
    Retorna:
      dict: Dicionário com sub-dicionários "ram" e "swap" e seus detalhes.
    """
    mem_raw_data, swap_raw_data = {}, {}
    default_ram_data = {"total_gb": 0.0, "used_gb": 0.0, "free_gb": 0.0, "usage_percent": 0.0, "free_percent": 100.0}
    default_swap_data = {"total_gb": 0.0, "used_gb": 0.0, "free_gb": 0.0, "usage_percent": 0.0, "free_percent": 0.0}
    try:
        with open('/proc/meminfo', 'r') as f_meminfo_sys:
            for line_meminfo_sys in f_meminfo_sys:
                parts_meminfo_sys = line_meminfo_sys.split(":")
                if len(parts_meminfo_sys) == 2:
                    key_meminfo_sys = parts_meminfo_sys[0].strip()
                    val_str_meminfo_sys = parts_meminfo_sys[1].strip().split()[0] if parts_meminfo_sys[1].strip() else "0"
                    val_kb_sys = int(val_str_meminfo_sys)
                    if key_meminfo_sys in ["MemTotal", "MemFree", "MemAvailable", "Buffers", "Cached", "SReclaimable"]:
                        mem_raw_data[key_meminfo_sys] = val_kb_sys
                    elif key_meminfo_sys in ["SwapTotal", "SwapFree"]:
                        swap_raw_data[key_meminfo_sys] = val_kb_sys
        
        ram_total_kb_sys = mem_raw_data.get("MemTotal", 0)
        ram_available_kb_sys = mem_raw_data.get("MemAvailable",
                                          mem_raw_data.get("MemFree", 0) + \
                                          mem_raw_data.get("Buffers", 0) + \
                                          mem_raw_data.get("Cached", 0) - \
                                          mem_raw_data.get("SReclaimable", 0))
        if ram_available_kb_sys < 0 : ram_available_kb_sys = mem_raw_data.get("MemFree", 0)
        ram_used_kb_sys = ram_total_kb_sys - ram_available_kb_sys
        ram_percent_usage = (ram_used_kb_sys / ram_total_kb_sys * 100) if ram_total_kb_sys > 0 else 0.0
        ram_percent_free = 100.0 - ram_percent_usage if ram_total_kb_sys > 0 else \
                           (100.0 if ram_total_kb_sys == 0 and ram_available_kb_sys == 0 else 0.0)

        swap_total_kb_sys = swap_raw_data.get("SwapTotal", 0)
        swap_free_kb_sys = swap_raw_data.get("SwapFree", 0)
        swap_used_kb_sys = swap_total_kb_sys - swap_free_kb_sys
        swap_percent_usage = (swap_used_kb_sys / swap_total_kb_sys * 100) if swap_total_kb_sys > 0 else 0.0
        swap_percent_free = 100.0 - swap_percent_usage if swap_total_kb_sys > 0 else 0.0
        
        ram_data_to_return = {
            "total_gb": round(ram_total_kb_sys / (1024**2), 2), 
            "used_gb": round(ram_used_kb_sys / (1024**2), 2),
            "free_gb": round(ram_available_kb_sys / (1024**2), 2), 
            "usage_percent": round(ram_percent_usage, 1),
            "free_percent": round(ram_percent_free, 1)}
        swap_data_to_return = {
            "total_gb": round(swap_total_kb_sys / (1024**2), 2), 
            "used_gb": round(swap_used_kb_sys / (1024**2), 2),
            "free_gb": round(swap_free_kb_sys / (1024**2), 2), 
            "usage_percent": round(swap_percent_usage, 1),
            "free_percent": round(swap_percent_free, 1)}
        return {"ram": ram_data_to_return, "swap": swap_data_to_return}
    except Exception as e_mem_sys:
        print(f"Erro ao ler informações de memória do sistema: {e_mem_sys}")
        return {"ram": default_ram_data, "swap": default_swap_data}

def get_cpu_usage():
    """
    Coleta informações sobre o uso geral da CPU e de cada core do sistema.
    Calcula o uso % com base na diferença (delta) de jiffies desde a última chamada.
    Retorna:
      dict: Dicionário com "overall_usage_percent", "overall_idle_percent", 
            "number_of_cores", e lista "cores" com detalhes de cada core.
    """
    global previous_overall_cpu_times, previous_per_core_cpu_times
    cpu_stats_return = {"overall_usage_percent": 0.0, "overall_idle_percent": 100.0, 
                        "number_of_cores": 0, "cores": []}
    current_core_times_snapshot_sys = {}
    try:
        with open("/proc/stat", "r") as f_stat_cpu_sys:
            lines_stat_cpu_sys = f_stat_cpu_sys.readlines()
        
        parts_overall_sys = list(map(int, lines_stat_cpu_sys[0].strip().split()[1:]))
        idle_all_jiffies_sys = parts_overall_sys[3] + (parts_overall_sys[4] if len(parts_overall_sys) > 4 else 0)
        total_all_jiffies_sys = sum(parts_overall_sys)
        
        if previous_overall_cpu_times:
            delta_total_jiffies_sys = total_all_jiffies_sys - previous_overall_cpu_times['total']
            delta_idle_jiffies_sys = idle_all_jiffies_sys - previous_overall_cpu_times['idle']
            if delta_total_jiffies_sys > 0:
                cpu_stats_return["overall_usage_percent"] = round((1.0 - delta_idle_jiffies_sys / delta_total_jiffies_sys) * 100.0, 1)
                cpu_stats_return["overall_idle_percent"] = round((delta_idle_jiffies_sys / delta_total_jiffies_sys) * 100.0, 1)
        previous_overall_cpu_times = {'total': total_all_jiffies_sys, 'idle': idle_all_jiffies_sys}
        cpu_stats_return["overall_usage_percent"] = max(0.0, min(cpu_stats_return["overall_usage_percent"], 100.0))
        cpu_stats_return["overall_idle_percent"] = max(0.0, min(cpu_stats_return["overall_idle_percent"], 100.0))

        core_stat_lines_sys = [ln_core for ln_core in lines_stat_cpu_sys if ln_core.startswith("cpu") and ln_core[3].isdigit()]
        cpu_stats_return["number_of_cores"] = len(core_stat_lines_sys)
        for i_core_sys, line_core_stat_sys in enumerate(core_stat_lines_sys):
            core_id_str_val_sys = f"cpu{i_core_sys}"
            parts_core_stat_sys = list(map(int, line_core_stat_sys.strip().split()[1:]))
            idle_core_jiffies_sys = parts_core_stat_sys[3] + (parts_core_stat_sys[4] if len(parts_core_stat_sys) > 4 else 0)
            total_core_jiffies_sys = sum(parts_core_stat_sys)
            current_core_times_snapshot_sys[core_id_str_val_sys] = {'total': total_core_jiffies_sys, 'idle': idle_core_jiffies_sys}
            usage_core_pc_val_sys = 0.0
            if core_id_str_val_sys in previous_per_core_cpu_times:
                prev_core_times_sys = previous_per_core_cpu_times[core_id_str_val_sys]
                delta_total_core_jiffies_sys = total_core_jiffies_sys - prev_core_times_sys['total']
                delta_idle_core_jiffies_sys = idle_core_jiffies_sys - prev_core_times_sys['idle']
                if delta_total_core_jiffies_sys > 0:
                    usage_core_pc_val_sys = (1.0 - delta_idle_core_jiffies_sys / delta_total_core_jiffies_sys) * 100.0
            cpu_stats_return["cores"].append({
                "id": i_core_sys, 
                "name": f"Core {i_core_sys}", 
                "usage_percent": round(max(0.0, min(usage_core_pc_val_sys, 100.0)), 1)
            })
        previous_per_core_cpu_times = current_core_times_snapshot_sys
        return cpu_stats_return
    except Exception as e_cpu_sys:
        print(f"Erro ao ler informações de CPU do sistema: {e_cpu_sys}")
        num_cores_fallback_sys = os.cpu_count() or 1
        return {
            "overall_usage_percent": 0.0, "overall_idle_percent": 100.0, 
            "number_of_cores": num_cores_fallback_sys,
            "cores": [{"id": i_fb_sys, "name": f"Core {i_fb_sys}", "usage_percent": 0.0} for i_fb_sys in range(num_cores_fallback_sys)]
        }
    
"""#####################################################################################################
######################################### PROJETO B ####################################################
#####################################################################################################"""


# Função para obter informações do sistema de arquivos
def get_filesystem_info():

    # cria uma lista vazia para armazenar as informações de cada ponto de montagem válido
    mounts = []

    # tenta abrir o arquivo '/proc/mounts', que contém informações sobre todos os sistemas de arquivos montados
    try:
        with open('/proc/mounts', 'r') as f:
            for line in f: # lê o arq linha por linha

                # divide a linha em partes, esperando pelo menos 4 colunas
                parts = line.split()

                # se a linha não tiver pelo menos 4 partes, ignora
                if len(parts) < 4:
                    continue

                # extrai as informações principais: dispositivo, ponto de montagem e tipo de sistema de arquivos
                device, mountpoint, fstype = parts[0], parts[1], parts[2]
                
                # ignora sistemas de arquivos virtuais e que não são relevantes para o monitoramento de uso
                if fstype in ('proc', 'sysfs', 'devpts', 'tmpfs', 'cgroup'):
                    continue
                    
                try:
                    stat = os.statvfs(mountpoint) # obtém espaço em disco do ponto de montagem atual
                    total = stat.f_blocks * stat.f_frsize # total de espaço em bytes
                    free = stat.f_bfree * stat.f_frsize # espaço livre em bytes
                    used = total - free # espaço usado em bytes
                    
                    # adiciona as informações coletadas a um dicionário e o adiciona à lista de montagens
                    mounts.append({
                        "device": device,
                        "mountpoint": mountpoint,
                        "type": fstype,
                        "total_gb": round(total / (1024**3), 2), # em GB
                        "used_gb": round(used / (1024**3), 2),
                        "free_gb": round(free / (1024**3), 2),
                        "usage_percent": round(used / total * 100, 2) if total > 0 else 0
                    })

                # ignora erros de permissão ou outros problemas ao acessar o ponto de montagem
                except Exception:
                    continue

    # exibe mensagem de erro se não for possível ler o arquivo '/proc/mounts'
    except Exception as e:
        print(f"Erro ao ler informações do sistema de arquivos: {e}")

    # retorna a lista de sistemas de arquivos com as métricas coletadas
    return mounts

#--------------------------------------------------------------------------------------------------------------------------

# função para obter o conteúdo de um diretório
def get_directory_contents(path='/'):

    contents = [] # lista para armazenar os detalhes dos arquivos e subdiretórios

    try:
        # verifica se o caminho é absoluto; se não for, converte para absoluto
        if not os.path.isabs(path):
            path = os.path.abspath(path)
            
        # percorre todos os arquivos e diretórios dentro do caminho especificado
        for entry in os.listdir(path):

            # cria o caminho completo do arquivo ou diretório
            full_path = os.path.join(path, entry)

            try:
                # obtém informações detalhadas sobre o item usando stat
                stat = os.stat(full_path)

                # adiciona as informações do item à lista 'contents', como um dicionário
                contents.append({
                    "name": entry, # nome do arquivo ou diretório
                    "path": full_path, # caminho completo
                    "is_dir": os.path.isdir(full_path), # booleano, verifica se é um diretório
                    "size_bytes": stat.st_size, # tamanho em bytes
                    "size_human": _bytes_to_human(stat.st_size), # chama função auxiliar para converter bytes em formato legível
                    "modified_time": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(), # data de modificação em formato ISO 8601
                    "permissions": oct(stat.st_mode & 0o777), # permissões do item extraídas com máscara de bits
                    "owner": get_username_from_uid(stat.st_uid), # nomo do usuário proprietário obtido a partir do UID
                    "group": get_username_from_uid(stat.st_gid)  # nome do grupo proprietário obtido a partir do GID
                })

            except Exception:
                continue

    # exibe mensagem se houver erro ao acessar o diretório (ex: permissão negada)
    except Exception as e:
        print(f"Erro ao listar diretório {path}: {e}")
    
    # retorna um dicionário com o caminho e a lista de conteúdos
    return {"path": path, "contents": contents}

#--------------------------------------------------------------------------------------------------------------------------

# função auxiliar para converter bytes em formato legível (B, KB, MB, GB, etc.)
def _bytes_to_human(size):

    for unit in ['B', 'KB', 'MB', 'GB']:
        # se o tamanho for menor que 1024, retorna o valor atual com uma casa decimal e a unidade correspondente
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        
        # caso contrário, divide o tamanho por 1024 para converter para a próxima unidade
        size /= 1024.0

    # se o tamanho for maior ou igual a 1024, converte para TB e retorna com uma casa decimal
    return f"{size:.1f} TB"

#--------------------------------------------------------------------------------------------------------------------------

# função para obter informações de E/S de um processo
def get_process_es_info(pid):
   
   # inicializa um dicionário vazio para armazenar as estatísticas de E/S
    es_stats = {}

    # tenta abrir o arquivo '/proc/[pid]/io', que contém estatísticas de entrada/saída do processo com o PID fornecido
    try:
        with open(f'/proc/{pid}/io', 'r') as f:
            for line in f:

                # divide a linha em chave e valor usando o primeiro ':' como delimitador
                key, value = line.split(':', 1)

                # remove espaços em branco e converte a chave para minúsculas
                key = key.strip().lower()

                # verifica se a chave é uma das estatísticas de E/S relevantes
                if key in ['rchar', 'wchar', 'read_bytes', 'write_bytes',
                          'syscr', 'syscw', 'cancelled_write_bytes']:
                    try:
                        # tenta converter o valor para inteiro e adiciona ao dicionário de estatísticas
                        es_stats[key] = int(value.strip())
                    except ValueError:
                        continue

    # exibe mensagem de erro se o processo não for encontrado, se PID for inválido ou se houver problemas de permissão
    except FileNotFoundError:
        print(f"Processo {pid} não encontrado ou terminou")
    except PermissionError:
        print(f"Permissão negada para acessar estatísticas do processo {pid}")
    except Exception as e:
        print(f"Erro ao ler E/S do processo {pid}: {str(e)}")
    
    # retorna o dicionário com as estatísticas de E/S coletadas
    return es_stats

#--------------------------------------------------------------------------------------------------------------------------

# função para obter os arquivos abertos por um processo
def get_process_open_files(pid):

    open_files = [] # lista para armazenar os arquivos abertos pelo processo

    try:
        # define o caminho para o diretório que contém os descritores de arquivos do processo
        fd_dir = f'/proc/{pid}/fd'

        # lista todos os descritores de arquivos (FDs) presentes nesse diretório
        for fd in os.listdir(fd_dir):
            try:
                fd_path = os.path.join(fd_dir, fd) # cria o caminho completo do descritor de arquivo
                target = os.readlink(fd_path) # lê o link simbólico do descritor que aponta para o arquivo real ou recurso

                # adiciona um dicionário com detalhes do arquivo aberto à lista 'open_files'
                open_files.append({
                    "fd": fd, # número do descritor de arquivo
                    "path": target, # caminho do arquivo ou recurso apontado pelo descritor
                    "type": _get_file_type(fd_path) # chama função auxiliar para determinar o tipo de arquivo
                })

            except Exception:
                continue

    except Exception:
        pass
    
    # retorna a lista de arquivos abertos pelo processo
    return open_files

#--------------------------------------------------------------------------------------------------------------------------

# função auxiliar para determinar o tipo de arquivo a partir do caminho do descritor
def _get_file_type(fd_path):

    try:
        # obtém as informações do arquivo usando os.stat
        mode = os.stat(fd_path).st_mode

        if os.path.isdir(fd_path): # verifica se é um diretório
            return "directory"
        elif os.path.isfile(fd_path): # verifica se é um arquivo regular
            return "file"
        elif os.path.islink(fd_path): # verifica se é um link simbólico
            return "symlink"
        elif os.path.ismount(fd_path): # verifica se é um ponto de montagem
            return "mount"
        else: # se não for nenhum dos tipos acima, retorna "special" para outros tipos especiais
            return "special"
        
    # se ocorrer algum erro (ex: permissão negada ou arquivo não existe), retorna "unknown"
    except Exception:
        return "unknown"
