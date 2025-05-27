from flask import Flask, jsonify, render_template, request
from controller import Controller

# criando uma instância do Flask
app = Flask(__name__)

# criando uma instância do Controller
controller = Controller()

# endpoint para os processos
@app.route('/api/processes') # define a rota para acessar os processos
def api_processes():
    # obtém o parâmetro 'limit' da URL, se não for fornecido, usa o valor padrão de 20
    limit = request.args.get('limit', default=20, type=int)

    # obtém os dados de uso dos processos, converte em JSON e retorna
    processes_data = controller.get_processes(limit=limit)
    return jsonify(processes_data)

# endpoint para os dados de memória
@app.route('/api/memory') # define a rota para acessar os dados de memória
def api_memory():

    # obtém os dados de uso da memória, converte em JSON e retorna
    memory_data = controller.get_memory_usage()
    return jsonify(memory_data)

# endpoint para os dados da CPU
@app.route('/api/cpu') # define a rota para acessar os dados da CPU
def api_cpu():

    # obtém os dados de uso da CPU, converte em JSON e retorna
    cpu_data = controller.get_cpu_usage()
    return jsonify(cpu_data)

# rota principal que renderiza o template HTML
@app.route('/')
def dashboard():

    # obtém os dados iniciais de processos, memória e CPU
    processes = controller.get_processes(limit=20)
    memory = controller.get_memory_usage()
    cpu = controller.get_cpu_usage()

    # renderiza o template HTML com os dados obtidos
    return render_template('xxxx.html', processes=processes, memory=memory, cpu=cpu)


if __name__ == "__main__":
    
    # inicia o servidor Flask na porta 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
