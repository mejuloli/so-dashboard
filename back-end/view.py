import os

def render(processes, memory, cpu):

    # 1. Limpar o terminal
    os.system('clear')

    # 2. Cabeçalho
    print("===== DASHBOARD DO SISTEMA =====\n")

    # 3. Uso da CPU
    print(f"Uso de CPU: {cpu['usage_percentage']}%")

    # 4. Uso de memória
    total_memory = memory.get("MemTotal", 0)
    available_memory = memory.get("MemAvailable", 0)
    used_percentage = memory.get("MemUsedPercent", 0.0)

    print(f"Uso de Memória: {used_percentage}%")
    print(f"Total: {total_memory} kB | Disponível: {available_memory} kB")

    # 5. Processos (exibe os 5 primeiros)
    print("\n--- Processos Ativos ---")
    print(f"{'PID':<8} {'UID':<8} {'Threads':<8} {'Nome':<15}")
    print("-" * 45)

    for p in processes[:5]:
        print(f"{p['pid']:<8} {p['uid']:<8} {p['threads']:<8} {p['name']:<15}")

    print("\nAtualização a cada 5 segundos...")
