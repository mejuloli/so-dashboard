from flask import Flask, jsonify, request
from flask_cors import CORS
from controller import Controller

app = Flask(__name__)
CORS(app) 

controller = Controller()
# controller.start_periodic_update_cache() # Descomente para usar o cache

@app.route('/api/processes')
def api_processes():
    limit_str = request.args.get('limit', default=None)
    limit = int(limit_str) if limit_str and limit_str.isdigit() else None
    
    processes_data = controller.get_all_processes_info()
    if limit and limit > 0:
        return jsonify(processes_data[:limit])
    return jsonify(processes_data)

@app.route('/api/memory')
def api_memory():
    memory_data = controller.get_system_memory_info()
    return jsonify(memory_data)

@app.route('/api/cpu')
def api_cpu():
    cpu_data = controller.get_system_cpu_info()
    return jsonify(cpu_data)

if __name__ == "__main__":
    print(f"Iniciando servidor Flask backend em http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)