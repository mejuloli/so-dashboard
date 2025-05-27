import os

#--------------------------------------------------------------------------------------------------------------------

# função para obter os processos em execução
def get_processes():

    processes_list = [] # processos serão armazenados em uma lista

    # percorre o diretório /proc que contém informações sobre os processos
    for process in os.listdir('/proc'):
        if process.isdigit(): # verifica se o nome do processo é um número
            pid = process # armazena o PID do processo
            pid_path = f"/proc/{pid}/status" # caminho do processo

            try: # tenta abrir o arquivo de status do processo
                with open(pid_path, 'r') as file:

                    # inicializa variáveis para armazenar informações do processo
                    process_name = ""
                    process_uid = ""
                    process_threads = ""

                    for row in file: # lê cada linha do arquivo de status
                        # divide a linha em ":" armazena nome/uid/threads do processo e remove espaços em branco
                        if row.startswith("Name:"): 
                            process_name = row.split(":")[1].strip() 
                        elif row.startswith("Uid:"):
                            process_uid = row.split(":")[1].strip()
                        elif row.startswith("Threads:"):
                            process_threads = row.split(":")[1].strip()

                    # adiciona as informações do processo à lista
                    processes_list.append({
                        "pid": pid,
                        "name": process_name,
                        "uid": process_uid,
                        "threads": process_threads
                    })

            except FileNotFoundError: # caso o arquivo de status não exista
                continue # ignora processos
            except Exception as e: # trata erros genéricos
                print(f"Erro ao ler o processo {pid}: {e}")
                continue # ignora outros erros

    return processes_list # retorna a lista de processos


#--------------------------------------------------------------------------------------------------------------------


# função para obter o uso de memória do sistema
def get_memory_usage():

    memory_usage = {} # dicionário para armazenar os dados de uso de memória

    try:
        with open('/proc/meminfo', 'r') as file: # abre o arquivo de informações de memória em formato de leitura
            for row in file:
                # verifica se a linha contém informações relevantes sobre memória
                if any(key in row for key in ["MemTotal", "MemFree", "Buffers", "Cached", "MemAvailable"]):
                    key, value = row.split(":") # divide a linha em chave e valor
                    memory_usage[key.strip()] = int(value.strip().split()[0]) # remove espaços, converte o valor para inteiro e armazena no dicionário

        # calcula o uso de memória total e disponível
        total_memory = memory_usage.get("MemTotal", 0) # obtém o total de memória
        available_memory = memory_usage.get("MemAvailable", 0) # obtém a memória disponível

        # calcula a memória usada
        used_memory = total_memory - available_memory

        if total_memory > 0:
            # calcula a porcentagem de uso de memória
            memory_usage["UsedMemPercentage"] = round((used_memory / total_memory) * 100, 2)
        else:
            # se o total de memória for zero, define a porcentagem de uso como zero
            memory_usage["UsedMemPercentage"] = 0.0

    except Exception as e: # trata erros ao ler o arquivo de memória
        print(f"Erro ao ler informações de memória: {e}")
        memory_usage = {"MemTotal": 0, "MemFree": 0, "Buffers": 0, "Cached": 0, "UsedMemPercentage": 0.0} # retorna valores padrão em caso de erro

    return memory_usage # retorna o dicionário com informações de uso de memória


#--------------------------------------------------------------------------------------------------------------------


# função para obter o uso de CPU do sistema
def get_cpu_usage():

    try:
        with open("/proc/stat", "r") as file: # abre o arquivo de estatísticas da CPU
            row = file.readline()  # lê a primeira linha do arquivo

            # converte a linha em uma lista de inteiros, ignorando o primeiro elemento (que é o nome da CPU)
            parts = list(map(int, row.strip().split()[1:]))

            # calcula o total de tempo de CPU e o tempo de inatividade
            total_time = sum(parts)
            idle_time = parts[3]

            # calcula o uso de CPU como uma porcentagem
            usage_percentage = 100 * (1 - idle_time / total_time)

            # cria um dicionário com os dados de uso de CPU
            cpu_usage = {
                "total_time": total_time,
                "idle_time": idle_time,
                "usage_percentage": round(usage_percentage, 2)  # arredonda o uso de CPU para duas casas decimais
            }

            return cpu_usage  # retorna o dicionário com os dados de uso de CPU
        
    except Exception as e:  # trata erros ao ler o arquivo de estatísticas da CPU
        print(f"Erro ao ler informações de CPU: {e}")
        return {"total_time": 0, "idle_time": 0, "usage_percentage": 0.0}  # retorna valores padrão em caso de erro
