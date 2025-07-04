from flask import Flask, jsonify, request
from flask_cors import CORS
from controller import Controller

# istanciando a aplicação Flask
app_flask_instance = Flask(__name__)

# ativando o CORS para permitir requisições de outros domínios
CORS(app_flask_instance)

# criando uma instância do Controller
app_api_controller = Controller()

# iniciando a thread de atualização periódica
app_api_controller.start_periodic_cache_update_thread()

# ---------------------------------------------------------------------------------------------------------------------------------

""" PROJETO A - Implementação da Funcionalidade Inicial do Dashboard """

# definindo a rota da API que retornam a lista de processos em execução
@app_flask_instance.route('/api/processes')
def handle_api_get_processes():

    # obtém o parâmetro 'limit' da URL se fornecido, ou usa o valor padrão None
    limit_param_str_val = request.args.get('limit', default=None)
    limit_int_val = None
    
    # se o parâmetro 'limit' for fornecido e for um número inteiro positivo, converte para int
    if limit_param_str_val and limit_param_str_val.isdigit():
        limit_int_val = int(limit_param_str_val)
        if limit_int_val <= 0:
            limit_int_val = None
    
    # obtém a lista de processos do cache (dados coletados anteriormente)
    processes_data_list = app_api_controller.get_all_processes_info_from_cache()
    
    # se um limite válido for informado, retorna apenas os n primeiros processos
    if limit_int_val is not None and limit_int_val > 0:
        return jsonify(processes_data_list[:limit_int_val])
    return jsonify(processes_data_list)

# ---------------------------------------------------------------------------------------------------------------------------------

# definindo a rota da API que retornam informações específicas de um processo com base no PID
@app_flask_instance.route('/api/process/<int:pid_param>')
def handle_api_get_specific_process(pid_param):

    # busca no cache as informações do processo através do PID
    process_detail_data = app_api_controller.get_specific_process_info_from_cache(pid_param)
    
    # se o processo for encontrado, retorna os dados em formato JSON
    if process_detail_data:
        return jsonify(process_detail_data)
    else:
        return jsonify({"error": f"Processo com PID {pid_param} não encontrado."}), 404

# ---------------------------------------------------------------------------------------------------------------------------------

# definindo a rota da API que retornam informações de uso de memória do sistema
@app_flask_instance.route('/api/memory')
def handle_api_get_memory():

    # obtém as informações de uso de memória do sistema a partir do cache
    memory_usage_data = app_api_controller.get_system_memory_info_from_cache()
    return jsonify(memory_usage_data)

# ---------------------------------------------------------------------------------------------------------------------------------

# definindo a rota da API que retornam informações de uso de CPU do sistema
@app_flask_instance.route('/api/cpu')
def handle_api_get_cpu():

    # obtém as informações de uso de CPU do sistema a partir do cache
    cpu_usage_data = app_api_controller.get_system_cpu_info_from_cache()
    return jsonify(cpu_usage_data)

# ---------------------------------------------------------------------------------------------------------------------------------

""" PROJETO B - Mostrar dados do uso dos dispositivos de E/S pelos processos """

# definindo a rota da API que retornam informações do sistema de arquivos
@app_flask_instance.route('/api/filesystem')
def handle_api_get_filesystem():

    # obtém as informações do sistema de arquivos a partir do cache
    return jsonify(app_api_controller.get_filesystem_info_from_cache())

# ---------------------------------------------------------------------------------------------------------------------------------

# definindo a rota da API que retornam o conteúdo de um diretório específico
@app_flask_instance.route('/api/filesystem/directory')
def handle_api_get_directory():

    # obtém o parâmetro 'path' da URL, com valor padrão sendo a raiz do sistema
    path = request.args.get('path', default='/')
    
    # chama a função do controller para obter o conteúdo do diretório a partir do cache
    directory_data = app_api_controller.get_directory_contents(path)
    return jsonify(directory_data)

# ---------------------------------------------------------------------------------------------------------------------------------

# definindo a rota da API que retornam as estatísticas de E/S de um processo específico, identificado pelo PID
@app_flask_instance.route('/api/process/<int:pid>/io')
def handle_api_get_process_io(pid):

    # obtém as informações de E/S do processo a partir do cache usando o PID
    io_data = app_api_controller.get_process_io_info(pid)

    # se não houver dados de E/S ou arquivos abertos, retorna um erro 404
    if not io_data.get('io_stats') and not io_data.get('open_files'):
        return jsonify({"error": f"Dados de E/S não disponíveis para PID {pid}"}), 404
    
    return jsonify(io_data)

# ---------------------------------------------------------------------------------------------------------------------------------

# definindo a rota raiz / para verificar se a API está em execução
@app_flask_instance.route('/')
def handle_api_root():
    return "API do Dashboard de Sistema Operacional está em execução. Consulte os endpoints /api/..."

# ---------------------------------------------------------------------------------------------------------------------------------

if __name__ == "__main__":

    # iniciando o servidor Flask na porta 5000
    print(f"Iniciando servidor Flask backend em http://0.0.0.0:5000")

    # desabilitando o modo debug e o recarregamento automático para evitar problemas com threads
    app_flask_instance.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
