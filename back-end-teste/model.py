import os
import pwd
import time
import datetime # Para formatar o tempo de criação do processo

# Globais para cálculo de CPU (geral, por core, por processo)
previous_overall_cpu_times = None
previous_per_core_cpu_times = {} 
previous_process_cpu_times = {} # Dicionário: {pid: {total_jiffies, timestamp}}

def get_username_from_uid(uid_str_list):
    # Uid no /proc/[pid]/status pode ter múltiplos valores (Real, Effective, Saved, Filesystem)
    # Vamos pegar o primeiro (Real UID)
    try:
        uid = int(uid_str_list.split()[0])
        return pwd.getpwuid(uid).pw_name
    except (ValueError, KeyError, IndexError):
        return uid_str_list # Retorna o UID se não conseguir encontrar o nome ou se o formato for inesperado

def get_process_creation_time_iso(pid, hertz):
    try:
        with open(f"/proc/{pid}/stat", 'r') as stat_file:
            parts = stat_file.read().split()
            # O 22º valor (índice 21) é starttime (jiffies desde o boot do kernel)
            starttime_jiffies = int(parts[21])
            process_age_seconds = starttime_jiffies / hertz
            
            # Tempo de boot do sistema (em segundos desde a Epoch)
            # Isso é uma aproximação. /proc/stat btime é melhor se disponível.
            # Ou podemos usar time.time() - system_uptime_from_/proc/uptime
            with open('/proc/uptime', 'r') as uptime_file:
                system_uptime_seconds = float(uptime_file.readline().split()[0])
            
            boot_time_unix = time.time() - system_uptime_seconds
            process_create_time_unix = boot_time_unix + process_age_seconds # Erro aqui, uptime do processo já é relativo ao boot.
                                                                            # starttime_jiffies / hertz é o tempo em segundos após o boot do sistema.
            process_create_time_unix_corrected = boot_time_unix + (starttime_jiffies / hertz)


            return datetime.datetime.fromtimestamp(process_create_time_unix_corrected).isoformat()
    except Exception:
        # Se não conseguir ler /proc/uptime ou outros, pode retornar None ou uma data de fallback
        try:
            # Fallback para o tempo de modificação do diretório do processo
            # Não é o tempo de criação, mas é uma aproximação.
            stat_info = os.stat(f"/proc/{pid}")
            return datetime.datetime.fromtimestamp(stat_info.st_mtime).isoformat()
        except Exception:
            return None


def get_processes():
    global previous_process_cpu_times
    processes_list = []
    current_process_cpu_times_snapshot = {} # Para este ciclo de leitura
    hertz = os.sysconf(os.sysconf_names['SC_CLK_TCK']) # Tiques de clock por segundo

    active_pids = [pid_str for pid_str in os.listdir('/proc') if pid_str.isdigit()]

    for pid_str in active_pids:
        pid = int(pid_str)
        try:
            process_name, uid_info, threads_str, status_char = "N/A", "N/A", "0", "N/A"
            ppid_str, nice_str, priority_str = "N/A", "0", "0"
            executable_path, command_line = None, None

            # Lendo /proc/[pid]/status
            with open(f"/proc/{pid}/status", 'r') as status_file:
                for line in status_file:
                    if line.startswith("Name:"): process_name = line.split(":", 1)[1].strip()
                    elif line.startswith("Uid:"): uid_info = line.split(":", 1)[1].strip() # Contém múltiplos UIDs
                    elif line.startswith("Threads:"): threads_str = line.split(":", 1)[1].strip()
                    elif line.startswith("State:"): status_char = line.split(":", 1)[1].strip().split()[0] # Pega apenas o caractere do estado
                    elif line.startswith("PPid:"): ppid_str = line.split(":", 1)[1].strip()
            
            # Lendo /proc/[pid]/cmdline
            try:
                with open(f"/proc/{pid}/cmdline", 'rb') as cmd_file: # Abrir em modo binário
                    # Argumentos são separados por NUL, substituir por espaço
                    command_line = cmd_file.read().replace(b'\x00', b' ').decode('utf-8', 'replace').strip()
                    if not command_line: # Se estiver vazio, usar o nome do processo entre colchetes
                        command_line = f"[{process_name}]"
            except Exception:
                command_line = f"[{process_name}]" if process_name != "N/A" else None

            # Lendo /proc/[pid]/exe
            try:
                executable_path = os.readlink(f"/proc/{pid}/exe")
            except Exception: # Pode dar erro de permissão ou se o processo for um thread do kernel
                executable_path = None
            
            # Lendo /proc/[pid]/statm para RSS
            rss_kb = 0
            try:
                with open(f"/proc/{pid}/statm", 'r') as statm_file:
                    parts_statm = statm_file.read().split()
                    if len(parts_statm) >= 2: # O segundo valor é 'resident' (RSS) em páginas
                        rss_kb = int(parts_statm[1]) * (os.sysconf('SC_PAGE_SIZE') / 1024)
            except FileNotFoundError: continue # Processo terminou entre listdir e open

            # Lendo /proc/[pid]/stat para CPU, prioridade, nice
            cpu_percent_process = 0.0
            create_time_value = None
            try:
                with open(f"/proc/{pid}/stat", 'r') as stat_file:
                    parts_stat = stat_file.read().split()
                    # (14) utime, (15) stime (em jiffies)
                    utime = int(parts_stat[13])
                    stime = int(parts_stat[14])
                    # (18) priority, (19) nice
                    priority_str = parts_stat[17] 
                    nice_str = parts_stat[18]
                    # (22) starttime (jiffies since boot) - usado em get_process_creation_time_iso
                    
                    current_process_active_jiffies = utime + stime
                    current_timestamp = time.time() # Timestamp atual em segundos
                    
                    current_process_cpu_times_snapshot[pid] = {
                        'active_jiffies': current_process_active_jiffies,
                        'timestamp': current_timestamp
                    }

                    if pid in previous_process_cpu_times:
                        prev_data = previous_process_cpu_times[pid]
                        time_delta_seconds = current_timestamp - prev_data['timestamp']
                        cpu_jiffies_delta_process = current_process_active_jiffies - prev_data['active_jiffies']
                        
                        if time_delta_seconds > 0:
                            # CPU % para este processo = (jiffies_usados_pelo_processo_no_intervalo / total_jiffies_do_sistema_no_intervalo) * num_cpus * 100
                            # Ou, mais simples: (jiffies_usados_pelo_processo_no_intervalo / hertz) / segundos_no_intervalo * 100
                            cpu_percent_process = (cpu_jiffies_delta_process / hertz) / time_delta_seconds * 100.0
                            # Limitar ao número de CPUs * 100% (ex: 400% para 4 CPUs) e não ser negativo
                            cpu_percent_process = max(0.0, min(cpu_percent_process, 100.0 * (os.cpu_count() or 1) ))
                
                create_time_value = get_process_creation_time_iso(pid, hertz)
            except FileNotFoundError: continue # Processo terminou

            status_map = {'S': 'Dormindo', 'R': 'Rodando', 'Z': 'Zumbi', 'T': 'Parado', 'D': 'Disco Sleep', 'I': 'Inativo (Idle)', 'X': 'Morto', 'K': 'Wakekill', 'P': 'Parked'}
            
            processes_list.append({
                "pid": pid, 
                "name": process_name, 
                "user_name": get_username_from_uid(uid_info), # Passa toda a string de UIDs
                "threads": int(threads_str), 
                "status": status_map.get(status_char, status_char),
                "cpu_percent": round(cpu_percent_process, 1), 
                "memory_rss_mb": round(rss_kb / 1024, 1),
                "ppid": int(ppid_str) if ppid_str.isdigit() else 0,
                "nice": int(nice_str), # nice pode ser negativo
                "priority": int(priority_str),
                "create_time_iso": create_time_value,
                "executable_path": executable_path,
                "command_line": command_line
            })
        except Exception as e:
            # print(f"Erro geral ao processar PID {pid_str}: {e}") # Descomente para depuração
            continue 
    
    previous_process_cpu_times = current_process_cpu_times_snapshot # Atualiza para o próximo cálculo
    return processes_list

# Funções get_memory_usage() e get_cpu_usage() permanecem as mesmas da última versão completa que forneci
# (com cálculo de delta para CPU geral e por core, e RAM/Swap para memória)
def get_memory_usage():
    memory_info, swap_info = {}, {}
    try:
        with open('/proc/meminfo', 'r') as file:
            for line in file:
                parts = line.split(":")
                key = parts[0].strip()
                if len(parts) > 1:
                    value = int(parts[1].strip().split()[0]) 
                    if key in ["MemTotal", "MemFree", "MemAvailable", "Buffers", "Cached"]: memory_info[key] = value
                    elif key in ["SwapTotal", "SwapFree"]: swap_info[key] = value
        
        total_ram_kb = memory_info.get("MemTotal", 0)
        available_ram_kb = memory_info.get("MemAvailable", memory_info.get("MemFree", 0)) 
        used_ram_kb = total_ram_kb - available_ram_kb
        ram_usage_percent = (used_ram_kb / total_ram_kb * 100) if total_ram_kb > 0 else 0

        total_swap_kb = swap_info.get("SwapTotal", 0)
        free_swap_kb = swap_info.get("SwapFree", 0)
        used_swap_kb = total_swap_kb - free_swap_kb
        swap_usage_percent = (used_swap_kb / total_swap_kb * 100) if total_swap_kb > 0 else 0

        return {
            "ram": {"total_gb": round(total_ram_kb / 1024**2, 2), "used_gb": round(used_ram_kb / 1024**2, 2),
                    "free_gb": round(available_ram_kb / 1024**2, 2), "usage_percent": round(ram_usage_percent, 1)},
            "swap": {"total_gb": round(total_swap_kb / 1024**2, 2), "used_gb": round(used_swap_kb / 1024**2, 2),
                     "free_gb": round(free_swap_kb / 1024**2, 2), "usage_percent": round(swap_usage_percent, 1)}
        }
    except Exception as e:
        print(f"Erro em get_memory_usage: {e}")
        return {"ram": {"total_gb": 0,"used_gb": 0,"free_gb": 0,"usage_percent": 0},
                "swap": {"total_gb": 0,"used_gb": 0,"free_gb": 0,"usage_percent": 0}}

def get_cpu_usage():
    global previous_overall_cpu_times, previous_per_core_cpu_times
    cpu_stats = {"overall_usage_percent": 0.0, "number_of_cores": 0, "cores": []}
    current_per_core_cpu_times = {}
    try:
        with open("/proc/stat", "r") as f: lines = f.readlines()
        
        cpu_line = lines[0]
        parts = list(map(int, cpu_line.strip().split()[1:]))
        current_overall_idle = parts[3] + parts[4]
        current_overall_total = sum(parts)
        if previous_overall_cpu_times:
            delta_total = current_overall_total - previous_overall_cpu_times['total']
            delta_idle = current_overall_idle - previous_overall_cpu_times['idle']
            if delta_total > 0: cpu_stats["overall_usage_percent"] = round((1.0 - delta_idle / delta_total) * 100.0, 1)
        previous_overall_cpu_times = {'total': current_overall_total, 'idle': current_overall_idle}

        core_lines = [line for line in lines if line.startswith("cpu") and line[3].isdigit()]
        cpu_stats["number_of_cores"] = len(core_lines)
        for i, line in enumerate(core_lines):
            core_id_str = f"cpu{i}"
            parts_core = list(map(int, line.strip().split()[1:]))
            current_core_idle = parts_core[3] + parts_core[4]
            current_core_total = sum(parts_core)
            current_per_core_cpu_times[core_id_str] = {'total': current_core_total, 'idle': current_core_idle}
            core_usage_percent = 0.0
            if core_id_str in previous_per_core_cpu_times:
                prev_core_data = previous_per_core_cpu_times[core_id_str]
                delta_core_total = current_core_total - prev_core_data['total']
                delta_core_idle = current_core_idle - prev_core_data['idle']
                if delta_core_total > 0: core_usage_percent = (1.0 - delta_core_idle / delta_core_total) * 100.0
            cpu_stats["cores"].append({"id": i, "name": f"Core {i}", "usage_percent": round(max(0, min(core_usage_percent, 100)), 1)})
        previous_per_core_cpu_times = current_per_core_cpu_times
        
        # Adicionar total_processes e total_threads aqui (calculado pelo controller)
        # Isso requer que o controller passe esses valores ou que get_processes seja chamado aqui
        # Para evitar chamadas duplicadas, o controller é um lugar melhor para agregar.
        # Se for usar o cache do controller, esses valores já estarão em cpu_stats.
        # Por enquanto, o frontend obtém esses de /api/processes.
        # cpu_stats["total_processes"] = ...
        # cpu_stats["total_threads"] = ...
        return cpu_stats
    except Exception as e:
        print(f"Erro em get_cpu_usage: {e}")
        num_cores_fallback = os.cpu_count() or 1
        return {"overall_usage_percent": 0.0, "number_of_cores": num_cores_fallback,
                "cores": [{"id": i, "name": f"Core {i}", "usage_percent": generateRandomUsage(0,5)} for i in range(num_cores_fallback)]}