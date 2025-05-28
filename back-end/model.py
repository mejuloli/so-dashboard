import os
import time

#--------------------------------------------------------------------------------------------------------------------

# função para obter o nome do usuário do processo
def get_process_username(uid):

    try:
        with open (f"/etc/passwd", 'r') as passwd_file: # abre o arquivo de senhas do sistema
            for row in passwd_file:
                parts = row.split(':') # divide a linha em partes
                if parts[2] == str(uid): # verifica se o UID corresponde ao do processo
                    process_username = parts[0] # armazena o nome do usuário
                    break # sai do loop se o usuário for encontrado
    except:
        pass # ignora erros ao ler o arquivo de senhas

    return process_username if 'process_username' in locals() else "Unknown" # retorna o nome do usuário ou "Unknown" se não encontrado

#--------------------------------------------------------------------------------------------------------------------

# função para obter os processos em execução
def get_processes():

    processes_list = [] # processos serão armazenados em uma lista

    with open ("/proc/stat", "r") as file: # abre o arquivo de estatísticas do sistema em modo de leitura
        total_cpu_row = file.readline() # lê a primeira linha do arquivo que contém informações sobre a CPU
        total_cpu_time = sum(map(int, total_cpu_row.strip().split()[1:])) # converte a linha em uma lista de inteiros e calcula o tempo total da CPU

    # percorre o diretório /proc que contém informações sobre os processos
    for process in os.listdir('/proc'):
        if process.isdigit(): # verifica se o nome do processo é um número
            pid = process # armazena o PID do processo
            status_path = f"/proc/{pid}/status" # caminho do arquivo de status com dados legíveis do processo
            stat_path = f"/proc/{pid}/stat" # caminho do aquivo de status com dados brutos do processo

            try:

                # [status] coleta de informações do processo (nome, UID, threads, memória)

                # inicializa variáveis para armazenar informações do processo
                process_name = ""
                process_uid = ""
                process_username = ""
                process_threads = ""
                memory_rss = 0 # memória residente do processo
                memory_vms = 0 # memória virtual do processo

                with open(status_path, 'r') as file:

                    # lê cada linha do arquivo de status
                    for row in file:

                        # divide a linha em ":" armazena o dado desejado do processo e remove espaços em branco
                        if row.startswith("Name:"): 
                            process_name = row.split(":")[1].strip() 
                        elif row.startswith("Uid:"):
                            process_uid = row.split(":")[1].strip()
                            process_username = get_process_username(process_uid) # obtém o nome do usuário do processo
                        elif row.startswith("Threads:"):
                            process_threads = row.split(":")[1].strip()
                        elif row.startswith("VmRSS:"):
                            memory_rss = int(row.split(":")[1].strip().split()[0]) / 1024 # converte memória residente de KB para MB
                        elif row.startswith("VmSize:"):
                            memory_vms = int(row.split(":")[1].strip().split()[0]) / 1024 # converte memória virtual de KB para MB


                # [stat] coleta de informações de uso da cpu pelo processo

                with open(stat_path, 'r') as file:
                    values = file.readline().strip().split() # lê a primeira linha do arquivo de estatísticas do processo
                    utime = int(values[13]) # tempo de CPU em modo usuário
                    stime = int(values[14]) # tempo de CPU em modo sistema
                    total_process_time = utime + stime # tempo total de CPU usado pelo processo

                # calcula a porcentagem de uso da CPU pelo processo
                cpu_usage_percentage = round((total_process_time / total_cpu_time) * 100, 2) if total_cpu_time > 0 else 0.0
          

                # adiciona as informações do processo à lista
                processes_list.append({
                    "pid": pid,
                    "name": process_name,
                    "uid": process_uid,
                    "user": process_username,
                    "threads": process_threads,
                    "memory_rss_mb": round(memory_rss, 2),
                    "memory_vms_mb": round(memory_vms, 2),
                    "cpu_usage": cpu_usage_percentage
                })

            except FileNotFoundError: # caso o arquivo de status não exista
                continue # ignora processos
            except Exception as e: # trata erros genéricos
                print(f"Erro ao ler o processo {pid}: {e}")
                continue # ignora outros erros

    return processes_list # retorna a lista de processos


#--------------------------------------------------------------------------------------------------------------------

# função para obter informações de um processo específico pelo PID
def get_specific_process_by_pid(pid):

    base_path = f"/proc/{pid}" # caminho base do processo
    process_info = {} # dicionário para armazenar as informações do processo

    try:
    
        status_path = os.path.join(base_path, "status") # caminho do arquivo de status do processo 

        # [status] coleta de informações do processo (nome, UID, threads, memória)
        
        # inicializa variáveis para armazenar informações do processo
        process_name = ""
        process_uid = ""
        process_username = ""
        process_threads = ""
        memory_rss = 0 # memória residente do processo
        memory_vms = 0 # memória virtual do processo
        process_state = "" # estado do processo     

        with open(status_path, 'r') as file: # abre o arquivo de status do processo

            for row in file: # lê cada linha do arquivo de status
                # divide a linha em ":" armazena o dado desejado do processo e remove espaços em branco
                if row.startswith("Name:"): 
                    process_name = row.split(":")[1].strip() 
                elif row.startswith("Uid:"):
                    process_uid = row.split(":")[1].strip()
                    process_username = get_process_username(process_uid) # obtém o nome do usuário do processo
                elif row.startswith("Threads:"):
                    process_threads = row.split(":")[1].strip()
                elif row.startswith("VmRSS:"):
                    memory_rss = round(int(row.split(":")[1].strip().split()[0]) / 1024, 2) # converte memória residente de kB para MB
                elif row.startswith("VmSize:"):
                    memory_vms = round(int(row.split(":")[1].strip().split()[0]) / 1024, 2) # converte memória virtual de kB para MB
                elif row.startswith("State:"):
                    process_state = row.split(":")[1].strip() # obtém o estado do processo


            # [cmdline] coleta de informações da linha de comando do processo

            cmdline_path = os.path.join(base_path, "cmdline") # caminho do arquivo de linha de comando do processo

            with open(cmdline_path, 'r') as file:

                # lê a linha de comando, substitui caracteres nulos por espaços e remove espaços em branco
                cmdline = file.read().replace('\x00', ' ').strip()


            # [exe] coleta do caminho do executável do processo
            exe_path = os.readlink(os.path.join(base_path, "exe"))


            # [stat] coleta de informações de uso da cpu pelo processo

            stat_path = os.path.join(base_path, "stat") # caminho do arquivo de estatísticas do processo

            with open(stat_path, 'r') as file:
                stat_fields = file.read().split() # lê o arquivo de estatísticas e divide em campos
                utime = int(stat_fields[13]) # tempo de CPU em modo usuário
                stime = int(stat_fields[14]) # tempo de CPU em modo sistema
                start_time_ticks = int(stat_fields[21]) # tempo de início do processo

            with open("/proc/stat", "r") as file:

                # lê a primeira linha do arquivo de estatísticas da CPU e calcula o tempo total de CPU
                total_cpu_usage = sum(map(int, file.readline().strip().split()[1:]))

            # calcula a porcentagem de uso da CPU pelo processo
            process_cpu_usage = round((utime + stime) / total_cpu_usage * 100, 2) if total_cpu_usage > 0 else 0.0

            # [creation_time] coleta do tempo de criação do processo
            clock_ticks = os.sysconf(os.sysconf_names['SC_CLK_TCK']) # obtém o número de ticks do relógio por segundo
            uptime = float(open('/proc/uptime').read().split()[0]) # obtém o tempo de atividade do sistema em segundos
            process_start_time = round((start_time_ticks / clock_ticks) - uptime, 2) # calcula o tempo de início do processo em segundos
            start_timestamp = time.time() - (uptime - process_start_time) # calcula o timestamp de início do processo

            # [threads] coleta do número de threads do processo
            
            threads_info = [] # lista para armazenar informações das threads do processo
            threads_path = os.path.join(base_path, "task") # caminho do diretório de tarefas do processo

            if os.path.isdir(threads_path): # verifica se o diretório de tarefas existe
                for thread in os.listdir(threads_path): # percorre as threads do processo

                    try:
                        with open(os.path.join(threads_path, thread, "stat"), 'r') as file:
                            fields = file.read().split() # lê o arquivo de estatísticas da thread
                            thread_utime = int(fields[13]) # tempo de CPU em modo usuário da thread
                            thread_stime = int(fields[14]) # tempo de CPU em modo sistema da thread
                            thread_cpu_usage = round((thread_utime + thread_stime) / total_cpu_usage * 100, 2) if total_cpu_usage > 0 else 0.0 # calcula a porcentagem de uso da CPU pela thread
                            threads_info.append({
                                "tid": thread, # ID da thread
                                "cpu_usage": thread_cpu_usage, # porcentagem de uso da CPU pela thread
                            })
                    except:
                        continue # ignora threads que não podem ser lidas


            # [smaps] coleta de informações de memória do processo

            smaps_path = os.path.join(base_path, "smaps") # caminho do arquivo de estatísticas de memória do processo

            memory_pages = {
                "total": 0, # total de páginas de memória
                "heap": 0, # páginas de heap
                "stack": 0, # páginas de stack
                "code": 0 # páginas de código
            }

            current_segment = "" # variável para armazenar o segmento atual de memória

            try:
                with open(smaps_path, 'r') as file:
                    for row in file:

                        # verifica se a linha é início de um novo segmento de memória
                        if "-" in row:
                            if "[heap]" in row:
                                current_segment = "heap" # segmento de heap do processo
                            elif "[stack]" in row:
                                current_segment = "stack" # segmento de stack do processo
                            elif " r-xp " in row:
                                current_segment = "code" # segmento de código do processo
                            else:
                                current_segment = ""
                        
                        # verifica se a linha contém informações de tamanho do segmento de memória
                        if row.startswith("Size:"):

                            # obtém o tamanho do segmento de memória em kB
                            memory_size = int(row.split()[1]) 
                            memory_pages["total"] += memory_size

                            # adiciona o tamanho do segmento de memória ao segmento correspondente
                            if current_segment == "heap":
                                memory_pages["heap"] += memory_size
                            elif current_segment == "stack":
                                memory_pages["stack"] += memory_size
                            elif current_segment == "code":
                                memory_pages["code"] += memory_size
            except FileNotFoundError:
                memory_pages = {
                    "total": 0.0,
                    "heap": 0.0,
                    "stack": 0.0,
                    "code": 0.0
                }
            except Exception as e: # trata erros ao ler o arquivo de estatísticas de memória
                print(f"Erro ao ler smaps do processo {pid}: {e}")
                memory_pages = {
                    "total": 0.0,
                    "heap": 0.0,
                    "stack": 0.0,
                    "code": 0.0
                }


            # retorna as informações do processo em um dicionário
            process_info = {
                "pid": pid, # ID do processo
                "name": process_name, # nome do processo
                "uid": process_uid, # UID do processo
                "user": process_username, # nome do usuário do processo
                "threads": process_threads, # número de threads do processo
                "memory_rss": memory_rss, # memória residente do processo em MB
                "memory_vms": memory_vms, # memória virtual do processo em MB
                "cpu_usage": process_cpu_usage, # porcentagem de uso da CPU pelo processo
                "state": process_state, # estado do processo
                "cmdline": cmdline, # linha de comando do processo
                "exe_path": exe_path, # caminho do executável do processo
                "start_time": start_timestamp, # timestamp de início do processo
                "threads_info": threads_info, # informações das threads do processo
                "memory_pages": memory_pages # informações de memória do processo
            }

            return process_info # retorna as informações do processo
        
    except FileNotFoundError: # caso o arquivo de status não exista
        return None # retorna None se o processo não for encontrado
    except Exception as e: # trata erros genéricos
        print(f"Erro ao ler o processo {pid}: {e}") # exibe mensagem de erro
        return None

#--------------------------------------------------------------------------------------------------------------------

# função para obter o uso de memória do sistema
def get_memory_usage():

    memory_usage = {}

    try:

        memory_usage_kb = {} # dicionário para armazenar os dados de uso de memória em kB

        # abre o arquivo de informações de memória em formato de leitura
        with open('/proc/meminfo', 'r') as file: 
            
            for row in file:

                # verifica se a linha contém informações relevantes sobre memória
                if any(key in row for key in ["MemTotal", "MemAvailable"]):
                    key, value = row.split(":") # divide a linha em chave e valor
                    memory_usage_kb[key.strip()] = int(value.strip().split()[0]) # remove espaços, converte o valor para inteiro e armazena no dicionário

        # calcula o uso de memória total e disponível
        total_memory = round(memory_usage_kb.get("MemTotal", 0) / (1024 ** 2), 2) # obtém o total de memória em GB
        available_memory = round(memory_usage_kb.get("MemAvailable", 0) / (1024 ** 2), 2) # obtém a memória disponível em GB

        # calcula a memória usada
        used_memory = total_memory - available_memory

        if total_memory > 0:
            # calcula a porcentagem de uso de memória
            memory_usage_percentage = round((used_memory / total_memory) * 100, 2)
        else:
            # se o total de memória for zero, define a porcentagem de uso como zero
            memory_usage_percentage = 0.0

        memory_usage = {
            "MemTotal": total_memory,
            "MemAvailable": available_memory,
            "MemUsed": used_memory,
            "MemUsedPercent": memory_usage_percentage # porcentagem de memória usada
        }

        return memory_usage

    except Exception as e: # trata erros ao ler o arquivo de memória
        print(f"Erro ao ler informações de memória: {e}")
        memory_usage = {
            "MemTotal": 0.0,
            "MemAvailable": 0.0,
            "MemUsed": 0.0,
            "MemUsedPercent": 0.0,
        }

        return memory_usage

#--------------------------------------------------------------------------------------------------------------------


# função para obter o uso de CPU do sistema
def get_cpu_usage():

    cpu_usage = {} # dicionário para armazenar os dados de uso de CPU

    try:
        with open("/proc/stat", "r") as file: # abre o arquivo de estatísticas da CPU
            row = file.readline()  # lê a primeira linha do arquivo

            # converte a linha em uma lista de inteiros, ignorando o primeiro elemento (que é o nome da CPU)
            parts = list(map(int, row.strip().split()[1:]))

            # calcula o total de tempo de CPU e o tempo de inatividade
            total_time = sum(parts)
            idle_time = parts[3]

            # calcula porcentagem de uso da CPU e tempo de inatividade
            if total_time > 0 & idle_time >= 0:
                usage_percentage = round(100 * (1 - idle_time / total_time), 2)
                idle_time_percentage = round(100 * (idle_time / total_time), 2)
            else:
                usage_percentage = 0.0
                idle_time_percentage = 100.0

            # armazena os dados de uso da CPU em um dicionário
            cpu_usage = {
                "usage_percentage": usage_percentage, 
                "idle_time_percentage": idle_time_percentage
            }

            return cpu_usage
        
    except Exception as e:  # trata erros ao ler o arquivo de estatísticas da CPU
        print(f"Erro ao ler informações de CPU: {e}")
        cpu_usage = {
                "usage_percentage": 0.0, 
                "idle_time_percentage": 100.0
            }
        return cpu_usage
