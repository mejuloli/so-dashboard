from flask import Flask, jsonify, request # Importa classes do Flask.
from flask_cors import CORS # Para permitir requisições Cross-Origin (do frontend).
from controller import Controller # Importa a classe Controller.

# Cria uma instância da aplicação Flask.
# Este é o objeto principal que gerencia as rotas e a execução do servidor web.
app_flask_instance = Flask(__name__)

# Habilita CORS (Cross-Origin Resource Sharing) para a aplicação Flask.
# Isso é crucial para permitir que o frontend React (que normalmente roda em uma porta diferente,
# ex: localhost:3000) possa fazer requisições para esta API backend (ex: localhost:5000)
# sem ser bloqueado pelas políticas de segurança do navegador (Same-Origin Policy).
CORS(app_flask_instance) 

# Cria uma instância do Controller.
# O Controller é responsável por intermediar as requisições da API e a lógica de dados (model),
# além de gerenciar o cache de dados do sistema.
app_api_controller = Controller()

# Inicia a thread de atualização periódica do cache de dados no Controller.
# Esta chamada garante que o cache seja populado e atualizado em background
# assim que a aplicação Flask é iniciada.
app_api_controller.start_periodic_cache_update_thread() 

# --- Definição dos Endpoints da API ---
# Cada função abaixo decorada com @app_flask_instance.route(...) define um endpoint da API.

@app_flask_instance.route('/api/processes')
def handle_api_get_processes():
    """
    Endpoint da API para obter a lista de processos do sistema.
    Os dados são lidos do cache mantido pelo Controller.
    Aceita um parâmetro query opcional 'limit' (inteiro) para restringir o número
    de processos retornados na resposta.
    Exemplo de chamada: GET /api/processes?limit=10

    Retorna:
      JSON: Uma resposta JSON contendo uma lista de objetos, onde cada objeto
            representa um processo com seus detalhes.
    """
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

@app_flask_instance.route('/api/process/<int:pid_param>')
def handle_api_get_specific_process(pid_param):
    """
    Endpoint da API para obter informações detalhadas de um processo específico,
    identificado pelo seu PID. Os dados são lidos do cache.
    
    Parâmetros URL:
      pid_param (int): O ID do processo (PID) passado como parte da URL.
                       Exemplo de chamada: GET /api/process/1234

    Retorna:
      JSON: Um objeto JSON com os detalhes do processo, se encontrado.
            Retorna um erro 404 (Not Found) se o processo com o PID especificado
            não for encontrado no cache.
    """
    # Busca o processo específico no cache através do Controller.
    process_detail_data = app_api_controller.get_specific_process_info_from_cache(pid_param)
    
    if process_detail_data:
        return jsonify(process_detail_data) # Retorna os dados do processo.
    else:
        # Retorna uma resposta de erro 404 se o processo não for encontrado.
        return jsonify({"error": f"Processo com PID {pid_param} não encontrado."}), 404

@app_flask_instance.route('/api/memory')
def handle_api_get_memory():
    """
    Endpoint da API para obter informações de uso de memória (RAM e SWAP) do sistema.
    Os dados são lidos do cache mantido pelo Controller.
    Exemplo de chamada: GET /api/memory

    Retorna:
      JSON: Um objeto JSON contendo detalhes do uso da memória RAM e SWAP.
    """
    # Obtém os dados de memória do cache através do Controller.
    memory_usage_data = app_api_controller.get_system_memory_info_from_cache()
    return jsonify(memory_usage_data)

@app_flask_instance.route('/api/cpu')
def handle_api_get_cpu():
    """
    Endpoint da API para obter informações de uso da CPU do sistema.
    Inclui uso geral, uso por core, e contagens totais de processos e threads.
    Os dados são lidos do cache mantido pelo Controller.
    Exemplo de chamada: GET /api/cpu

    Retorna:
      JSON: Um objeto JSON contendo detalhes do uso da CPU.
    """
    # Obtém os dados da CPU do cache através do Controller.
    cpu_usage_data = app_api_controller.get_system_cpu_info_from_cache() 
    return jsonify(cpu_usage_data)

@app_flask_instance.route('/')
def handle_api_root():
    """
    Rota raiz ("/") da API. Retorna uma mensagem simples para indicar que a API
    está em execução e acessível. O frontend React é tipicamente servido
    separadamente em seu próprio servidor de desenvolvimento ou build estático.
    """
    return "API do Dashboard de Sistema Operacional está em execução. Consulte os endpoints /api/..."

# Bloco principal: Executado apenas quando o script main.py é rodado diretamente.
if __name__ == "__main__":
    print(f"Iniciando servidor Flask backend em http://0.0.0.0:5000")
    
    # Inicia o servidor de desenvolvimento do Flask.
    # host='0.0.0.0': Faz o servidor escutar em todas as interfaces de rede disponíveis,
    #                 permitindo acesso de outros dispositivos na mesma rede.
    # port=5000: Define a porta em que o servidor irá escutar.
    # debug=True: Ativa o modo de depuração do Flask. Isso fornece mensagens de erro
    #             detalhadas no navegador e reinicia o servidor automaticamente
    #             quando alterações no código são detectadas (auto-reloader).
    #             **NÃO USAR `debug=True` EM AMBIENTE DE PRODUÇÃO.**
    # use_reloader=False: Desativa o auto-reloader do Flask. Isso é importante
    #                     quando se gerencia threads próprias (como a thread de atualização
    #                     do cache no Controller) no modo de depuração, para evitar que
    #                     a thread seja iniciada múltiplas vezes ou se comporte de forma
    #                     inesperada devido aos reinícios do reloader.
    #                     Para produção, um servidor WSGI (ex: Gunicorn, uWSGI) seria usado.
    app_flask_instance.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)