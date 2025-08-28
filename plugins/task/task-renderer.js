// /plugins/task/task-renderer.js (VERSÃO FINAL COM CASCATA DE DROPDOWNS CORRIGIDA)
document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos ---
    const companySelect = document.getElementById('company-select');
    const projectSelect = document.getElementById('project-select');
    const taskTitleInput = document.getElementById('task-title');
    const tasksListContainer = document.getElementById('tasks-list-container');
    const newTaskBtn = document.getElementById('new-task-btn');
    const taskFormTitle = document.getElementById('task-form-title');
    const workLogSection = document.getElementById('work-log-section');
    const workLogHistorySection = document.getElementById('work-log-history-section');
    const workLogHistoryContainer = document.getElementById('work-log-history-container');
    
    const syncClockifyProjectsBtn = document.getElementById('sync-clockify-projects-btn');
    const clickupTaskIdInput = document.getElementById('clickup-task-id-input');
    const fetchClickupTaskBtn = document.getElementById('fetch-clickup-task-btn');
    const taskDescriptionInput = document.getElementById('task-description');
    const taskUrlInput = document.getElementById('task-url');

    const syncCommentClickupBtn = document.getElementById('sync-comment-clickup-btn');
    const timeEntriesList = document.getElementById('time-entries-list');
    const addTimeEntryBtn = document.getElementById('add-time-entry-btn');

    const applicationsContainer = document.getElementById('applicationsContainer');
    const newAppNameInput = document.getElementById('newAppName');
    const submitNewApplicationBtn = document.getElementById('submitNewApplicationBtn');
    const logOutput = document.getElementById('logOutput');
    
    // --- Variáveis de Estado ---
    let loadedTasks = [];
    let applicationsData = [];
    let currentTask = null;

    // --- Sistema de Notificações (Toast) ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const alertDiv = document.createElement('div');
        const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
        alertDiv.className = `alert ${alertClass} shadow-lg`;
        alertDiv.innerHTML = `<span>${message}</span>`;
        container.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            alertDiv.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => alertDiv.remove(), 500);
        }, 3500);
    }

    // --- Lógica do Gerador de Documentação ---
    function renderApplications() {
        applicationsContainer.innerHTML = '';
        applicationsData.forEach((app, appIndex) => {
            const appDiv = document.createElement('div');
            appDiv.className = 'collapse collapse-arrow bg-base-200';
            let modulesHTML = '';
            app.modules.forEach((mod, modIndex) => {
                let modificationsHTML = '';
                mod.modifications.forEach((item, itemIndex) => {
                    modificationsHTML += `<li class="flex justify-between items-center py-1"><span>• ${item.text}</span><button class="btn btn-xs btn-ghost deleteModificationBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}" data-item-index="${itemIndex}" title="Excluir Modificação">✕</button></li>`;
                });
                modulesHTML += `<div class="ml-4 mt-2"><div class="flex justify-between items-center"><strong class="text-sm">Módulo: ${mod.name}</strong><button class="btn btn-xs btn-ghost deleteModuleBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}" title="Excluir Módulo">✕</button></div><ul class="list-none pl-2 mt-1">${modificationsHTML}</ul><div class="join w-full mt-2"><input type="text" class="input input-sm input-bordered join-item w-full newModificationInput" placeholder="Item modificado"><button class="btn btn-sm join-item addModificationBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}">Adicionar</button></div></div>`;
            });
            appDiv.innerHTML = `<input type="radio" name="app-accordion" checked="checked" /><div class="collapse-title text-md font-medium flex justify-between items-center">Aplicação: ${app.name}<button class="btn btn-xs btn-ghost deleteAppBtn" data-app-index="${appIndex}" title="Excluir Aplicação">✕</button></div><div class="collapse-content"><div class="modulesContainer">${modulesHTML}</div><div class="join w-full mt-3"><input type="text" class="input input-sm input-bordered join-item w-full newModuleNameInput" placeholder="Nome do Novo Módulo"><button class="btn btn-sm join-item addModuleBtn" data-app-index="${appIndex}">Adicionar Módulo</button></div></div>`;
            applicationsContainer.appendChild(appDiv);
        });
        updateLogPreview();
    }

    function updateLogPreview() {
        let logText = "Development Log:\n";
        const indentUnit = "  ";
        applicationsData.forEach(app => {
            if (!app.name) return;
            logText += `${indentUnit}• Application: ${app.name}\n`;
            app.modules.forEach(mod => {
                if(!mod.name) return;
                logText += `${indentUnit.repeat(2)}• Module: ${mod.name}\n`;
                mod.modifications.forEach(item => {
                    if(!item.text) return;
                    logText += `${indentUnit.repeat(3)}• Modified item: ${item.text}\n`;
                });
            });
            logText += "\n";
        });
        logOutput.value = logText.trim();
    }
    
    // --- Funções da UI Principal ---
    function renderWorkLogs(logs) {
        workLogHistoryContainer.innerHTML = '';
        if (!logs || logs.length === 0) {
            workLogHistoryContainer.innerHTML = '<p class="text-sm text-base-content/70">Nenhum registro de trabalho encontrado.</p>';
            return;
        }
        logs.forEach(log => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'p-4 bg-base-200 rounded-lg';
            const logDate = new Date(log.log_date);
            const userTimezoneOffset = logDate.getTimezoneOffset() * 60000;
            const localDate = new Date(logDate.getTime() + userTimezoneOffset);
            const formattedDate = localDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            entryDiv.innerHTML = `<div class="flex justify-between items-center mb-2"><span class="font-bold text-sm">Data: ${formattedDate}</span><div class="badge badge-neutral">${log.hours_worked} horas</div></div><pre class="bg-base-300 p-3 rounded-md text-xs whitespace-pre-wrap font-mono">${log.documentation || 'Nenhuma documentação.'}</pre>`;
            workLogHistoryContainer.appendChild(entryDiv);
        });
    }

    function resetTaskForm() {
        taskFormTitle.textContent = "Buscar Tarefa";
        currentTask = null;
        
        clickupTaskIdInput.value = '';
        companySelect.innerHTML = '<option value="" disabled selected>-- Preenchido Automaticamente --</option>';
        projectSelect.innerHTML = '<option value="" disabled selected>-- Preenchido Automaticamente --</option>';
        companySelect.disabled = true;
        projectSelect.disabled = true;

        taskTitleInput.value = '';
        taskDescriptionInput.value = '';
        taskUrlInput.value = '';

        workLogSection.style.display = 'none';
        workLogHistorySection.style.display = 'none';
        
        document.querySelectorAll('.task-item.active').forEach(item => item.classList.remove('active'));
        
        applicationsData = [];
        renderApplications();
        logOutput.value = '';
        
        timeEntriesList.innerHTML = '';
        addNewTimeEntryRow();
    }

    async function loadTaskIntoForm(task) {
        currentTask = task;
        taskFormTitle.textContent = `Detalhes: ${task.title}`;
        
        clickupTaskIdInput.value = task.clickup_task_id || '';
        taskTitleInput.value = task.title;
        taskDescriptionInput.value = task.description || '';
        taskUrlInput.value = task.clickup_url;
        
        companySelect.disabled = false;
        
        await loadCompanies(task.company_id, task.project_id);

        workLogSection.style.display = 'block';
        workLogHistorySection.style.display = 'block';
        
        document.querySelectorAll('.task-item').forEach(item => item.classList.remove('active'));
        const taskItemInList = document.querySelector(`.task-item[data-task-id='${task.id}']`);
        if(taskItemInList) {
            taskItemInList.classList.add('active');
        }
        
        applicationsData = [];
        renderApplications();
        logOutput.value = '';
        
        timeEntriesList.innerHTML = '';
        addNewTimeEntryRow();
        
        try {
            const logs = await window.api.taskHub.getWorkLogs(task.id);
            renderWorkLogs(logs);
        } catch(error) {
            console.error("Erro ao carregar histórico de logs:", error);
        }
    }

    async function loadAllTasks() {
        try {
            tasksListContainer.innerHTML = '';
            loadedTasks = await window.api.taskHub.getTasks();
            if (loadedTasks.length === 0) {
                tasksListContainer.innerHTML = '<p class="text-sm text-base-content/70">Nenhuma tarefa recente.</p>';
                return;
            }
            loadedTasks.forEach(task => {
                const item = document.createElement('a');
                item.className = 'task-item btn btn-ghost justify-between w-full h-auto py-2 normal-case';
                item.dataset.taskId = task.id;
                item.innerHTML = `<span class="task-item-title text-left font-normal">${task.title}</span><span class="task-item-project badge badge-outline badge-sm">${task.project_name || 'N/A'} / ${task.company_name || 'N/A'}</span>`;
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const selectedTask = loadedTasks.find(t => t.id === parseInt(task.id));
                    if (selectedTask) loadTaskIntoForm(selectedTask);
                });
                tasksListContainer.appendChild(item);
            });
        } catch (error) {
            console.error("Erro ao carregar tarefas:", error);
        }
    }
    
    // --- CORREÇÃO --- `loadCompanies` agora gerencia a cascata de carregamento de projetos.
    async function loadCompanies(companyId = null, projectId = null) {
        try {
            companySelect.innerHTML = '<option value="" disabled>-- Selecione uma Empresa --</option>';
            const companies = await window.api.taskHub.getCompanies();
            companies.forEach(company => {
                const option = new Option(company.name, company.id);
                companySelect.appendChild(option);
            });

            let finalCompanyId = companyId;
            if (!finalCompanyId && companies.length > 0) {
                finalCompanyId = companies[0].id;
            }

            if (finalCompanyId) {
                companySelect.value = finalCompanyId;
                await loadProjects(finalCompanyId, projectId);
            }
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
        }
    }

    async function loadProjects(companyId, selectedId = null) {
        try {
            projectSelect.innerHTML = '<option value="" disabled>-- Selecione um Projeto --</option>';
            projectSelect.disabled = true; 
            if (companyId) {
                projectSelect.disabled = false;
                const projects = await window.api.taskHub.getProjects(companyId);
                projects.forEach(project => {
                    const option = new Option(project.name, project.id);
                    projectSelect.appendChild(option);
                });
            }
            if (selectedId) {
                projectSelect.value = selectedId;
            }
        } catch (error) {
            console.error("Erro ao carregar projetos:", error);
        }
    }

    async function loadAndPopulateClockifyTasks(localProjectId, rowElement) {
        const select = rowElement.querySelector('.clockify-task-select');
        const clockifyButton = rowElement.querySelector('.sync-clockify-row');
        if (!select || !clockifyButton) return;

        select.disabled = true;
        select.innerHTML = '<option>Carregando...</option>';

        try {
            const clockifyTasks = await window.api.taskHub.getClockifyTasksForProject(localProjectId);
            select.innerHTML = '<option value="" disabled selected>-- Selecione Categoria --</option>';
            if (clockifyTasks && clockifyTasks.length > 0) {
                clockifyTasks.forEach(task => {
                    const option = new Option(task.name, task.id);
                    select.appendChild(option);
                });
                select.disabled = false;
                clockifyButton.disabled = false;
            } else {
                select.innerHTML = '<option>Nenhuma categoria encontrada</option>';
            }
        } catch (error) {
            console.error('Erro ao carregar categorias do Clockify:', error);
            select.innerHTML = '<option>Erro ao carregar</option>';
            showToast(`Erro ao buscar categorias do Clockify: ${error.message}`, 'error');
        }
    }

    function addNewTimeEntryRow() {
        const entryRow = document.createElement('div');
        entryRow.className = 'p-4 bg-base-200 rounded-lg time-entry-row';
        entryRow.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end md:col-span-2">
                    <label class="form-control w-full"><div class="label label-text">Data:</div><input type="date" class="input input-bordered w-full log-date-input"></label>
                    <label class="form-control w-full"><div class="label label-text">Início:</div><input type="time" class="input input-bordered w-full log-start-time-input"></label>
                    <label class="form-control w-full"><div class="label label-text">Fim:</div><input type="time" class="input input-bordered w-full log-end-time-input"></label>
                    <label class="form-control w-full"><div class="label label-text">Total:</div><input type="text" class="input input-bordered w-full log-total-hours-output" readonly placeholder="0.0h"></label>
                </div>
                <label class="form-control w-full">
                    <div class="label label-text">Descrição (Clockify):</div>
                    <input type="text" class="input input-bordered w-full clockify-description-input" placeholder="O que foi feito?">
                </label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <label class="form-control w-full">
                        <div class="label label-text">Categoria (Clockify):</div>
                        <select class="select select-bordered w-full clockify-task-select" disabled>
                            <option>Selecione uma tarefa</option>
                        </select>
                    </label>
                    <div class="flex gap-2 justify-end self-end h-12 items-center">
                        <button class="btn btn-sm btn-secondary sync-clickup-row" title="Enviar para ClickUp">C</button>
                        <button class="btn btn-sm btn-accent sync-clockify-row" title="Enviar para Clockify" disabled>K</button>
                    </div>
                </div>
            </div>
        `;
        timeEntriesList.appendChild(entryRow);
        const dateInput = entryRow.querySelector('.log-date-input');
        if (dateInput) dateInput.valueAsDate = new Date();

        if (currentTask && currentTask.clockify_project_id) {
            loadAndPopulateClockifyTasks(currentTask.project_id, entryRow);
        }
    }

    // --- Lógica de Eventos ---
    newTaskBtn.addEventListener('click', () => {
        resetTaskForm();
        companySelect.disabled = false; 
    });
    addTimeEntryBtn.addEventListener('click', addNewTimeEntryRow);

    companySelect.addEventListener('change', () => {
        const selectedCompanyId = companySelect.value;
        loadProjects(selectedCompanyId);
    });
    
    fetchClickupTaskBtn.addEventListener('click', async () => {
        const taskId = clickupTaskIdInput.value.trim();
        if (!taskId) return showToast("Por favor, insira um ID de tarefa do ClickUp.", 'error');
        
        fetchClickupTaskBtn.classList.add('loading');
        try {
            const taskFromDb = await window.api.taskHub.findOrCreateTaskFromClickUp(taskId);
            if (taskFromDb) {
                showToast("Tarefa encontrada e carregada!", 'success');
                await loadAllTasks();
                
                const fullyLoadedTask = loadedTasks.find(t => t.id === taskFromDb.id);
                
                loadTaskIntoForm(fullyLoadedTask || taskFromDb);
            }
        } catch (error) {
            showToast(`Erro: ${error.message}`, 'error');
        } finally {
            fetchClickupTaskBtn.classList.remove('loading');
        }
    });

    syncClockifyProjectsBtn.addEventListener('click', async () => {
        syncClockifyProjectsBtn.classList.add('loading');
        syncClockifyProjectsBtn.disabled = true;
        try {
            const result = await window.api.taskHub.syncClockifyProjects();
            showToast(`${result.updatedCount} projetos sincronizados!`, 'success');
            
            // Recarrega as empresas e a tarefa atual para refletir a sincronização
            await loadCompanies(currentTask?.company_id, currentTask?.project_id);
            if (currentTask) {
                const reloadedTask = await window.api.taskHub.getTaskById(currentTask.id);
                await loadTaskIntoForm(reloadedTask);
            }
        } catch (error) {
            showToast(`Erro na sincronização: ${error.message}`, 'error');
        } finally {
            syncClockifyProjectsBtn.classList.remove('loading');
            syncClockifyProjectsBtn.disabled = false;
        }
    });

    syncCommentClickupBtn.addEventListener('click', async () => {
        if (!currentTask || !currentTask.clickup_task_id) {
            return showToast("Nenhuma tarefa do ClickUp selecionada.", 'error');
        }
        const documentation = logOutput.value;
        if (!documentation.trim()) {
            return showToast("A documentação não pode estar vazia.", 'error');
        }

        syncCommentClickupBtn.classList.add('loading');
        try {
            await window.api.taskHub.syncCommentToClickUp({ 
                clickupTaskId: currentTask.clickup_task_id, 
                localTaskId: currentTask.id,
                documentation 
            });
            showToast("Comentário enviado para o ClickUp e salvo localmente!", 'success');
            
            const logs = await window.api.taskHub.getWorkLogs(currentTask.id);
            renderWorkLogs(logs);

        } catch (error) {
            console.error("[task-renderer] Erro ao sincronizar comentário:", error);
            showToast(`Erro no ClickUp: ${error.message}`, 'error');
        } finally {
            syncCommentClickupBtn.classList.remove('loading');
        }
    });

    timeEntriesList.addEventListener('input', (event) => {
        const target = event.target;
        if (target.matches('.log-start-time-input, .log-end-time-input')) {
            const row = target.closest('.time-entry-row');
            const startInput = row.querySelector('.log-start-time-input').value;
            const endInput = row.querySelector('.log-end-time-input').value;
            const totalOutput = row.querySelector('.log-total-hours-output');
            if (startInput && endInput) {
                const start = new Date(`1970-01-01T${startInput}:00`);
                const end = new Date(`1970-01-01T${endInput}:00`);
                if (end > start) {
                    const diffMs = end - start;
                    const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
                    totalOutput.value = `${diffHours}h`;
                } else {
                    totalOutput.value = 'Inválido';
                }
            }
        }
    });

    timeEntriesList.addEventListener('click', async (event) => {
        const clickupTarget = event.target.closest('button.sync-clickup-row');
        const clockifyTarget = event.target.closest('button.sync-clockify-row');

        if (clickupTarget && !clickupTarget.disabled && currentTask) {
            const row = clickupTarget.closest('.time-entry-row');
            const date = row.querySelector('.log-date-input').value;
            const startTime = row.querySelector('.log-start-time-input').value;
            const endTime = row.querySelector('.log-end-time-input').value;

            if (!date || !startTime || !endTime) {
                return showToast("Preencha data, início e fim para o ClickUp.", "error");
            }

            clickupTarget.classList.add('loading');
            try {
                await window.api.taskHub.syncTimeToClickUp({ 
                    clickupTaskId: currentTask.clickup_task_id,
                    localTaskId: currentTask.id,
                    date, 
                    startTime, 
                    endTime 
                });
                showToast("Tempo enviado para o ClickUp e salvo!", "success");
                const logs = await window.api.taskHub.getWorkLogs(currentTask.id);
                renderWorkLogs(logs);
                clickupTarget.classList.remove('btn-secondary');
                clickupTarget.classList.add('btn-success');
                clickupTarget.disabled = true;
            } catch (error) {
                showToast(`Erro no ClickUp: ${error.message}`, "error");
            } finally {
                clickupTarget.classList.remove('loading');
            }
        }

        if (clockifyTarget && !clockifyTarget.disabled && currentTask) {
            const row = clockifyTarget.closest('.time-entry-row');
            const date = row.querySelector('.log-date-input').value;
            const startTime = row.querySelector('.log-start-time-input').value;
            const endTime = row.querySelector('.log-end-time-input').value;
            const clockifyTaskId = row.querySelector('.clockify-task-select').value;
            const description = row.querySelector('.clockify-description-input').value;

            if (!date || !startTime || !endTime || !clockifyTaskId) {
                return showToast("Preencha todos os campos para o Clockify.", "error");
            }

            clockifyTarget.classList.add('loading');
            try {
                await window.api.taskHub.syncToClockify({
                    localTaskId: currentTask.id,
                    date,
                    startTime,
                    endTime,
                    description,
                    clockifyTaskId,
                    clickupTaskUrl: currentTask.clickup_url
                });

                showToast("Tempo enviado para o Clockify e salvo!", "success");
                const logs = await window.api.taskHub.getWorkLogs(currentTask.id);
                renderWorkLogs(logs);
                clockifyTarget.classList.remove('btn-accent');
                clockifyTarget.classList.add('btn-success');
                clockifyTarget.disabled = true;
            } catch (error) {
                showToast(`Erro no Clockify: ${error.message}`, "error");
            } finally {
                clockifyTarget.classList.remove('loading');
            }
        }
    });
    
    submitNewApplicationBtn.addEventListener('click', () => {
        const appName = newAppNameInput.value.trim();
        if (appName) {
            applicationsData.push({ name: appName, modules: [] });
            newAppNameInput.value = '';
            renderApplications();
        } else {
            showToast("O nome da Aplicação é obrigatório.", 'error');
        }
    });

    applicationsContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        const appIndex = parseInt(target.dataset.appIndex), modIndex = parseInt(target.dataset.modIndex), itemIndex = parseInt(target.dataset.itemIndex);
        if (target.classList.contains('addModuleBtn')) {
            const moduleName = target.previousElementSibling.value.trim();
            if (moduleName) applicationsData[appIndex].modules.push({ name: moduleName, modifications: [] });
        } else if (target.classList.contains('addModificationBtn')) {
            const modificationText = target.previousElementSibling.value.trim();
            if (modificationText) applicationsData[appIndex].modules[modIndex].modifications.push({ text: modificationText });
        } else if (target.classList.contains('deleteAppBtn')) applicationsData.splice(appIndex, 1);
        else if (target.classList.contains('deleteModuleBtn')) applicationsData[appIndex].modules.splice(modIndex, 1);
        else if (target.classList.contains('deleteModificationBtn')) applicationsData[appIndex].modules[modIndex].modifications.splice(itemIndex, 1);
        renderApplications();
    });
    
    // --- CORREÇÃO ---
    // A função initialize agora chama `loadCompanies` primeiro para garantir
    // que a cascata seja acionada na carga inicial.
    async function initialize() {
        await loadAllTasks();
        resetTaskForm();
        await loadCompanies(); 
    }
    initialize();
});