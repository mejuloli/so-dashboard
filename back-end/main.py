from flask import Flask, jsonify, request # Importa classes do Flask.
from flask_cors import CORS # Para permitir requisições Cross-Origin (do frontend).
from controller import Controller # Importa a classe Controller.

# Cria uma instância da aplicação Flask
app_flask_instance = Flask(__name__)

# Habilita CORS (Cross-Origin Resource Sharing) para a aplicação Flask
CORS(app_flask_instance) 

# Cria uma instância do Controller
app_api_controller = Controller()

# Inicia a thread de atualização periódica do cache de dados no Controller
app_api_controller.start_periodic_cache_update_thread() 


# Endpoint da API para obter a lista de processos do sistema
@app_flask_instance.route('/api/processes')
def handle_api_get_processes():

    # Obtém o valor do parâmetro 'limit' da URL query string.
    # Se 'limit' não for fornecido, request.args.get retorna None.
    limit_param_str_val = request.args.get('limit', default=None)
    limit_int_val = None # Valor padrão para 'limit' (nenhum limite).
    
    # Converte o parâmetro 'limit' para inteiro, se for um dígito válido.
    if limit_param_str_val and limit_param_str_val.isdigit():
        limit_int_val = int(limit_param_str_val)
        if limit_int_val <= 0: # Trata 0 ou negativo como "sem limite".
            limit_int_val = None
    
    # Obtém a lista de processos do cache através do Controller.
    processes_data_list = app_api_controller.get_all_processes_info_from_cache() 
    
    # Se um limite válido foi especificado, fatia a lista de processos.
    if limit_int_val is not None and limit_int_val > 0:
        return jsonify(processes_data_list[:limit_int_val])
    # Caso contrário, retorna todos os processos.
    return jsonify(processes_data_list)

# Endpoint da API para obter informações detalhadas de um processo específico, identificado pelo PID. Os dados são lidos do cache
@app_flask_instance.route('/api/process/<int:pid_param>')
def handle_api_get_specific_process(pid_param):

    # Busca o processo específico no cache através do Controller.
    process_detail_data = app_api_controller.get_specific_process_info_from_cache(pid_param)
    
    if process_detail_data:
        return jsonify(process_detail_data) # Retorna os dados do processo.
    else:
        # Retorna uma resposta de erro 404 se o processo não for encontrado.
        return jsonify({"error": f"Processo com PID {pid_param} não encontrado."}), 404

# Endpoint da API para obter informações de uso de memória (RAM e SWAP) do sistema
@app_flask_instance.route('/api/memory')
def handle_api_get_memory():

    # Obtém os dados de memória do cache através do Controller.
    memory_usage_data = app_api_controller.get_system_memory_info_from_cache()
    return jsonify(memory_usage_data)

# Endpoint da API para obter informações de uso da CPU do sistema
@app_flask_instance.route('/api/cpu')
def handle_api_get_cpu():

    # Obtém os dados da CPU do cache através do Controller.
    cpu_usage_data = app_api_controller.get_system_cpu_info_from_cache() 
    return jsonify(cpu_usage_data)

"""
PROJETO B - Sistema de Arquivos e E/S de Processos
"""

# Endpoint para obter informações do sistema de arquivos
@app_flask_instance.route('/api/filesystem')
def handle_api_get_filesystem():
    return jsonify(app_api_controller.get_filesystem_info_from_cache())

# Endpoint para listar conteúdo de um diretório
@app_flask_instance.route('/api/filesystem/directory')
def handle_api_get_directory():
    path = request.args.get('path', default='/')
    return jsonify(app_api_controller.get_directory_contents_from_cache(path))

# Endpoint para obter estatísticas de E/S de um processo
@app_flask_instance.route('/api/process/<int:pid>/io')
def handle_api_get_process_io(pid):
    io_data = app_api_controller.get_process_io_info_from_cache(pid)
    if io_data:
        return jsonify(io_data)
    return jsonify({"error": "Dados de E/S não disponíveis"}), 404

# Rota raiz ("/") da API. Retorna uma mensagem simples para indicar que a API está em execução e acessível
@app_flask_instance.route('/')
def handle_api_root():
    return "API do Dashboard de Sistema Operacional está em execução. Consulte os endpoints /api/..."

# Bloco principal: Executado apenas quando o script main.py é rodado diretamente.
if __name__ == "__main__":

    print(f"Iniciando servidor Flask backend em http://0.0.0.0:5000")
    app_flask_instance.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
