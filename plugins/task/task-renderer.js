// /plugins/task/task-renderer.js (VERSÃO AJUSTADA PARA DAISYUI)
document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos (sem alterações) ---
    const companySelect = document.getElementById('company-select');
    const addCompanyBtn = document.getElementById('add-company-btn');
    const projectSelect = document.getElementById('project-select');
    const addProjectBtn = document.getElementById('add-project-btn');
    const taskTitleInput = document.getElementById('task-title');
    const taskUrlInput = document.getElementById('task-url');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const editTaskBtn = document.getElementById('edit-task-btn');
    const deleteTaskBtn = document.getElementById('delete-task-btn');
    const newCompanyForm = document.getElementById('new-company-form');
    const newCompanyNameInput = document.getElementById('new-company-name');
    const saveNewCompanyBtn = document.getElementById('save-new-company-btn');
    const cancelNewCompanyBtn = document.getElementById('cancel-new-company-btn');
    const newProjectForm = document.getElementById('new-project-form');
    const newProjectNameInput = document.getElementById('new-project-name');
    const saveNewProjectBtn = document.getElementById('save-new-project-btn');
    const cancelNewProjectBtn = document.getElementById('cancel-new-project-btn');
    const workLogSection = document.getElementById('work-log-section');
    const tasksListContainer = document.getElementById('tasks-list-container');
    const newTaskBtn = document.getElementById('new-task-btn');
    const taskFormTitle = document.getElementById('task-form-title');
    const applicationsContainer = document.getElementById('applicationsContainer');
    const newAppNameInput = document.getElementById('newAppName');
    const submitNewApplicationBtn = document.getElementById('submitNewApplicationBtn');
    const logOutput = document.getElementById('logOutput');
    const logDateInput = document.getElementById('log-date');
    const logHoursInput = document.getElementById('log-hours');
    const saveLogDbBtn = document.getElementById('save-log-db-btn');
    const workLogHistorySection = document.getElementById('work-log-history-section');
    const workLogHistoryContainer = document.getElementById('work-log-history-container');
    
    // --- Variáveis de Estado (sem alterações) ---
    let loadedTasks = [];
    let applicationsData = [];
    let currentTaskId = null;

    // --- Sistema de Notificações (Toast) ---
    // --- INÍCIO DA ALTERAÇÃO ---
    // A função agora gera o HTML esperado pela daisyUI para os toasts.
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const alertDiv = document.createElement('div');
        // Usamos as classes `alert-success` e `alert-error` da daisyUI
        const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
        alertDiv.className = `alert ${alertClass} shadow-lg`;
        alertDiv.innerHTML = `<span>${message}</span>`;
        container.appendChild(alertDiv);

        // Animação de fade out
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            alertDiv.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                alertDiv.remove();
            }, 500);
        }, 3500);
    }
    // --- FIM DA ALTERAÇÃO ---

    // --- LÓGICA DO GERADOR DE LOGS ---
    // --- INÍCIO DA ALTERAÇÃO ---
    // A lógica foi atualizada para usar os componentes e classes da daisyUI
    function renderApplications() {
        applicationsContainer.innerHTML = '';
        applicationsData.forEach((app, appIndex) => {
            const appDiv = document.createElement('div');
            appDiv.className = 'collapse collapse-arrow bg-base-200';
            let modulesHTML = '';
            app.modules.forEach((mod, modIndex) => {
                let modificationsHTML = '';
                mod.modifications.forEach((item, itemIndex) => {
                    modificationsHTML += `
                        <li class="flex justify-between items-center py-1">
                            <span>• ${item.text}</span>
                            <button class="btn btn-xs btn-ghost deleteModificationBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}" data-item-index="${itemIndex}" title="Excluir Modificação">✕</button>
                        </li>`;
                });
                modulesHTML += `
                    <div class="ml-4 mt-2">
                        <div class="flex justify-between items-center">
                            <strong class="text-sm">Módulo: ${mod.name}</strong>
                            <button class="btn btn-xs btn-ghost deleteModuleBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}" title="Excluir Módulo">✕</button>
                        </div>
                        <ul class="list-none pl-2 mt-1">${modificationsHTML}</ul>
                        <div class="join w-full mt-2">
                            <input type="text" class="input input-sm input-bordered join-item w-full newModificationInput" placeholder="Item modificado">
                            <button class="btn btn-sm join-item addModificationBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}">Adicionar</button>
                        </div>
                    </div>`;
            });
            appDiv.innerHTML = `
                <input type="radio" name="app-accordion" checked="checked" /> 
                <div class="collapse-title text-md font-medium flex justify-between items-center">
                    Aplicação: ${app.name}
                    <button class="btn btn-xs btn-ghost deleteAppBtn" data-app-index="${appIndex}" title="Excluir Aplicação">✕</button>
                </div>
                <div class="collapse-content">
                    <div class="modulesContainer">${modulesHTML}</div>
                    <div class="join w-full mt-3">
                        <input type="text" class="input input-sm input-bordered join-item w-full newModuleNameInput" placeholder="Nome do Novo Módulo">
                        <button class="btn btn-sm join-item addModuleBtn" data-app-index="${appIndex}">Adicionar Módulo</button>
                    </div>
                </div>
            `;
            applicationsContainer.appendChild(appDiv);
        });
        updateLogPreview();
    }
    // --- FIM DA ALTERAÇÃO ---

    function updateLogPreview() {
        let logText = "Development Log:\n";
        const indentUnit = "  ";
        applicationsData.forEach(app => {
            if (!app.name) return;
            logText += `${indentUnit}• Application: ${app.name}\n`;
            app.modules.forEach(mod => {
                if(!mod.name) return;
                const modPrefix = indentUnit.repeat(2);
                logText += `${modPrefix}• Module: ${mod.name}\n`;
                mod.modifications.forEach(item => {
                    if(!item.text) return;
                    const itemPrefix = indentUnit.repeat(3);
                    logText += `${itemPrefix}• Modified item: ${item.text}\n`;
                });
            });
            logText += "\n";
        });
        logOutput.value = logText.trim();
    }
    
    // --- Funções da UI Principal ---
    // --- INÍCIO DA ALTERAÇÃO ---
    // A lógica foi atualizada para usar os componentes e classes da daisyUI
    function renderWorkLogs(logs) {
        workLogHistoryContainer.innerHTML = '';
        if (!logs || logs.length === 0) {
            workLogHistoryContainer.innerHTML = '<p class="text-sm text-base-content/70">Nenhum registro de trabalho encontrado para esta tarefa.</p>';
            return;
        }

        logs.forEach(log => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'p-4 bg-base-200 rounded-lg'; // Usando cores do tema

            const logDate = new Date(log.log_date);
            const userTimezoneOffset = logDate.getTimezoneOffset() * 60000;
            const localDate = new Date(logDate.getTime() + userTimezoneOffset);
            const formattedDate = localDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            entryDiv.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-sm">Data: ${formattedDate}</span>
                    <div class="badge badge-neutral">${log.hours_worked} horas</div>
                </div>
                <pre class="bg-base-300 p-3 rounded-md text-xs whitespace-pre-wrap font-mono">${log.documentation || 'Nenhuma documentação fornecida.'}</pre>
            `;
            workLogHistoryContainer.appendChild(entryDiv);
        });
    }
    // --- FIM DA ALTERAÇÃO ---

    function setFormState(isEditing) {
        companySelect.disabled = !isEditing;
        projectSelect.disabled = !isEditing;
        taskTitleInput.disabled = !isEditing;
        taskUrlInput.disabled = !isEditing;
        addCompanyBtn.disabled = !isEditing;
        addProjectBtn.disabled = !isEditing || !companySelect.value;
    }

    function resetTaskForm() {
        taskFormTitle.textContent = "Nova Tarefa";
        currentTaskId = null;
        
        companySelect.value = '';
        projectSelect.innerHTML = '<option value="" disabled selected>-- Selecione um Projeto --</option>'; // Restaurado o valor padrão
        taskTitleInput.value = '';
        taskUrlInput.value = '';
        
        setFormState(true); 

        saveTaskBtn.textContent = 'Criar Tarefa';
        saveTaskBtn.style.display = 'inline-block';
        editTaskBtn.style.display = 'none';
        deleteTaskBtn.style.display = 'none';

        workLogSection.style.display = 'none';
        workLogHistorySection.style.display = 'none';
        workLogHistoryContainer.innerHTML = '';

        // --- INÍCIO DA ALTERAÇÃO ---
        // Remove a classe `active` que a daisyUI usa para destacar itens.
        document.querySelectorAll('.task-item.active').forEach(item => item.classList.remove('active'));
        // --- FIM DA ALTERAÇÃO ---
        applicationsData = [];
        renderApplications();
    }

    async function loadTaskIntoForm(taskId) {
        const taskData = loadedTasks.find(t => t.id === taskId);
        if (!taskData) return;

        currentTaskId = taskId;
        taskFormTitle.textContent = `Detalhes: ${taskData.title}`;
        
        await loadCompanies();
        companySelect.value = taskData.company_id;
        await loadProjects(taskData.company_id);
        projectSelect.value = taskData.project_id;
        taskTitleInput.value = taskData.title;
        taskUrlInput.value = taskData.clickup_url;

        setFormState(false); 

        saveTaskBtn.style.display = 'none';
        editTaskBtn.style.display = 'inline-block';
        deleteTaskBtn.style.display = 'inline-block';

        workLogSection.style.display = 'block';
        logDateInput.valueAsDate = new Date();

        // --- INÍCIO DA ALTERAÇÃO ---
        // A lógica de seleção agora usa a classe `active` da daisyUI
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.task-item[data-task-id='${taskId}']`)?.classList.add('active');
        // --- FIM DA ALTERAÇÃO ---
        
        applicationsData = [];
        renderApplications();

        workLogHistorySection.style.display = 'block';
        try {
            const logs = await window.api.taskHub.getWorkLogs(taskId);
            renderWorkLogs(logs);
        } catch(error) {
            console.error("Erro ao carregar histórico de logs:", error);
            workLogHistoryContainer.innerHTML = '<p>Erro ao carregar histórico.</p>';
        }
    }

    async function loadAllTasks() {
        try {
            tasksListContainer.innerHTML = '';
            loadedTasks = await window.api.taskHub.getTasks();
            if (loadedTasks.length === 0) {
                tasksListContainer.innerHTML = '<p class="text-sm text-base-content/70">Nenhuma tarefa recente encontrada.</p>';
                return;
            }
            loadedTasks.forEach(task => {
                // --- INÍCIO DA ALTERAÇÃO ---
                // A criação do item agora é um link `<a>` com classes da daisyUI
                const item = document.createElement('a');
                item.className = 'task-item btn btn-ghost justify-between w-full h-auto py-2 normal-case';
                item.dataset.taskId = task.id;
                const companyName = task.company_name || 'N/A';
                const projectName = task.project_name || 'N/A';
                item.innerHTML = `
                    <span class="task-item-title text-left font-normal">${task.title}</span>
                    <span class="task-item-project badge badge-outline badge-sm">${projectName} / ${companyName}</span>
                `;
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadTaskIntoForm(task.id);
                });
                tasksListContainer.appendChild(item);
                // --- FIM DA ALTERAÇÃO ---
            });
        } catch (error) {
            console.error("Erro ao carregar tarefas:", error);
            tasksListContainer.innerHTML = '<p>Erro ao carregar tarefas.</p>';
        }
    }
    
    async function loadCompanies() {
        try {
            const currentVal = companySelect.value;
            companySelect.innerHTML = '<option value="" disabled selected>-- Selecione uma Empresa --</option>';
            const companies = await window.api.taskHub.getCompanies();
            companies.forEach(company => {
                const option = new Option(company.name, company.id);
                companySelect.appendChild(option);
            });
            companySelect.value = currentVal;
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
        }
    }

    async function loadProjects(companyId) {
        try {
            const currentVal = projectSelect.value;
            projectSelect.innerHTML = '<option value="" disabled selected>-- Selecione um Projeto --</option>';
            projectSelect.disabled = true;
            addProjectBtn.disabled = true;
            if (companyId) {
                const projects = await window.api.taskHub.getProjects(companyId);
                projects.forEach(project => {
                    const option = new Option(project.name, project.id);
                    projectSelect.appendChild(option);
                });
                projectSelect.disabled = false;
                addProjectBtn.disabled = false;
            }
            projectSelect.value = currentVal;
        } catch (error) {
            console.error("Erro ao carregar projetos:", error);
        }
    }

    // --- Lógica de Eventos (maioria sem alterações, pois se baseia em IDs) ---
    newTaskBtn.addEventListener('click', resetTaskForm);
    companySelect.addEventListener('change', () => loadProjects(companySelect.value));
    addCompanyBtn.addEventListener('click', () => { newCompanyForm.classList.remove('hidden'); newCompanyNameInput.focus(); });
    cancelNewCompanyBtn.addEventListener('click', () => { newCompanyForm.classList.add('hidden'); newCompanyNameInput.value = ''; });
    saveNewCompanyBtn.addEventListener('click', async () => {
        const companyName = newCompanyNameInput.value.trim();
        if (companyName) {
            try {
                const newCompanyId = await window.api.taskHub.addCompany(companyName);
                await loadCompanies();
                companySelect.value = newCompanyId;
                companySelect.dispatchEvent(new Event('change')); 
                cancelNewCompanyBtn.click();
            } catch (error) {
                showToast(`Não foi possível adicionar a empresa. Ela já existe?`, 'error');
            }
        }
    });

    addProjectBtn.addEventListener('click', () => { newProjectForm.classList.remove('hidden'); newProjectNameInput.focus(); });
    cancelNewProjectBtn.addEventListener('click', () => { newProjectForm.classList.add('hidden'); newProjectNameInput.value = ''; });
    saveNewProjectBtn.addEventListener('click', async () => {
        const projectName = newProjectNameInput.value.trim();
        const selectedCompanyId = companySelect.value;
        if (projectName && selectedCompanyId) {
            try {
                const newProjectId = await window.api.taskHub.addProject({ name: projectName, companyId: selectedCompanyId });
                await loadProjects(selectedCompanyId);
                projectSelect.value = newProjectId;
                cancelNewProjectBtn.click();
            } catch (error) {
                showToast("Não foi possível adicionar o projeto.", 'error');
            }
        }
    });

    saveTaskBtn.addEventListener('click', async () => {
        const taskData = {
            title: taskTitleInput.value.trim(),
            clickup_url: taskUrlInput.value.trim(),
            project_id: projectSelect.value
        };
        if (!taskData.title || !taskData.project_id) {
            showToast("Título da tarefa e Projeto são obrigatórios!", 'error');
            return;
        }
        try {
            if (!currentTaskId) {
                const newTaskId = await window.api.taskHub.addTask(taskData);
                showToast(`Tarefa "${taskData.title}" criada com sucesso!`, 'success');
                await loadAllTasks();
                loadTaskIntoForm(newTaskId);
            } else {
                taskData.id = currentTaskId; 
                await window.api.taskHub.updateTask(taskData);
                showToast(`Tarefa "${taskData.title}" atualizada com sucesso!`, 'success');
                await loadAllTasks();
                loadTaskIntoForm(currentTaskId);
            }
        } catch (error) {
            showToast("Não foi possível salvar. A URL do ClickUp já foi usada?", 'error');
        }
    });

    editTaskBtn.addEventListener('click', () => {
        taskFormTitle.textContent = `Editando: ${taskTitleInput.value}`;
        setFormState(true); 
        saveTaskBtn.textContent = 'Salvar Alterações';
        saveTaskBtn.style.display = 'inline-block';
        editTaskBtn.style.display = 'none';
        deleteTaskBtn.style.display = 'none';
    });

    deleteTaskBtn.addEventListener('click', async () => {
        if (!currentTaskId) return;
        if (confirm(`Tem certeza que deseja excluir a tarefa "${taskTitleInput.value}"? Esta ação não pode ser desfeita.`)) {
            try {
                await window.api.taskHub.deleteTask(currentTaskId);
                showToast("Tarefa excluída com sucesso!", 'success');
                resetTaskForm();
                await loadAllTasks();
            } catch (error) {
                console.error("Erro ao excluir tarefa:", error);
                showToast("Não foi possível excluir a tarefa.", 'error');
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

        const appIndex = parseInt(target.dataset.appIndex);
        const modIndex = parseInt(target.dataset.modIndex);
        const itemIndex = parseInt(target.dataset.itemIndex);

        if (target.classList.contains('addModuleBtn')) {
            const moduleNameInput = target.previousElementSibling;
            const moduleName = moduleNameInput.value.trim();
            if (moduleName) {
                applicationsData[appIndex].modules.push({ name: moduleName, modifications: [] });
                renderApplications();
            } else { showToast("O nome do Módulo é obrigatório.", 'error'); }
        } else if (target.classList.contains('addModificationBtn')) {
            const modificationInput = target.previousElementSibling;
            const modificationText = modificationInput.value.trim();
            if (modificationText) {
                applicationsData[appIndex].modules[modIndex].modifications.push({ text: modificationText });
                renderApplications();
            } else { showToast("A descrição da modificação é obrigatória.", 'error'); }
        } else if (target.classList.contains('deleteAppBtn')) {
            applicationsData.splice(appIndex, 1);
            renderApplications();
        } else if (target.classList.contains('deleteModuleBtn')) {
            applicationsData[appIndex].modules.splice(modIndex, 1);
            renderApplications();
        } else if (target.classList.contains('deleteModificationBtn')) {
            applicationsData[appIndex].modules[modIndex].modifications.splice(itemIndex, 1);
            renderApplications();
        }
    });
    
    saveLogDbBtn.addEventListener('click', async () => {
        if (!currentTaskId) {
            showToast("Nenhuma tarefa selecionada para adicionar o registro.", 'error');
            return;
        }
        const logData = {
            taskId: currentTaskId,
            documentation: logOutput.value,
            hours: parseFloat(logHoursInput.value.replace(',', '.')) || 0,
            date: logDateInput.value
        };
        if (!logData.date || logData.hours <= 0) {
            showToast("A data e as horas trabalhadas são obrigatórias.", 'error');
            return;
        }
        try {
            await window.api.taskHub.addWorkLog(logData);
            showToast("Registro de trabalho salvo com sucesso!", 'success');
            applicationsData = [];
            renderApplications();
            logHoursInput.value = '';
            const updatedLogs = await window.api.taskHub.getWorkLogs(currentTaskId);
            renderWorkLogs(updatedLogs);
        } catch (error) {
            console.error("Erro ao salvar registro de trabalho:", error);
            showToast("Não foi possível salvar o registro de trabalho.", 'error');
        }
    });
    
    // --- Inicialização ---
    async function initialize() {
        await loadCompanies();
        await loadAllTasks();
        resetTaskForm();
    }
    initialize();
});