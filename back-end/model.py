import os
import time
import datetime

# variáveis globais para cache de cpu e processos
previous_overall_cpu_times = None
previous_per_core_cpu_times = {}
previous_process_cpu_times = {}

# mapa de status de processos do linux
PROCESS_STATUS_MAP = {
    "S": "Dormindo",
    "R": "Rodando",
    "Z": "Zumbi",
    "T": "Parado",
    "D": "Disco Sleep",
    "I": "Inativo",
    "X": "Morto",
    "K": "Wakekill",
    "P": "Parked",
    "t": "Parado (Tracing)",
}

# ---------------------------------------------------------------------------------------------------------------------------------
# projeto a - funcionalidade inicial do dashboard
# ---------------------------------------------------------------------------------------------------------------------------------


# obtém o nome de usuário a partir do uid
def get_username_from_uid(uid_str_or_int_param):
    # prepara uid inicial
    uid_to_find = -1

    # trata parâmetro string
    if isinstance(uid_str_or_int_param, str):
        try:
            uid_to_find = int(uid_str_or_int_param.split()[0])
        except (ValueError, IndexError):
            return str(uid_str_or_int_param)

    # trata parâmetro inteiro
    elif isinstance(uid_str_or_int_param, int):
        uid_to_find = uid_str_or_int_param

    # demais tipos: retorna como string
    else:
        return str(uid_str_or_int_param)

    # uid inválido: retorna como string
    if uid_to_find < 0:
        return str(uid_to_find)

    # busca no /etc/passwd
    try:
        with open("/etc/passwd", "r") as passwd_file:
            for line_content in passwd_file:
                parts = line_content.strip().split(":")
                if (
                    len(parts) >= 3
                    and parts[2].isdigit()
                    and int(parts[2]) == uid_to_find
                ):
                    return parts[0]
    except Exception:
        pass

    # fallback: retorna uid como string
    return str(uid_to_find)


# ---------------------------------------------------------------------------------------------------------------------------------


# obtém criação do processo em iso 8601
def get_process_creation_time_iso(pid_param, hertz_param):
    try:
        # lê /proc/<pid>/stat
        with open(f"/proc/{pid_param}/stat", "r") as stat_file:
            parts = stat_file.read().split()

        # início em jiffies
        starttime_jiffies = int(parts[21])

        # uptime do sistema
        with open("/proc/uptime", "r") as uptime_file:
            system_uptime_seconds = float(uptime_file.readline().split()[0])

        # calcula timestamp unix de criação
        boot_time_unix = time.time() - system_uptime_seconds
        process_create_time_unix = boot_time_unix + (starttime_jiffies / hertz_param)

        # formata iso
        return datetime.datetime.fromtimestamp(process_create_time_unix).isoformat()

    # fallback: usa mtime de /proc/<pid>
    except (FileNotFoundError, IndexError, ValueError, OSError, ZeroDivisionError):
        try:
            return datetime.datetime.fromtimestamp(
                os.stat(f"/proc/{pid_param}").st_mtime
            ).isoformat()
        except Exception:
            return None


# ---------------------------------------------------------------------------------------------------------------------------------


# obtém detalhes de uma thread
def get_thread_details(pid_param, tid_str_param):
    # converte tid
    tid = int(tid_str_param)

    # valores padrão
    thread_status_char, thread_name = "N/A", f"Thread {tid}"

    # lê status e comm
    try:
        with open(f"/proc/{pid_param}/task/{tid}/status", "r") as status_file:
            for line in status_file:
                if line.startswith("State:"):
                    thread_status_char = line.split(":", 1)[1].strip().split()[0]
                elif line.startswith("Name:"):
                    thread_name = line.split(":", 1)[1].strip()

        with open(f"/proc/{pid_param}/task/{tid}/comm", "r") as comm_file:
            thread_name_comm = comm_file.read().strip()
            if thread_name_comm:
                thread_name = thread_name_comm

    except FileNotFoundError:
        thread_status_char = "Terminada"
    except Exception:
        pass

    # retorna dicionário resumido
    return {
        "id": tid,
        "name": thread_name,
        "status": PROCESS_STATUS_MAP.get(thread_status_char, thread_status_char),
    }


# ---------------------------------------------------------------------------------------------------------------------------------


# lista processos do sistema
def get_processes():
    global previous_process_cpu_times

    # saída e snapshot de cpu dos processos
    processes_list_result, current_process_cpu_snapshot = [], {}

    # jiffies por segundo
    hertz = os.sysconf(os.sysconf_names["SC_CLK_TCK"])
    if hertz == 0:
        hertz = 100

    # pids ativos
    try:
        active_pids = [p_str for p_str in os.listdir("/proc") if p_str.isdigit()]
    except FileNotFoundError:
        return []

    for pid_str_current in active_pids:
        pid_int_current = int(pid_str_current)

        try:
            # estrutura base do processo
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
                    "rss_shmem_kb": 0,
                },
            }

            # lê /proc/<pid>/status
            with open(f"/proc/{pid_int_current}/status", "r") as f_status_file:
                for line_content_status in f_status_file:
                    line_stripped = line_content_status.strip()
                    if not line_stripped:
                        continue
                    parts_line = line_stripped.split(":", 1)
                    if len(parts_line) != 2:
                        continue

                    key_status = parts_line[0].strip()
                    value_str_status = parts_line[1].strip()
                    value_parts_status = value_str_status.split()

                    current_field_int_value = 0
                    if value_parts_status and value_parts_status[0].isdigit():
                        try:
                            current_field_int_value = int(value_parts_status[0])
                        except ValueError:
                            current_field_int_value = 0

                    # popula campos relevantes
                    if key_status == "Name":
                        proc_info["name"] = value_str_status

                    elif key_status == "State":
                        if value_parts_status:
                            proc_info["status"] = PROCESS_STATUS_MAP.get(
                                value_parts_status[0], value_parts_status[0]
                            )

                    elif key_status == "PPid":
                        proc_info["ppid"] = current_field_int_value

                    elif key_status == "Uid":
                        if value_parts_status:
                            proc_info["user_name"] = get_username_from_uid(
                                value_str_status
                            )
                            try:
                                proc_info["uid"] = int(value_parts_status[0])
                            except ValueError:
                                proc_info["uid"] = -1

                    # métricas de memória
                    elif key_status == "Threads":
                        proc_info["threads"] = current_field_int_value
                    elif key_status == "VmPeak":
                        proc_info["memory_details_kb"]["vm_peak"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmSize":
                        proc_info["memory_details_kb"]["vms"] = current_field_int_value
                    elif key_status == "VmLck":
                        proc_info["memory_details_kb"]["vm_lck_kb"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmPin":
                        proc_info["memory_details_kb"]["vm_pin_kb"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmHWM":
                        proc_info["memory_details_kb"]["vm_hwm_kb"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmRSS":
                        proc_info["memory_details_kb"]["rss"] = current_field_int_value
                    elif key_status == "RssAnon":
                        proc_info["memory_details_kb"]["rss_anon_kb"] = (
                            current_field_int_value
                        )
                    elif key_status == "RssFile":
                        proc_info["memory_details_kb"]["rss_file_kb"] = (
                            current_field_int_value
                        )
                    elif key_status == "RssShmem":
                        proc_info["memory_details_kb"]["rss_shmem_kb"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmData":
                        proc_info["memory_details_kb"]["data"] = current_field_int_value
                    elif key_status == "VmStk":
                        proc_info["memory_details_kb"]["stack"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmExe":
                        proc_info["memory_details_kb"]["code"] = current_field_int_value
                    elif key_status == "VmLib":
                        proc_info["memory_details_kb"]["shared"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmPTE":
                        proc_info["memory_details_kb"]["page_tables"] = (
                            current_field_int_value
                        )
                    elif key_status == "VmSwap":
                        proc_info["memory_details_kb"]["swap"] = current_field_int_value

            # lê cmdline (fallback para nome)
            try:
                with open(f"/proc/{pid_int_current}/cmdline", "rb") as cmd_f:
                    cmd_str_bytes = cmd_f.read().replace(b"\x00", b" ").strip()
                    cmd_str_decoded = cmd_str_bytes.decode("utf-8", "replace")
                    proc_info["command_line"] = (
                        cmd_str_decoded or f"[{proc_info.get('name', 'unknown')}]"
                    )
            except Exception:
                proc_info["command_line"] = f"[{proc_info.get('name', 'unknown')}]"

            # lê caminho do executável
            try:
                proc_info["executable_path"] = os.readlink(
                    f"/proc/{pid_int_current}/exe"
                )
            except (FileNotFoundError, PermissionError, OSError):
                proc_info["executable_path"] = None

            # lê rss de /statm (fallback: VmRSS)
            try:
                with open(f"/proc/{pid_int_current}/statm", "r") as statm_f:
                    rss_pages = int(statm_f.read().split()[1])
                    page_size_bytes = os.sysconf("SC_PAGE_SIZE")
                    proc_info["memory_rss_mb"] = round(
                        rss_pages * (page_size_bytes / (1024**2)), 1
                    )
            except (FileNotFoundError, IndexError, ValueError, OSError):
                if (
                    proc_info["memory_details_kb"].get("rss", 0) > 0
                    and proc_info["memory_rss_mb"] == 0.0
                ):
                    proc_info["memory_rss_mb"] = round(
                        proc_info["memory_details_kb"]["rss"] / 1024, 1
                    )

            # lê /proc/<pid>/stat para cpu e prioridade
            with open(f"/proc/{pid_int_current}/stat", "r") as stat_f_p:
                stat_parts_list = stat_f_p.read().split()
                if len(stat_parts_list) > 21:
                    utime_jiffies, stime_jiffies = (
                        int(stat_parts_list[13]),
                        int(stat_parts_list[14]),
                    )
                    proc_info["priority"], proc_info["nice"] = (
                        int(stat_parts_list[17]),
                        int(stat_parts_list[18]),
                    )
                    current_total_jiffies_proc = utime_jiffies + stime_jiffies
                    current_timestamp_sec = time.time()
                    current_process_cpu_snapshot[pid_int_current] = {
                        "active_jiffies": current_total_jiffies_proc,
                        "timestamp": current_timestamp_sec,
                    }

                    # calcula % de cpu se houver histórico
                    if pid_int_current in previous_process_cpu_times:
                        prev_snapshot_proc = previous_process_cpu_times[pid_int_current]
                        delta_time_seconds = (
                            current_timestamp_sec - prev_snapshot_proc["timestamp"]
                        )
                        delta_jiffies_proc = (
                            current_total_jiffies_proc
                            - prev_snapshot_proc["active_jiffies"]
                        )

                        if delta_time_seconds > 0:
                            cpu_usage_raw = (
                                (delta_jiffies_proc / hertz)
                                / delta_time_seconds
                                * 100.0
                            )
                            num_system_cores = os.cpu_count() or 1
                            proc_info["cpu_percent"] = round(
                                max(0.0, min(cpu_usage_raw, 100.0 * num_system_cores)),
                                1,
                            )

                    # define criação do processo
                    proc_info["create_time_iso"] = get_process_creation_time_iso(
                        pid_int_current, hertz
                    )
                else:
                    proc_info["create_time_iso"] = None

            # coleta threads em /proc/<pid>/task
            task_dir_path_proc = f"/proc/{pid_int_current}/task"
            if os.path.isdir(task_dir_path_proc):
                for tid_str_val in os.listdir(task_dir_path_proc):
                    if tid_str_val.isdigit():
                        proc_info["threads_detailed_info"].append(
                            get_thread_details(pid_int_current, tid_str_val)
                        )

            # adiciona à lista final
            processes_list_result.append(proc_info)

        except (FileNotFoundError, IndexError, ValueError, OSError, PermissionError):
            continue

    # atualiza snapshot global de cpu dos processos
    previous_process_cpu_times = current_process_cpu_snapshot
    return processes_list_result


# ---------------------------------------------------------------------------------------------------------------------------------


# obtém uso de memória (ram e swap)
def get_memory_usage():
    # dicionários temporários
    mem_raw_data, swap_raw_data = {}, {}

    # valores padrão
    default_ram_data = {
        "total_gb": 0.0,
        "used_gb": 0.0,
        "free_gb": 0.0,
        "usage_percent": 0.0,
        "free_percent": 100.0,
    }
    default_swap_data = {
        "total_gb": 0.0,
        "used_gb": 0.0,
        "free_gb": 0.0,
        "usage_percent": 0.0,
        "free_percent": 0.0,
    }

    try:
        with open("/proc/meminfo", "r") as f_meminfo_sys:
            for line_meminfo_sys in f_meminfo_sys:
                parts_meminfo_sys = line_meminfo_sys.split(":")
                if len(parts_meminfo_sys) == 2:
                    key_meminfo_sys = parts_meminfo_sys[0].strip()
                    val_str_meminfo_sys = (
                        parts_meminfo_sys[1].strip().split()[0]
                        if parts_meminfo_sys[1].strip()
                        else "0"
                    )
                    val_kb_sys = int(val_str_meminfo_sys)

                    if key_meminfo_sys in [
                        "MemTotal",
                        "MemFree",
                        "MemAvailable",
                        "Buffers",
                        "Cached",
                        "SReclaimable",
                    ]:
                        mem_raw_data[key_meminfo_sys] = val_kb_sys
                    elif key_meminfo_sys in ["SwapTotal", "SwapFree"]:
                        swap_raw_data[key_meminfo_sys] = val_kb_sys

        # totais e disponíveis
        ram_total_kb_sys = mem_raw_data.get("MemTotal", 0)
        ram_available_kb_sys = mem_raw_data.get(
            "MemAvailable",
            mem_raw_data.get("MemFree", 0)
            + mem_raw_data.get("Buffers", 0)
            + mem_raw_data.get("Cached", 0)
            - mem_raw_data.get("SReclaimable", 0),
        )

        # corrige negativos
        if ram_available_kb_sys < 0:
            ram_available_kb_sys = mem_raw_data.get("MemFree", 0)

        # usados e percentuais
        ram_used_kb_sys = ram_total_kb_sys - ram_available_kb_sys
        ram_percent_usage = (
            (ram_used_kb_sys / ram_total_kb_sys * 100) if ram_total_kb_sys > 0 else 0.0
        )
        ram_percent_free = (
            100.0 - ram_percent_usage
            if ram_total_kb_sys > 0
            else (100.0 if ram_total_kb_sys == 0 and ram_available_kb_sys == 0 else 0.0)
        )

        # swap
        swap_total_kb_sys = swap_raw_data.get("SwapTotal", 0)
        swap_free_kb_sys = swap_raw_data.get("SwapFree", 0)
        swap_used_kb_sys = swap_total_kb_sys - swap_free_kb_sys
        swap_percent_usage = (
            (swap_used_kb_sys / swap_total_kb_sys * 100)
            if swap_total_kb_sys > 0
            else 0.0
        )
        swap_percent_free = 100.0 - swap_percent_usage if swap_total_kb_sys > 0 else 0.0

        # formata ram em gb
        ram_data_to_return = {
            "total_gb": round(ram_total_kb_sys / (1024**2), 2),
            "used_gb": round(ram_used_kb_sys / (1024**2), 2),
            "free_gb": round(ram_available_kb_sys / (1024**2), 2),
            "usage_percent": round(ram_percent_usage, 1),
            "free_percent": round(ram_percent_free, 1),
        }

        # formata swap em gb
        swap_data_to_return = {
            "total_gb": round(swap_total_kb_sys / (1024**2), 2),
            "used_gb": round(swap_used_kb_sys / (1024**2), 2),
            "free_gb": round(swap_free_kb_sys / (1024**2), 2),
            "usage_percent": round(swap_percent_usage, 1),
            "free_percent": round(swap_percent_free, 1),
        }

        return {"ram": ram_data_to_return, "swap": swap_data_to_return}

    # erro: retorna padrão
    except Exception as e_mem_sys:
        print(f"Erro ao ler informações de memória do sistema: {e_mem_sys}")
        return {"ram": default_ram_data, "swap": default_swap_data}


# ---------------------------------------------------------------------------------------------------------------------------------


# obtém uso de cpu (geral e por núcleo)
def get_cpu_usage():
    global previous_overall_cpu_times, previous_per_core_cpu_times

    # saída padrão
    cpu_stats_return = {
        "overall_usage_percent": 0.0,
        "overall_idle_percent": 100.0,
        "number_of_cores": 0,
        "cores": [],
    }

    # snapshot atual por núcleo
    current_core_times_snapshot_sys = {}

    try:
        # lê /proc/stat
        with open("/proc/stat", "r") as f_stat_cpu_sys:
            lines_stat_cpu_sys = f_stat_cpu_sys.readlines()

        # agrega geral
        parts_overall_sys = list(map(int, lines_stat_cpu_sys[0].strip().split()[1:]))
        idle_all_jiffies_sys = parts_overall_sys[3] + (
            parts_overall_sys[4] if len(parts_overall_sys) > 4 else 0
        )
        total_all_jiffies_sys = sum(parts_overall_sys)

        # calcula deltas para % geral
        if previous_overall_cpu_times:
            delta_total_jiffies_sys = (
                total_all_jiffies_sys - previous_overall_cpu_times["total"]
            )
            delta_idle_jiffies_sys = (
                idle_all_jiffies_sys - previous_overall_cpu_times["idle"]
            )
            if delta_total_jiffies_sys > 0:
                cpu_stats_return["overall_usage_percent"] = round(
                    (1.0 - delta_idle_jiffies_sys / delta_total_jiffies_sys) * 100.0, 1
                )
                cpu_stats_return["overall_idle_percent"] = round(
                    (delta_idle_jiffies_sys / delta_total_jiffies_sys) * 100.0, 1
                )

        # atualiza histórico geral
        previous_overall_cpu_times = {
            "total": total_all_jiffies_sys,
            "idle": idle_all_jiffies_sys,
        }

        # limita entre 0 e 100
        cpu_stats_return["overall_usage_percent"] = max(
            0.0, min(cpu_stats_return["overall_usage_percent"], 100.0)
        )
        cpu_stats_return["overall_idle_percent"] = max(
            0.0, min(cpu_stats_return["overall_idle_percent"], 100.0)
        )

        # linhas por núcleo
        core_stat_lines_sys = [
            ln_core
            for ln_core in lines_stat_cpu_sys
            if ln_core.startswith("cpu") and ln_core[3].isdigit()
        ]
        cpu_stats_return["number_of_cores"] = len(core_stat_lines_sys)

        # itera núcleos
        for i_core_sys, line_core_stat_sys in enumerate(core_stat_lines_sys):
            core_id_str_val_sys = f"cpu{i_core_sys}"
            parts_core_stat_sys = list(map(int, line_core_stat_sys.strip().split()[1:]))
            idle_core_jiffies_sys = parts_core_stat_sys[3] + (
                parts_core_stat_sys[4] if len(parts_core_stat_sys) > 4 else 0
            )
            total_core_jiffies_sys = sum(parts_core_stat_sys)

            # snapshot atual do núcleo
            current_core_times_snapshot_sys[core_id_str_val_sys] = {
                "total": total_core_jiffies_sys,
                "idle": idle_core_jiffies_sys,
            }

            usage_core_pc_val_sys = 0.0
            if core_id_str_val_sys in previous_per_core_cpu_times:
                prev_core_times_sys = previous_per_core_cpu_times[core_id_str_val_sys]
                delta_total_core_jiffies_sys = (
                    total_core_jiffies_sys - prev_core_times_sys["total"]
                )
                delta_idle_core_jiffies_sys = (
                    idle_core_jiffies_sys - prev_core_times_sys["idle"]
                )
                if delta_total_core_jiffies_sys > 0:
                    usage_core_pc_val_sys = (
                        1.0 - delta_idle_core_jiffies_sys / delta_total_core_jiffies_sys
                    ) * 100.0

            # adiciona núcleo à saída
            cpu_stats_return["cores"].append(
                {
                    "id": i_core_sys,
                    "name": f"Core {i_core_sys}",
                    "usage_percent": round(
                        max(0.0, min(usage_core_pc_val_sys, 100.0)), 1
                    ),
                }
            )

        # atualiza histórico por núcleo
        previous_per_core_cpu_times = current_core_times_snapshot_sys

        print("Sucesso ao ler informações de CPU do sistema.")
        return cpu_stats_return

    except Exception as e_cpu_sys:
        print(f"Erro ao ler informações de CPU do sistema: {e_cpu_sys}")
        num_cores_fallback_sys = os.cpu_count() or 1
        # retorno padrão em erro
        return {
            "overall_usage_percent": 0.0,
            "overall_idle_percent": 100.0,
            "number_of_cores": num_cores_fallback_sys,
            "cores": [
                {"id": i_fb_sys, "name": f"Core {i_fb_sys}", "usage_percent": 0.0}
                for i_fb_sys in range(num_cores_fallback_sys)
            ],
        }


# ---------------------------------------------------------------------------------------------------------------------------------
# projeto b - dados de e/s dos processos
# ---------------------------------------------------------------------------------------------------------------------------------


# obtém informações do sistema de arquivos
def get_filesystem_info():
    mounts = []  # lista de pontos de montagem

    # lê /proc/mounts
    try:
        with open("/proc/mounts", "r") as f:
            for line in f:
                parts = line.split()
                if len(parts) < 4:
                    continue

                device, mountpoint, fstype = parts[0], parts[1], parts[2]

                # ignora fs virtuais
                if fstype in ("proc", "sysfs", "devpts", "tmpfs", "cgroup"):
                    continue

                try:
                    stat = os.statvfs(mountpoint)
                    total = stat.f_blocks * stat.f_frsize
                    free = stat.f_bfree * stat.f_frsize
                    used = total - free

                    mounts.append(
                        {
                            "device": device,
                            "mountpoint": mountpoint,
                            "type": fstype,
                            "total_gb": round(total / (1024**3), 2),
                            "used_gb": round(used / (1024**3), 2),
                            "free_gb": round(free / (1024**3), 2),
                            "usage_percent": round(used / total * 100, 2)
                            if total > 0
                            else 0,
                        }
                    )
                except Exception:
                    continue
    except Exception as e:
        print(f"Erro ao ler informações do sistema de arquivos: {e}")

    return mounts


# --------------------------------------------------------------------------------------------------------------------------


# lista conteúdo de um diretório
def get_directory_contents(path="/"):
    contents = []  # itens do diretório

    try:
        # normaliza caminho
        if not os.path.isabs(path):
            path = os.path.abspath(path)

        # percorre entradas
        for entry in os.listdir(path):
            full_path = os.path.join(path, entry)

            try:
                stat = os.stat(full_path)
                contents.append(
                    {
                        "name": entry,
                        "path": full_path,
                        "is_dir": os.path.isdir(full_path),
                        "size_bytes": stat.st_size,
                        "size_human": _bytes_to_human(stat.st_size),
                        "modified_time": datetime.datetime.fromtimestamp(
                            stat.st_mtime
                        ).isoformat(),
                        "permissions": oct(stat.st_mode & 0o777),
                        "owner": get_username_from_uid(stat.st_uid),
                        "group": get_username_from_uid(stat.st_gid),
                    }
                )
            except Exception:
                continue

    except Exception as e:
        print(f"Erro ao listar diretório {path}: {e}")

    return {"path": path, "contents": contents}


# --------------------------------------------------------------------------------------------------------------------------


# converte bytes para formato legível
def _bytes_to_human(size):
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"


# --------------------------------------------------------------------------------------------------------------------------


# obtém estatísticas de e/s do processo
def get_process_es_info(pid):
    es_stats = {}  # dicionário de métricas

    # lê /proc/<pid>/io
    try:
        with open(f"/proc/{pid}/io", "r") as f:
            for line in f:
                key, value = line.split(":", 1)
                key = key.strip().lower()
                if key in [
                    "rchar",
                    "wchar",
                    "read_bytes",
                    "write_bytes",
                    "syscr",
                    "syscw",
                    "cancelled_write_bytes",
                ]:
                    try:
                        es_stats[key] = int(value.strip())
                    except ValueError:
                        continue
    except FileNotFoundError:
        print(f"Processo {pid} não encontrado ou terminou")
    except PermissionError:
        print(f"Permissão negada para acessar estatísticas do processo {pid}")
    except Exception as e:
        print(f"Erro ao ler E/S do processo {pid}: {str(e)}")

    return es_stats


# --------------------------------------------------------------------------------------------------------------------------


# lista arquivos abertos por um processo
def get_process_open_files(pid):
    open_files = []  # lista de fds

    try:
        fd_dir = f"/proc/{pid}/fd"
        for fd in os.listdir(fd_dir):
            try:
                fd_path = os.path.join(fd_dir, fd)
                target = os.readlink(fd_path)
                open_files.append(
                    {"fd": fd, "path": target, "type": _get_file_type(fd_path)}
                )
            except Exception:
                continue
    except Exception:
        pass

    return open_files


# --------------------------------------------------------------------------------------------------------------------------


# determina tipo de arquivo de um fd
def _get_file_type(fd_path):
    try:
        mode = os.stat(fd_path).st_mode  # consulta metadados (não usado diretamente)
        if os.path.isdir(fd_path):
            return "directory"
        elif os.path.isfile(fd_path):
            return "file"
        elif os.path.islink(fd_path):
            return "symlink"
        elif os.path.ismount(fd_path):
            return "mount"
        else:
            return "special"
    except Exception:
        return "unknown"
