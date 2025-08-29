// /src/main/modules/task-hub-manager.js (NOVO ARQUIVO)
const { ipcMain } = require('electron');
const dbManager = require('./database-manager.js');
const integrationManager = require('./integration-manager.js');

const TaskHubManager = {
    initialize() {
        // --- Handlers de Banco de Dados Local ---
        ipcMain.handle('task:get-companies', async () => {
            return await dbManager.taskHub.companies.list();
        });
        ipcMain.handle('task:add-company', async (event, companyData) => {
            return await dbManager.taskHub.companies.add(companyData);
        });
        ipcMain.handle('task:get-projects', async (event, companyId) => {
            return await dbManager.taskHub.projects.listByCompany(companyId);
        });
        ipcMain.handle('task:add-project', async (event, projectData) => {
            return await dbManager.taskHub.projects.add(projectData.name, projectData.companyId);
        });
        ipcMain.handle('task:add-task', async (event, taskData) => {
            return await dbManager.taskHub.tasks.add(taskData);
        });
        ipcMain.handle('task:get-tasks', async () => {
            return await dbManager.taskHub.tasks.list();
        });
        ipcMain.handle('task:getTaskById', async (event, taskId) => {
            return await dbManager.taskHub.tasks.getById(taskId);
        });
        ipcMain.handle('task:add-work-logs', async (event, { taskId, entries, documentation, flags }) => {
            for (const entry of entries) {
                await dbManager.taskHub.workLogs.add(taskId, documentation, entry.hours, entry.date, flags);
            }
        });
        ipcMain.handle('task:update-task', async (event, taskData) => {
            return await dbManager.taskHub.tasks.update(taskData);
        });
        ipcMain.handle('task:delete-task', async (event, taskId) => {
            return await dbManager.taskHub.tasks.delete(taskId);
        });
        ipcMain.handle('task:get-work-logs', async (event, taskId) => {
            return await dbManager.taskHub.workLogs.getForTask(taskId);
        });
        ipcMain.handle('gaia:get-games', async () => {
            return await dbManager.hobbie.listGames();
        });
        ipcMain.handle('gaia:get-game-logs', async () => {
            return await dbManager.hobbie.getGameLogs();
        });

        // --- Handlers de Integrações (ClickUp, Clockify) ---
        ipcMain.handle('task:getClickUpTask', async (event, taskId) => {
            const apiKey = await dbManager.settings.get('api_key_clickup');
            if (!apiKey) throw new Error("Chave de API do ClickUp não configurada.");
            return await integrationManager.clickup.getTask(taskId, apiKey);
        });

        ipcMain.handle('task:findOrCreateTaskFromClickUp', async (event, clickUpTaskId) => {
            const apiKey = await dbManager.settings.get('api_key_clickup');
            if (!apiKey) throw new Error("Chave de API do ClickUp não configurada.");
            
            const clickUpTaskData = await integrationManager.clickup.getTask(clickUpTaskId, apiKey);
            if (!clickUpTaskData) throw new Error(`Tarefa com ID "${clickUpTaskId}" não encontrada no ClickUp.`);

            let localTask = await dbManager.taskHub.tasks.findByClickUpUrl(clickUpTaskData.url);
            if (localTask) {
                return localTask;
            }

            let companyId = null;
            let projectId = null;

            if (clickUpTaskData.space?.name) {
                const company = await dbManager.taskHub.companies.findByName(clickUpTaskData.space.name);
                if (company) {
                    companyId = company.id;
                    if (clickUpTaskData.list?.name) {
                        const project = await dbManager.taskHub.projects.findByName(clickUpTaskData.list.name, companyId);
                        if (project) {
                            projectId = project.id;
                        }
                    }
                }
            }
            
            const newTaskData = {
                title: clickUpTaskData.name,
                description: clickUpTaskData.description,
                clickup_url: clickUpTaskData.url,
                clickup_task_id: clickUpTaskData.id,
                project_id: projectId
            };

            const newTaskId = await dbManager.taskHub.tasks.add(newTaskData);
            return await dbManager.taskHub.tasks.getById(newTaskId);
        });

        ipcMain.handle('task:syncCommentToClickUp', async (event, { clickupTaskId, localTaskId, documentation }) => {
            const apiKey = await dbManager.settings.get('api_key_clickup');
            if (!apiKey) throw new Error("Chave de API do ClickUp não configurada.");

            try {
                const clickupResponse = await integrationManager.clickup.addComment(clickupTaskId, documentation, apiKey);
                await dbManager.taskHub.workLogs.add(
                    localTaskId,
                    documentation,
                    0,
                    new Date().toISOString(),
                    { is_clickup_synced: 1 }
                );
                return clickupResponse;
            } catch (error) {
                console.error("[Main Process] Erro ao sincronizar e salvar comentário:", error);
                throw error;
            }
        });

        ipcMain.handle('task:syncTimeToClickUp', async (event, { clickupTaskId, localTaskId, date, startTime, endTime }) => {
            const apiKey = await dbManager.settings.get('api_key_clickup');
            const localTask = await dbManager.taskHub.tasks.getById(localTaskId);
            if (!localTask || !localTask.company_id) throw new Error("A tarefa não está associada a uma empresa.");
            const company = await dbManager.taskHub.companies.getById(localTask.company_id);
            if (!company || !company.clickup_team_id) throw new Error("A empresa associada não tem um Team ID do ClickUp configurado.");
            
            const teamId = company.clickup_team_id;
            
            try {
                const timeEntry = { date, startTime, endTime };
                const clickupResponse = await integrationManager.clickup.addTimeEntry(clickupTaskId, timeEntry, apiKey, teamId);

                const start = new Date(`${date}T${startTime}:00`);
                const end = new Date(`${date}T${endTime}:00`);
                const durationMs = end - start;
                const durationHours = (durationMs / (1000 * 60 * 60));

                await dbManager.taskHub.workLogs.add(
                    localTaskId,
                    `[ClickUp] Entrada de tempo de ${durationHours.toFixed(2)}h.`,
                    durationHours,
                    new Date(date).toISOString(),
                    { is_clickup_synced: 1 }
                );

                return clickupResponse;
            } catch (error) {
                console.error("[Main Process] Erro ao sincronizar e salvar tempo:", error);
                throw error;
            }
        });

        ipcMain.handle('task:syncClockifyProjects', async () => {
            const apiKey = await dbManager.settings.get('api_key_clockify');
            const companies = await dbManager.taskHub.companies.list();
            if (!apiKey || companies.length === 0) {
                throw new Error("API Key do Clockify ou nenhuma empresa configurada.");
            }

            console.log(`[Clockify Sync] Iniciando sincronização para ${companies.length} empresa(s)...`);
            let totalUpdatedCount = 0;

            for (const company of companies) {
                if (!company.clockify_workspace_id) {
                    console.warn(`[Clockify Sync] Pulando empresa "${company.name}" por não ter Workspace ID.`);
                    continue;
                }

                const clockifyProjects = await integrationManager.clockify.getProjects(company.clockify_workspace_id, apiKey);
                
                for (const clockifyProject of clockifyProjects) {
                    let localProject = await dbManager.taskHub.projects.findByName(clockifyProject.name, company.id);

                    if (!localProject) {
                        const newProjectId = await dbManager.taskHub.projects.add(clockifyProject.name, company.id);
                        localProject = { id: newProjectId };
                        console.log(`[Clockify Sync] Projeto local "${clockifyProject.name}" criado.`);
                    }

                    const customFields = await integrationManager.clockify.getCustomFieldsForProject(company.clockify_workspace_id, clockifyProject.id, apiKey);
                    const clickUpField = customFields.find(cf => cf.name === "ClickUp Task (Link)");
                    
                    if (clickUpField) {
                        await dbManager.taskHub.projects.updateClockifyIds(localProject.id, clockifyProject.id, clickUpField.id);
                        totalUpdatedCount++;
                        console.log(`[Clockify Sync] Projeto "${clockifyProject.name}" atualizado com IDs.`);
                    } else {
                        console.warn(`[Clockify Sync] Projeto "${clockifyProject.name}" encontrado, mas o Custom Field "ClickUp Task (Link)" não foi localizado.`);
                    }
                }
            }
            
            console.log(`[Clockify Sync] Sincronização concluída. ${totalUpdatedCount} projetos foram atualizados/criados.`);
            return { updatedCount: totalUpdatedCount };
        });

        ipcMain.handle('task:getClockifyTasksForProject', async (event, localProjectId) => {
            const apiKey = await dbManager.settings.get('api_key_clockify');
            if (!apiKey) throw new Error("API Key do Clockify não configurada.");

            const localProject = await dbManager.taskHub.projects.getById(localProjectId);
            if (!localProject || !localProject.company_id || !localProject.clockify_project_id) {
                return [];
            }
            
            const company = await dbManager.taskHub.companies.getById(localProject.company_id);
            if (!company || !company.clockify_workspace_id) {
                return [];
            }
            
            return await integrationManager.clockify.getTasksForProject(company.clockify_workspace_id, localProject.clockify_project_id, apiKey);
        });

        ipcMain.handle('task:syncToClockify', async (event, logData) => {
            const apiKey = await dbManager.settings.get('api_key_clockify');
            if (!apiKey) throw new Error("API Key do Clockify não configurada.");

            const { localTaskId, date, startTime, endTime, description, clockifyTaskId, clickupTaskUrl } = logData;

            const localTask = await dbManager.taskHub.tasks.getById(localTaskId);
            if (!localTask || !localTask.project_id) throw new Error("Tarefa ou projeto local não encontrado.");
            
            const localProject = await dbManager.taskHub.projects.getById(localTask.project_id);
            if (!localProject || !localProject.company_id || !localProject.clockify_project_id || !localProject.clockify_custom_field_id) {
                throw new Error("Este projeto não está sincronizado com o Clockify. Sincronize primeiro.");
            }
            
            const company = await dbManager.taskHub.companies.getById(localProject.company_id);
            if (!company || !company.clockify_workspace_id) {
                throw new Error("A empresa deste projeto não tem um Workspace ID do Clockify configurado.");
            }
            
            const start = new Date(`${date}T${startTime}:00`);
            const end = new Date(`${date}T${endTime}:00`);
            const durationHours = (end - start) / (1000 * 60 * 60);

            const entryData = {
                start: start.getTime(),
                end: end.getTime(),
                description: description || localTask.title,
                projectId: localProject.clockify_project_id,
                taskId: clockifyTaskId,
                customFieldId: localProject.clockify_custom_field_id,
                clickupTaskUrl: clickupTaskUrl,
            };

            const clockifyResponse = await integrationManager.clockify.addTimeEntry(company.clockify_workspace_id, entryData, apiKey);

            await dbManager.taskHub.workLogs.add(
                localTaskId,
                `[Clockify] ${description || 'Registro de tempo'}.`,
                durationHours,
                start.toISOString(),
                { is_clockify_synced: 1 }
            );

            return clockifyResponse;
        });
    }
};

module.exports = TaskHubManager;