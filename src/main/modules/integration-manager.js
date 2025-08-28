// /src/main/modules/integration-manager.js (VERSÃO FINAL DINÂMICA)

const fetch = require('node-fetch');

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';
const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1';

const integrationManager = {
    clickup: {
        getTask: async (taskId, apiKey) => {
            if (!taskId || !apiKey) {
                throw new Error("ID da tarefa e chave de API são obrigatórios.");
            }
            const url = `${CLICKUP_API_BASE}/task/${taskId}`;
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' }
                });
                if (response.status === 404) {
                    return null;
                }
                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Erro na API do ClickUp: ${response.status} - ${errorBody}`);
                }
                const taskData = await response.json();
                return {
                    id: taskData.id,
                    name: taskData.name,
                    description: taskData.description || taskData.text_content || '',
                    url: taskData.url,
                    status: taskData.status.status,
                    project: taskData.project,
                    list: taskData.list,
                    folder: taskData.folder,
                    space: taskData.space
                };
            } catch (error) {
                console.error("[IntegrationManager] Erro ao buscar tarefa do ClickUp:", error);
                throw error;
            }
        },

        addComment: async (taskId, commentText, apiKey) => {
            if (!taskId || !commentText || !apiKey) {
                throw new Error("ID da tarefa, texto do comentário e chave de API são obrigatórios.");
            }
            const url = `${CLICKUP_API_BASE}/task/${taskId}/comment`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comment_text: commentText, notify_all: true })
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Erro ao postar comentário no ClickUp: ${response.status} - ${errorBody}`);
                }
                return { success: true, data: await response.json() };
            } catch (error) {
                console.error("[IntegrationManager] Falha ao adicionar comentário no ClickUp:", error);
                throw error;
            }
        },

        // --- INÍCIO DA ALTERAÇÃO ---
        addTimeEntry: async (taskId, timeEntry, apiKey, teamId) => {
            // O teamId agora é recebido como um parâmetro
            if (!taskId || !timeEntry || !apiKey || !teamId) {
                throw new Error("ID da tarefa, dados de tempo, chave de API e Team ID são obrigatórios.");
            }
            
            const url = `${CLICKUP_API_BASE}/team/${teamId}/time_entries`;
            
            const startDateTime = new Date(`${timeEntry.date}T${timeEntry.startTime}:00`);
            const endDateTime = new Date(`${timeEntry.date}T${timeEntry.endTime}:00`);
            
            if (isNaN(startDateTime) || isNaN(endDateTime) || endDateTime <= startDateTime) {
                throw new Error("Datas ou horários inválidos. O horário final deve ser maior que o inicial.");
            }

            const payload = {
                description: "",
                billable: true,
                start: startDateTime.getTime(),
                end: endDateTime.getTime(), // Corrigido de 'stop' para 'end'
                tid: taskId
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error("ClickUp API Error Body:", errorBody);
                    throw new Error(`Erro ao registrar tempo no ClickUp: ${response.status} - ${errorBody}`);
                }
                const responseData = await response.json();
                return { success: true, data: responseData.data };
            } catch (error) {
                console.error("[IntegrationManager] Falha ao adicionar entrada de tempo no ClickUp:", error);
                throw error;
            }
        }
        // --- FIM DA ALTERAÇÃO ---
    },
    clockify: {
        getProjects: async (workspaceId, apiKey) => {
            if (!workspaceId || !apiKey) throw new Error("Workspace ID e API Key são obrigatórios.");
            const url = `${CLOCKIFY_API_BASE}/workspaces/${workspaceId}/projects`;
            try {
                const response = await fetch(url, { headers: { 'X-Api-Key': apiKey } });
                if (!response.ok) throw new Error(`Erro na API do Clockify (getProjects): ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error("[IntegrationManager][Clockify] Falha ao buscar projetos:", error);
                throw error;
            }
        },

        getTasksForProject: async (workspaceId, projectId, apiKey) => {
            if (!workspaceId || !projectId || !apiKey) throw new Error("Workspace ID, Project ID e API Key são obrigatórios.");
            const url = `${CLOCKIFY_API_BASE}/workspaces/${workspaceId}/projects/${projectId}/tasks`;
            try {
                const response = await fetch(url, { headers: { 'X-Api-Key': apiKey } });
                if (!response.ok) throw new Error(`Erro na API do Clockify (getTasksForProject): ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error("[IntegrationManager][Clockify] Falha ao buscar tasks do projeto:", error);
                throw error;
            }
        },

        getCustomFieldsForProject: async (workspaceId, projectId, apiKey) => {
            if (!workspaceId || !projectId || !apiKey) throw new Error("Workspace ID, Project ID e API Key são obrigatórios.");
            const url = `${CLOCKIFY_API_BASE}/workspaces/${workspaceId}/projects/${projectId}/custom-fields`;
            try {
                const response = await fetch(url, { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' } });
                if (!response.ok) throw new Error(`Erro na API do Clockify (getCustomFieldsForProject): ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error("[IntegrationManager][Clockify] Falha ao buscar custom fields do projeto:", error);
                throw error;
            }
        },

        addTimeEntry: async (workspaceId, entryData, apiKey) => {
            if (!workspaceId || !entryData || !apiKey) throw new Error("Dados da entrada, Workspace ID e API Key são obrigatórios.");
            
            const { start, end, description, projectId, taskId, customFieldId, clickupTaskUrl } = entryData;
            if (!start || !end || !projectId || !taskId || !customFieldId || !clickupTaskUrl) {
                throw new Error("Todos os campos de entryData são obrigatórios para o Clockify.");
            }

            const url = `${CLOCKIFY_API_BASE}/workspaces/${workspaceId}/time-entries`;
            
            const payload = {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                description: description,
                projectId: projectId,
                taskId: taskId,
                billable: true,
                customFields: [{
                    customFieldId: customFieldId,
                    value: clickupTaskUrl
                }]
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error("[IntegrationManager][Clockify] Error Body:", errorBody);
                    throw new Error(`Erro ao registrar tempo no Clockify: ${response.status} - ${errorBody}`);
                }
                return { success: true, data: await response.json() };
            } catch (error) {
                console.error("[IntegrationManager][Clockify] Falha ao adicionar entrada de tempo:", error);
                throw error;
            }
        }
    }
};

module.exports = integrationManager;