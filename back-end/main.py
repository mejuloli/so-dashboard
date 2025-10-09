from flask import Flask, jsonify, request
from flask_cors import CORS
from controller import Controller

# instancia a aplicação flask
app_flask_instance = Flask(__name__)

# habilita o cors para permitir requisições externas
CORS(app_flask_instance)

# cria a instância do controller
app_api_controller = Controller()

# inicia a thread de atualização periódica
app_api_controller.start_periodic_cache_update_thread()

# ---------------------------------------------------------------------------------------------------------------------------------
# projeto a - funcionalidade inicial do dashboard
# ---------------------------------------------------------------------------------------------------------------------------------


# rota que retorna a lista de processos em execução
@app_flask_instance.route("/api/processes")
def handle_api_get_processes():
    # lê o parâmetro 'limit' da url
    limit_param_str_val = request.args.get("limit", default=None)
    limit_int_val = None

    # converte o valor se for um número válido
    if limit_param_str_val and limit_param_str_val.isdigit():
        limit_int_val = int(limit_param_str_val)
        if limit_int_val <= 0:
            limit_int_val = None

    # obtém a lista de processos do cache
    processes_data_list = app_api_controller.get_all_processes_info_from_cache()

    # aplica o limite se definido
    if limit_int_val is not None and limit_int_val > 0:
        return jsonify(processes_data_list[:limit_int_val])
    return jsonify(processes_data_list)


# ---------------------------------------------------------------------------------------------------------------------------------


# rota que retorna informações de um processo específico
@app_flask_instance.route("/api/process/<int:pid_param>")
def handle_api_get_specific_process(pid_param):
    # busca os dados do processo pelo pid
    process_detail_data = app_api_controller.get_specific_process_info_from_cache(
        pid_param
    )

    # retorna os dados ou erro se não encontrado
    if process_detail_data:
        return jsonify(process_detail_data)
    else:
        return jsonify({"error": f"processo com pid {pid_param} não encontrado"}), 404


# ---------------------------------------------------------------------------------------------------------------------------------


# rota que retorna informações de uso de memória
@app_flask_instance.route("/api/memory")
def handle_api_get_memory():
    # obtém os dados de memória do cache
    memory_usage_data = app_api_controller.get_system_memory_info_from_cache()
    return jsonify(memory_usage_data)


# ---------------------------------------------------------------------------------------------------------------------------------


# rota que retorna informações de uso de cpu
@app_flask_instance.route("/api/cpu")
def handle_api_get_cpu():
    # obtém os dados de cpu do cache
    cpu_usage_data = app_api_controller.get_system_cpu_info_from_cache()
    return jsonify(cpu_usage_data)


# ---------------------------------------------------------------------------------------------------------------------------------
# projeto b - dados de e/s dos processos
# ---------------------------------------------------------------------------------------------------------------------------------


# rota que retorna informações do sistema de arquivos
@app_flask_instance.route("/api/filesystem")
def handle_api_get_filesystem():
    # obtém os dados do sistema de arquivos
    return jsonify(app_api_controller.get_filesystem_info_from_cache())


# ---------------------------------------------------------------------------------------------------------------------------------


# rota que retorna o conteúdo de um diretório
@app_flask_instance.route("/api/filesystem/directory")
def handle_api_get_directory():
    # lê o parâmetro 'path' (padrão é '/')
    path = request.args.get("path", default="/")

    # obtém os dados do diretório
    directory_data = app_api_controller.get_directory_contents(path)
    return jsonify(directory_data)


# ---------------------------------------------------------------------------------------------------------------------------------


# rota que retorna informações de e/s de um processo
@app_flask_instance.route("/api/process/<int:pid>/io")
def handle_api_get_process_io(pid):
    # obtém as informações de e/s pelo pid
    io_data = app_api_controller.get_process_io_info(pid)

    # retorna erro se não houver dados disponíveis
    if not io_data.get("io_stats") and not io_data.get("open_files"):
        return jsonify({"error": f"dados de e/s não disponíveis para pid {pid}"}), 404

    return jsonify(io_data)


# ---------------------------------------------------------------------------------------------------------------------------------


# rota raiz para verificar se a api está ativa
@app_flask_instance.route("/")
def handle_api_root():
    return "api do dashboard de sistema operacional está em execução. consulte /api/..."


# ---------------------------------------------------------------------------------------------------------------------------------

if __name__ == "__main__":
    # inicia o servidor flask
    print("iniciando servidor flask backend em http://0.0.0.0:5000")

    # executa sem modo debug e sem recarregamento automático
    app_flask_instance.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
