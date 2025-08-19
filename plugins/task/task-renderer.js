// /plugins/task/task-renderer.js (VERSÃO FINAL E COMPLETA)
document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos ---
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
    
    // --- Variáveis de Estado ---
    let loadedTasks = [];
    let applicationsData = [];
    let currentTaskId = null;

    // --- Sistema de Notificações (Toast) ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    // --- LÓGICA DO GERADOR DE LOGS ---
    function renderApplications() {
        applicationsContainer.innerHTML = '';
        applicationsData.forEach((app, appIndex) => {
            const appDiv = document.createElement('div');
            appDiv.classList.add('application');
            appDiv.innerHTML = `<div class="item-header"><strong>Aplicação: ${app.name}</strong><span class="item-actions"><button class="deleteAppBtn" data-app-index="${appIndex}" title="Excluir Aplicação">❌</button></span></div><div class="modulesContainer"></div><div class="add-module-form"><input type="text" class="newModuleNameInput" placeholder="Nome do Novo Módulo"><button class="addModuleBtn" data-app-index="${appIndex}">Adicionar Módulo</button></div>`;
            applicationsContainer.appendChild(appDiv);
            const modulesContainer = appDiv.querySelector('.modulesContainer');
            app.modules.forEach((mod, modIndex) => {
                const modDiv = document.createElement('div');
                modDiv.classList.add('module');
                let modificationsHTML = '';
                mod.modifications.forEach((item, itemIndex) => {
                    modificationsHTML += `<li class="modification-item"><span class="modification-content">• ${item.text}</span><span class="modification-actions"><button class="deleteModificationBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}" data-item-index="${itemIndex}" title="Excluir Modificação">❌</button></span></li>`;
                });
                modDiv.innerHTML = `<div class="item-header"><strong>Módulo: ${mod.name}</strong><span class="item-actions"><button class="deleteModuleBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}" title="Excluir Módulo">❌</button></span></div><ul class="modificationsList">${modificationsHTML}</ul><div class="add-modification-form"><input type="text" class="newModificationInput" placeholder="Item modificado"><button class="addModificationBtn" data-app-index="${appIndex}" data-mod-index="${modIndex}">Adicionar Modificação</button></div>`;
                modulesContainer.appendChild(modDiv);
            });
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
    function renderWorkLogs(logs) {
        workLogHistoryContainer.innerHTML = '';
        if (!logs || logs.length === 0) {
            workLogHistoryContainer.innerHTML = '<p>Nenhum registro de trabalho encontrado para esta tarefa.</p>';
            return;
        }

        logs.forEach(log => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'log-entry';

            const logDate = new Date(log.log_date);
            const userTimezoneOffset = logDate.getTimezoneOffset() * 60000;
            const localDate = new Date(logDate.getTime() + userTimezoneOffset);
            const formattedDate = localDate.toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            
            entryDiv.innerHTML = `
                <div class="log-entry-header">
                    <span class="log-entry-date">Data: ${formattedDate}</span>
                    <span class="log-entry-hours">${log.hours_worked} horas</span>
                </div>
                <pre class="log-entry-docs">${log.documentation || 'Nenhuma documentação fornecida.'}</pre>
            `;
            workLogHistoryContainer.appendChild(entryDiv);
        });
    }

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
        projectSelect.innerHTML = '<option value="">-- Selecione um Projeto --</option>';
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

        document.querySelectorAll('.task-item.selected').forEach(item => item.classList.remove('selected'));
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

        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.toggle('selected', parseInt(item.dataset.taskId) === taskId);
        });
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
                tasksListContainer.innerHTML = '<p>Nenhuma tarefa recente encontrada.</p>';
                return;
            }
            loadedTasks.forEach(task => {
                const item = document.createElement('div');
                item.className = 'task-item';
                item.dataset.taskId = task.id;
                const companyName = task.company_name || 'N/A';
                const projectName = task.project_name || 'N/A';
                item.innerHTML = `<span class="task-item-title">${task.title}</span><span class="task-item-project">${projectName} / ${companyName}</span>`;
                item.addEventListener('click', () => loadTaskIntoForm(task.id));
                tasksListContainer.appendChild(item);
            });
        } catch (error) {
            console.error("Erro ao carregar tarefas:", error);
            tasksListContainer.innerHTML = '<p>Erro ao carregar tarefas.</p>';
        }
    }
    
    async function loadCompanies() {
        try {
            const currentVal = companySelect.value;
            companySelect.length = 1; 
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
            projectSelect.length = 1;
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

    // --- Lógica de Eventos ---
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
                showToast(`Tarefa "${taskData.title}" criada com sucesso!`);
                await loadAllTasks();
                loadTaskIntoForm(newTaskId);
            } else {
                taskData.id = currentTaskId; 
                await window.api.taskHub.updateTask(taskData);
                showToast(`Tarefa "${taskData.title}" atualizada com sucesso!`);
                
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
                showToast("Tarefa excluída com sucesso!");
                
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
        const target = event.target;
        const appIndex = parseInt(target.dataset.appIndex);
        const modIndex = parseInt(target.dataset.modIndex);
        const itemIndex = parseInt(target.dataset.itemIndex);
        if (target.classList.contains('addModuleBtn')) {
            const moduleNameInput = target.previousElementSibling;
            const moduleName = moduleNameInput.value.trim();
            if (moduleName) {
                applicationsData[appIndex].modules.push({ name: moduleName, modifications: [] });
                renderApplications();
            } else {
                showToast("O nome do Módulo é obrigatório.", 'error');
            }
        } else if (target.classList.contains('addModificationBtn')) {
            const modificationInput = target.previousElementSibling;
            const modificationText = modificationInput.value.trim();
            if (modificationText) {
                applicationsData[appIndex].modules[modIndex].modifications.push({ text: modificationText });
                renderApplications();
            } else {
                showToast("A descrição da modificação é obrigatória.", 'error');
            }
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
            showToast("Registro de trabalho salvo com sucesso!");
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