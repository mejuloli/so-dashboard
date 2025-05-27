// so-dashboard/front-end/src/data/mockData.js

// Esta função pode ser usada para adicionar detalhes mockados a processos
// se o endpoint /api/processes do backend não fornecer todos os campos necessários
// para a tabela (ex: user_name, status, se não vierem do backend).
// Se o backend já fornece tudo, esta função pode não ser necessária.
export const mockAdditionalProcessDetails = (pid) => {
    // const statuses = ['rodando', 'dormindo', 'zumbi', 'parado', 'inativo'];
    return {
        // Exemplo:
        // user_name: `user_${parseInt(pid) % 5}`, // Se o backend não fornecer user_name
        // status: statuses[Math.floor(Math.random() * statuses.length)], // Se o backend não fornecer status
        // cpu_percent_process: parseFloat((Math.random() * 10).toFixed(1)), // Se o backend não fornecer
        // memory_percent_process: parseFloat((Math.random() * 5).toFixed(1)), // Se o backend não fornecer
    };
};