import os
import time
import datetime

# variáveis globais para armazenar os dados de CPU e processos
previous_overall_cpu_times = None
previous_per_core_cpu_times = {} 
previous_process_cpu_times = {}

# mapeamento de dos significados de status de processos do Linux
PROCESS_STATUS_MAP = {
    'S': 'Dormindo', 'R': 'Rodando', 'Z': 'Zumbi', 'T': 'Parado', 
    'D': 'Disco Sleep', 'I': 'Inativo', 'X': 'Morto', 'K': 'Wakekill', 
    'P': 'Parked', 't': 'Parado (Tracing)'
}

# ---------------------------------------------------------------------------------------------------------------------------------

"""                             PROJETO A - Implementação da Funcionalidade Inicial do Dashboard                                """

# ---------------------------------------------------------------------------------------------------------------------------------

# função que obtém o nome de usuário a partir do UID fornecido
def get_username_from_uid(uid_str_or_int_param):

    # inicializa UID com valor inválido
    uid_to_find = -1 

    # verifica se o parâmetro é uma string e tenta extrair o UID
    if isinstance(uid_str_or_int_param, str):
        try:
            uid_to_find = int(uid_str_or_int_param.split()[0])
        except (ValueError, IndexError):
            return str(uid_str_or_int_param)

    # verifica se o parâmetro é um inteiro, se sim, usa diretamente como UID
    elif isinstance(uid_str_or_int_param, int):
        uid_to_find = uid_str_or_int_param

    # se o parâmetro não for nem string nem inteiro, realiza conversão para string
    else:
        return str(uid_str_or_int_param)

    # se o UID for negativo, retorna o próprio UID como string
    if uid_to_find < 0:
        return str(uid_to_find)

    # tenta abrir o arquivo /etc/passwd para buscar o nome de usuário associado ao UID
    try:
        with open("/etc/passwd", "r") as passwd_file:
            for line_content in passwd_file:
                parts = line_content.strip().split(":") # divide a linha em partes

                # verifica se a linha contém pelo menos 3 partes e se a terceira parte é um número
                if len(parts) >= 3 and parts[2].isdigit() and int(parts[2]) == uid_to_find:
                    return parts[0] # retorna o nome de usuário encontrado
    except Exception:
        pass # ignora erros ao abrir o arquivo

    # se não encontrar o nome de usuário, retorna o UID inválido como string
    return str(uid_to_find)

# ---------------------------------------------------------------------------------------------------------------------------------

# função que obtém o tempo de criação do processo em formato ISO 8601 (ex: "2024-10-01T13:45:30")
def get_process_creation_time_iso(pid_param, hertz_param):

    # tenta ler o arquivo stat (dados brutos) para obter o tempo de criação do processo
    try:
        with open(f"/proc/{pid_param}/stat", 'r') as stat_file:

            # lê o conteúdo do arquivo e divide em partes
            parts = stat_file.read().split()

        # obtém o tempo de início do processo em jiffies (unidade de tempo do kernel)
        starttime_jiffies = int(parts[21])

        # abre o arquivo uptime, que informa há quanto tempo o sistema está ligado
        with open('/proc/uptime', 'r') as uptime_file:

            # lê o tempo de atividade do sistema em segundos
            system_uptime_seconds = float(uptime_file.readline().split()[0])

        # calcula o tempo de criação do processo em segundos desde o boot do sistema
        boot_time_unix = time.time() - system_uptime_seconds

        # converte o tempo de criação do processo de jiffies para segundos e soma ao tempo de boot
        process_create_time_unix = boot_time_unix + (starttime_jiffies / hertz_param)

        # converte o tempo de criação do processo para o formato ISO 8601 (ex: "2024-10-01T13:45:30")
        return datetime.datetime.fromtimestamp(process_create_time_unix).isoformat()

    # se ocorrer algum erro ao ler os arquivos, tenta obter o tempo de modificação do diretório /proc/<pid>
    except (FileNotFoundError, IndexError, ValueError, OSError, ZeroDivisionError):
        try:
            return datetime.datetime.fromtimestamp(os.stat(f"/proc/{pid_param}").st_mtime).isoformat()
        except Exception:
            return None

# ---------------------------------------------------------------------------------------------------------------------------------

# função que obtém detalhes de uma thread específica de um processo
def get_thread_details(pid_param, tid_str_param):

    # converte o ID da Thread para um número inteiro válido
    tid = int(tid_str_param)

    # inicializa variáveis para armazenar o status e nome da thread
    thread_status_char, thread_name = "N/A", f"Thread {tid}" 

    # tenta abrir o arquivo de status da thread para obter informações sobre o status e nome
    try:

        with open(f"/proc/{pid_param}/task/{tid}/status", 'r') as status_file:

            for line in status_file:

                # verifica se a linha contém informações sobre o estado da thread
                if line.startswith("State:"):
                    thread_status_char = line.split(":", 1)[1].strip().split()[0] # pega o primeiro caractere do estado

                # verifica se a linha contém o nome da thread
                elif line.startswith("Name:"): 
                    thread_name = line.split(":", 1)[1].strip() # pega o nome da thread

        with open(f"/proc/{pid_param}/task/{tid}/comm", 'r') as comm_file:

            # abre o arquivo comm, que geralmente contém o nome mais preciso da thread e atualiza o nome se não estiver vazio
            thread_name_comm = comm_file.read().strip()
            if thread_name_comm: thread_name = thread_name_comm

    except FileNotFoundError:
        thread_status_char = "Terminada" # se o arquivo não existir, a thread foi terminada
    except Exception:
        pass # ignora outros erros

    # retorna um dicionário com os detalhes da thread, incluindo ID, nome e status mapeado
    return {"id": tid, "name": thread_name, "status": PROCESS_STATUS_MAP.get(thread_status_char, thread_status_char)}

# ---------------------------------------------------------------------------------------------------------------------------------

# função que obtém a lista de processos em execução no sistema
def get_processes():

    # variável global que armazena dados anteriores do tempo CPU dos processos para cálculo de uso CPU
    global previous_process_cpu_times 

    # inicializa a lista de processos e o dicionário de snapshots de CPU dos processos
    processes_list_result, current_process_cpu_snapshot = [], {}

    # obtém o número de jiffies por segundo do sistema, usado para calcular o uso de CPU
    hertz = os.sysconf(os.sysconf_names['SC_CLK_TCK'])

    # se o valor de hertz for zero, define um valor padrão de 100 jiffies por segundo
    if hertz == 0: hertz = 100

    try:
        # obtém a lista de PIDs ativos no sistema, filtrando apenas os diretórios numéricos em /proc
        active_pids = [p_str for p_str in os.listdir('/proc') if p_str.isdigit()]
    except FileNotFoundError: 
        # se /proc não existir (não estamos em Linux ou não tem acesso), retorna lista vazia
        return []

    for pid_str_current in active_pids:

        # converte o PID atual de string para inteiro
        pid_int_current = int(pid_str_current)

        try:

            # inicializa um dicionário para armazenar as informações do processo atual
            proc_info = {
                "pid": pid_int_current,
                "name": "N/A", 
                "user_name": "N/A", 
                "threads": 0, 
                "uid": -1,
                "threads_detailed_info": [], 
                "status": "N/A", 
                "cpu_percent": 0.0,
                "memory_rss_mb": 0.0, 
                "ppid": 0, 
                "nice": 0, 
                "priority": 0,
                "create_time_iso": None, 
                "executable_path": None, 
                "command_line": None,
                "memory_details_kb": { 
                    "vms": 0, 
                    "rss": 0, 
                    "vm_peak": 0, 
                    "code": 0, 
                    "data": 0,
                    "stack": 0, 
                    "shared": 0, 
                    "swap": 0, 
                    "page_tables": 0,
                    "vm_lck_kb": 0, 
                    "vm_pin_kb": 0, 
                    "vm_hwm_kb": 0, 
                    "rss_anon_kb": 0, 
                    "rss_file_kb": 0, 
                    "rss_shmem_kb": 0
                }
            }

            # abre o arquivo de status do processo para coletar informações detalhadas do processo
            with open(f"/proc/{pid_int_current}/status", "r") as f_status_file:

                for line_content_status in f_status_file:

                    # remove espaços em branco do início e fim da linha e ignora linhas vazias
                    line_stripped = line_content_status.strip()

                    # se a linha estiver vazia, pula para a próxima iteração
                    if not line_stripped: continue

                    #s epara a linha na primeira ocorrência de ":" para chave e valor
                    parts_line = line_stripped.split(":", 1)

                    # se a linha não tiver exatamente duas partes, pula para a próxima iteração
                    if len(parts_line) != 2: continue

                    # obtém a chave e o valor da linha, removendo espaços em branco
                    key_status = parts_line[0].strip()
                    value_str_status = parts_line[1].strip()
                    value_parts_status = value_str_status.split()

                    current_field_int_value = 0

                    # tenta converter o primeiro valor da parte do valor para inteiro, se for numérico
                    if value_parts_status and value_parts_status[0].isdigit():
                        try: current_field_int_value = int(value_parts_status[0])
                        except ValueError: current_field_int_value = 0
                    
                    # preenche o dicionário de informações do processo com base na chave
                    if key_status == "Name": proc_info["name"] = value_str_status

                    elif key_status == "State":
                        # mapeia o estado do processo para uma string legível
                        if value_parts_status: proc_info["status"] = PROCESS_STATUS_MAP.get(value_parts_status[0], value_parts_status[0])
                    
                    elif key_status == "PPid": proc_info["ppid"] = current_field_int_value

                    elif key_status == "Uid":
                        if value_parts_status: 
                            # obtém o nome de usuário associado ao UID do processo
                            proc_info["user_name"] = get_username_from_uid(value_str_status) 
                            try: proc_info["uid"] = int(value_parts_status[0])
                            except ValueError: proc_info["uid"] = -1

                    # utiliza métricas de memória para preencher o dicionário de detalhes de memória do processo
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
            
            #tenta abrir e ler arquivo de linha de comando do processo
            try:
                with open(f"/proc/{pid_int_current}/cmdline", 'rb') as cmd_f:

                    # lê o conteúdo do arquivo, substitui bytes nulos por espaços e remove espaços em branco
                    cmd_str_bytes = cmd_f.read().replace(b'\x00', b' ').strip()

                    # decodifica os bytes para string, substituindo caracteres inválidos
                    cmd_str_decoded = cmd_str_bytes.decode('utf-8', 'replace')

                    # se a string decodificada não estiver vazia, usa como comando; caso contrário, usa o nome do processo
                    proc_info["command_line"] = cmd_str_decoded or f"[{proc_info.get('name', 'unknown')}]"
            except Exception: 
                proc_info["command_line"] = f"[{proc_info.get('name', 'unknown')}]"
            
            # tenta abrir e ler o caminho do executável do processo
            try:
                proc_info["executable_path"] = os.readlink(f"/proc/{pid_int_current}/exe")
            except (FileNotFoundError, PermissionError, OSError): 
                proc_info["executable_path"] = None
            
            # tenta abrir e ler o arquivo de estatísticas de memória do processo
            try:
                with open(f"/proc/{pid_int_current}/statm", 'r') as statm_f:

                    # lê o conteúdo do arquivo e divide em partes
                    rss_pages = int(statm_f.read().split()[1]) 
                    page_size_bytes = os.sysconf('SC_PAGE_SIZE') # obtém o tamanho da página do sistema
                    proc_info["memory_rss_mb"] = round(rss_pages * (page_size_bytes / (1024**2)), 1)

            except (FileNotFoundError, IndexError, ValueError, OSError):
                if proc_info["memory_details_kb"].get("rss", 0) > 0 and proc_info["memory_rss_mb"] == 0.0:
                    proc_info["memory_rss_mb"] = round(proc_info["memory_details_kb"]["rss"] / 1024, 1)
            
            # tenta abrir o arquivo de estatísticas do processo para coletar informações de CPU e prioridade
            with open(f"/proc/{pid_int_current}/stat", 'r') as stat_f_p:
                stat_parts_list = stat_f_p.read().split()

                # verifica se o processo tem informações suficientes no arquivo stat
                if len(stat_parts_list) > 21: 

                    # preenche as informações de CPU e prioridade do processo
                    utime_jiffies, stime_jiffies = int(stat_parts_list[13]), int(stat_parts_list[14])
                    proc_info["priority"], proc_info["nice"] = int(stat_parts_list[17]), int(stat_parts_list[18])
                    current_total_jiffies_proc = utime_jiffies + stime_jiffies
                    current_timestamp_sec = time.time()
                    current_process_cpu_snapshot[pid_int_current] = {
                        'active_jiffies': current_total_jiffies_proc, 
                        'timestamp': current_timestamp_sec
                    }

                    # verifica se o processo já foi registrado anteriormente para calcular o uso de CPU
                    if pid_int_current in previous_process_cpu_times:
                        prev_snapshot_proc = previous_process_cpu_times[pid_int_current]
                        delta_time_seconds = current_timestamp_sec - prev_snapshot_proc['timestamp']
                        delta_jiffies_proc = current_total_jiffies_proc - prev_snapshot_proc['active_jiffies']

                        if delta_time_seconds > 0: 

                            # calcula uso CPU % relativo ao tempo decorrido e jiffies
                            cpu_usage_raw = (delta_jiffies_proc / hertz) / delta_time_seconds * 100.0

                            # considera quantidade de núcleos da CPU para ajustar o máximo possível
                            num_system_cores = os.cpu_count() or 1

                            # limita o uso de CPU entre 0% e 100% multiplicado pelo número de núcleos
                            proc_info["cpu_percent"] = round(max(0.0, min(cpu_usage_raw, 100.0 * num_system_cores)), 1)

                    # chama a função para obter o tempo de criação do processo em formato ISO 8601
                    proc_info["create_time_iso"] = get_process_creation_time_iso(pid_int_current, hertz)

                # se não conseguir ler o arquivo stat ou não tiver informações suficientes, define como nulo
                else: 
                    proc_info["create_time_iso"] = None
            
            # obtém informações detalhadas de cada thread do processo lendo o diretório /proc/[pid]/task/
            task_dir_path_proc = f"/proc/{pid_int_current}/task"

            if os.path.isdir(task_dir_path_proc):
                for tid_str_val in os.listdir(task_dir_path_proc):

                    # verifica se o ID da thread é um número válido e chama a função para obter detalhes da thread
                    if tid_str_val.isdigit():
                        proc_info["threads_detailed_info"].append(get_thread_details(pid_int_current, tid_str_val))

            # adiciona o dicionário de informações do processo à lista de processos
            processes_list_result.append(proc_info)

        except (FileNotFoundError, IndexError, ValueError, OSError, PermissionError) as e_process_loop:
            continue # ignora processos que não puderam ser lidos ou acessados

    # atualiza o dicionário global de tempos de CPU dos processos com o snapshot atual
    previous_process_cpu_times = current_process_cpu_snapshot
    return processes_list_result

# ---------------------------------------------------------------------------------------------------------------------------------

# função que obtém informações de uso de memória do sistema, incluindo RAM e swap
def get_memory_usage():

    # dicionários para armazenar dados brutos de memória e swap
    mem_raw_data, swap_raw_data = {}, {}

    # valores padrão para RAM e swap, caso não consigamos ler do sistema
    default_ram_data = {"total_gb": 0.0, "used_gb": 0.0, "free_gb": 0.0, "usage_percent": 0.0, "free_percent": 100.0}
    default_swap_data = {"total_gb": 0.0, "used_gb": 0.0, "free_gb": 0.0, "usage_percent": 0.0, "free_percent": 0.0}

    try:
        with open('/proc/meminfo', 'r') as f_meminfo_sys:
            for line_meminfo_sys in f_meminfo_sys:

                # divide a linha em partes usando ":" como delimitador
                parts_meminfo_sys = line_meminfo_sys.split(":")

                # verifica se a linha tem exatamente duas partes (chave:valor)
                if len(parts_meminfo_sys) == 2:

                    # remove espaços em branco
                    key_meminfo_sys = parts_meminfo_sys[0].strip()

                    # extrai apenas o valor numérico da parte de valor
                    val_str_meminfo_sys = parts_meminfo_sys[1].strip().split()[0] if parts_meminfo_sys[1].strip() else "0"
                    val_kb_sys = int(val_str_meminfo_sys)

                    # armazena os dados de memória e swap em seus respectivos dicionários
                    if key_meminfo_sys in ["MemTotal", "MemFree", "MemAvailable", "Buffers", "Cached", "SReclaimable"]:
                        mem_raw_data[key_meminfo_sys] = val_kb_sys
                    elif key_meminfo_sys in ["SwapTotal", "SwapFree"]:
                        swap_raw_data[key_meminfo_sys] = val_kb_sys
        
        # obtém o total de RAM disponível no sistema
        ram_total_kb_sys = mem_raw_data.get("MemTotal", 0)

        # obtém a memória disponível ou calcula se esta não existir
        ram_available_kb_sys = mem_raw_data.get("MemAvailable",
                                          mem_raw_data.get("MemFree", 0) + \
                                          mem_raw_data.get("Buffers", 0) + \
                                          mem_raw_data.get("Cached", 0) - \
                                          mem_raw_data.get("SReclaimable", 0))

        # se a memória disponível for negativa, assume MemFree como valor
        if ram_available_kb_sys < 0 :
            ram_available_kb_sys = mem_raw_data.get("MemFree", 0)

        # calcula a memória usada
        ram_used_kb_sys = ram_total_kb_sys - ram_available_kb_sys

        # calcula porcentagen de uso
        ram_percent_usage = (ram_used_kb_sys / ram_total_kb_sys * 100) if ram_total_kb_sys > 0 else 0.0

        # calcula porcentagem de memória livre
        ram_percent_free = 100.0 - ram_percent_usage if ram_total_kb_sys > 0 else \
                           (100.0 if ram_total_kb_sys == 0 and ram_available_kb_sys == 0 else 0.0)

        # obtém os dados de swap do sistema
        swap_total_kb_sys = swap_raw_data.get("SwapTotal", 0)
        swap_free_kb_sys = swap_raw_data.get("SwapFree", 0)
        swap_used_kb_sys = swap_total_kb_sys - swap_free_kb_sys

        # calcula porcentagem de uso de swap
        swap_percent_usage = (swap_used_kb_sys / swap_total_kb_sys * 100) if swap_total_kb_sys > 0 else 0.0
        swap_percent_free = 100.0 - swap_percent_usage if swap_total_kb_sys > 0 else 0.0
        
        # formata dados de RAM de kB para GB e arredonda os valores
        ram_data_to_return = {
            "total_gb": round(ram_total_kb_sys / (1024**2), 2),
            "used_gb": round(ram_used_kb_sys / (1024**2), 2),
            "free_gb": round(ram_available_kb_sys / (1024**2), 2), 
            "usage_percent": round(ram_percent_usage, 1),
            "free_percent": round(ram_percent_free, 1)
        }

        # formata dados de swap de kB para GB e arredonda os valores
        swap_data_to_return = {
            "total_gb": round(swap_total_kb_sys / (1024**2), 2), 
            "used_gb": round(swap_used_kb_sys / (1024**2), 2),
            "free_gb": round(swap_free_kb_sys / (1024**2), 2), 
            "usage_percent": round(swap_percent_usage, 1),
            "free_percent": round(swap_percent_free, 1)
        }

        return {"ram": ram_data_to_return, "swap": swap_data_to_return}

    # em caso de erro (ex: arquivo /proc/meminfo não disponível), retorna os valores padrão
    except Exception as e_mem_sys:
        print(f"Erro ao ler informações de memória do sistema: {e_mem_sys}")
        return {"ram": default_ram_data, "swap": default_swap_data}

# ---------------------------------------------------------------------------------------------------------------------------------

# função que obtém informações de uso de CPU do sistema, incluindo uso geral e por núcleo
def get_cpu_usage():

    # variáveis globais para armazenar os tempos de CPU anteriores
    global previous_overall_cpu_times, previous_per_core_cpu_times

    # inicializa o dicionário de retorno com valores padrão
    cpu_stats_return = {
        "overall_usage_percent": 0.0, 
        "overall_idle_percent": 100.0, 
        "number_of_cores": 0, 
        "cores": []
    }

    # dicionário para armazenar o snapshot atual dos tempos de CPU por núcleo
    current_core_times_snapshot_sys = {}

    try:
        # tenta abrir e ler o arquivo stat do sistema para obter informações gerais de CPU
        with open("/proc/stat", "r") as f_stat_cpu_sys:
            lines_stat_cpu_sys = f_stat_cpu_sys.readlines()
        
        # extrai a linha com estatísticas globais da CPU (primeira linha) e converte os valores para inteiros
        parts_overall_sys = list(map(int, lines_stat_cpu_sys[0].strip().split()[1:]))

        # calcula o tempo ocioso total e o total de jiffies do sistema
        idle_all_jiffies_sys = parts_overall_sys[3] + (parts_overall_sys[4] if len(parts_overall_sys) > 4 else 0)
        total_all_jiffies_sys = sum(parts_overall_sys)
        
        # verifica se já existem tempos de CPU anteriores para calcular o uso percentual
        if previous_overall_cpu_times:

            # calcula as diferenças de tempo total e ocioso desde a última leitura
            delta_total_jiffies_sys = total_all_jiffies_sys - previous_overall_cpu_times['total']
            delta_idle_jiffies_sys = idle_all_jiffies_sys - previous_overall_cpu_times['idle']

            # calcula a porcentagem de uso e ocioso da CPU geral
            if delta_total_jiffies_sys > 0:
                cpu_stats_return["overall_usage_percent"] = round((1.0 - delta_idle_jiffies_sys / delta_total_jiffies_sys) * 100.0, 1)
                cpu_stats_return["overall_idle_percent"] = round((delta_idle_jiffies_sys / delta_total_jiffies_sys) * 100.0, 1)

        # atualiza os tempos de CPU anteriores com os valores atuais
        previous_overall_cpu_times = {'total': total_all_jiffies_sys, 'idle': idle_all_jiffies_sys}

        # garante que os valores de uso e ocioso da CPU geral estejam entre 0% e 100%
        cpu_stats_return["overall_usage_percent"] = max(0.0, min(cpu_stats_return["overall_usage_percent"], 100.0))
        cpu_stats_return["overall_idle_percent"] = max(0.0, min(cpu_stats_return["overall_idle_percent"], 100.0))

        # filtra as linhas que representam estatísticas por núcleo
        core_stat_lines_sys = [ln_core for ln_core in lines_stat_cpu_sys if ln_core.startswith("cpu") and ln_core[3].isdigit()]

        # registra o número de núcleos encontrados
        cpu_stats_return["number_of_cores"] = len(core_stat_lines_sys)

        # itera sobre cada núcleo individualmente para calcular estatísticas por core
        for i_core_sys, line_core_stat_sys in enumerate(core_stat_lines_sys):

            # gera o ID do núcleo como uma string (ex: "cpu0", "cpu1", etc.)
            core_id_str_val_sys = f"cpu{i_core_sys}"

            # extrai os tempos do núcleo atual
            parts_core_stat_sys = list(map(int, line_core_stat_sys.strip().split()[1:]))

            # calcula o tempo ocioso e o tempo total do núcleo atual
            idle_core_jiffies_sys = parts_core_stat_sys[3] + (parts_core_stat_sys[4] if len(parts_core_stat_sys) > 4 else 0)
            total_core_jiffies_sys = sum(parts_core_stat_sys)

            # salva os tempos atuais do núcleo no snapshot atual
            current_core_times_snapshot_sys[core_id_str_val_sys] = {'total': total_core_jiffies_sys, 'idle': idle_core_jiffies_sys}

            usage_core_pc_val_sys = 0.0 # inicializa o uso do núcleo como 0%

            # se houver dados anteriores desse núcleo, calcula a diferença de tempo total e ocioso para calcular o uso da CPU
            if core_id_str_val_sys in previous_per_core_cpu_times:
                prev_core_times_sys = previous_per_core_cpu_times[core_id_str_val_sys]
                delta_total_core_jiffies_sys = total_core_jiffies_sys - prev_core_times_sys['total']
                delta_idle_core_jiffies_sys = idle_core_jiffies_sys - prev_core_times_sys['idle']

                if delta_total_core_jiffies_sys > 0:
                    usage_core_pc_val_sys = (1.0 - delta_idle_core_jiffies_sys / delta_total_core_jiffies_sys) * 100.0

            # adiciona os dados desse núcleo (ID, nome e uso) na lista de núcleos do resultado, garantindo que esteja entre 0% e 100%
            cpu_stats_return["cores"].append({
                "id": i_core_sys, 
                "name": f"Core {i_core_sys}", 
                "usage_percent": round(max(0.0, min(usage_core_pc_val_sys, 100.0)), 1)
            })

        # atualiza os tempos anteriores com os snapshots atuais, para uso na próxima execução
        previous_per_core_cpu_times = current_core_times_snapshot_sys

        print('Sucesso ao ler informações de CPU do sistema.')

        return cpu_stats_return

    except Exception as e_cpu_sys:
        print(f"Erro ao ler informações de CPU do sistema: {e_cpu_sys}")
        num_cores_fallback_sys = os.cpu_count() or 1 # garante pelo menos 1 núcleo
        # se não conseguir ler as informações de CPU, retorna um resultado padrão com uso 0.0% para todos os núcleos se houve erro
        return {
            "overall_usage_percent": 0.0,
            "overall_idle_percent": 100.0, 
            "number_of_cores": num_cores_fallback_sys,
            "cores": [{"id": i_fb_sys, "name": f"Core {i_fb_sys}", "usage_percent": 0.0} for i_fb_sys in range(num_cores_fallback_sys)]
        }


# ---------------------------------------------------------------------------------------------------------------------------------

"""                            PROJETO B - Mostrar dados do uso dos dispositivos de E/S pelos processos                         """

# ---------------------------------------------------------------------------------------------------------------------------------


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
