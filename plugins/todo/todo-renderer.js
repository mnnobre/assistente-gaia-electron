// /plugins/todo/todo-renderer.js (Lógica de Inicialização Corrigida)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos ---
    const widgetContainer = document.getElementById('widget-container');
    const widgetBody = document.getElementById('widget-body');
    const widgetFooter = document.getElementById('widget-footer');
    const listNameBtn = document.getElementById('list-name-btn');
    const currentListName = document.getElementById('current-list-name');
    const listsDropdown = document.getElementById('lists-dropdown');
    const tasksContainer = document.getElementById('tasks-container');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const toggleCollapseBtn = document.getElementById('toggle-collapse-btn');
    const closeWidgetBtn = document.getElementById('close-widget-btn');

    // --- Variáveis de Estado ---
    let allLists = [];
    let activeList = null;
    let tasks = [];

    // --- Funções de Renderização ---

    function renderListsDropdown() {
        listsDropdown.innerHTML = '';
        allLists.forEach(list => {
            const li = document.createElement('li');
            const linkContent = `
                <a class="flex-grow" data-list-id="${list.id}">${list.name}</a>
                ${list.id !== 1 ? '<button class="btn btn-ghost btn-xs btn-circle remove-list-btn" data-list-id="' + list.id + '">🗑️</button>' : ''}
            `;
            const linkWrapper = document.createElement('div');
            linkWrapper.className = 'flex items-center w-full';
            linkWrapper.innerHTML = linkContent;
            li.appendChild(linkWrapper);
            listsDropdown.appendChild(li);
        });
        listsDropdown.innerHTML += `
            <li><div class="divider my-1"></div></li>
            <li><a><input type="text" id="new-list-input" placeholder="+ Nova Lista" class="input input-ghost input-xs w-full" /></a></li>
        `;
    }

    function renderTasks() {
        tasksContainer.innerHTML = '';
        if (tasks.length === 0) {
            tasksContainer.innerHTML = `<p class="text-center text-xs opacity-60 p-4">Nenhuma tarefa aqui!</p>`;
            return;
        }

        tasks.forEach(task => {
            const isDone = task.status === 'done';
            const taskDiv = document.createElement('div');
            taskDiv.className = 'form-control group';
            taskDiv.innerHTML = `
                <label class="label cursor-pointer p-1 justify-start gap-2">
                    <input type="checkbox" ${isDone ? 'checked' : ''} class="checkbox checkbox-primary checkbox-sm task-checkbox" data-task-id="${task.id}" />
                    <span class="label-text ${isDone ? 'line-through opacity-50' : ''}">${task.task}</span> 
                    <button class="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 transition-opacity remove-task-btn" data-task-id="${task.id}" title="Remover Tarefa">
                        🗑️
                    </button>
                </label>
            `;
            tasksContainer.appendChild(taskDiv);
        });
    }

    function updateActiveListDisplay() {
        if (activeList) {
            currentListName.textContent = activeList.name;
        } else {
            currentListName.textContent = 'Nenhuma lista';
        }
    }

    // --- Funções de Lógica e Ações ---

    async function handleAddTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText === '' || !activeList) return;

        try {
            const newTask = await window.api.todo.addTask(activeList.id, taskText);
            tasks.push(newTask);
            newTaskInput.value = '';
            renderTasks();
        } catch (error) {
            console.error("Erro ao adicionar tarefa:", error);
        }
    }

    async function switchActiveList(listId) {
        const newList = allLists.find(l => l.id === listId);
        if (!newList) {
            if (allLists.length > 0) {
                await switchActiveList(allLists[0].id);
            } else {
                activeList = null;
                tasks = [];
                updateActiveListDisplay();
                renderTasks();
                renderListsDropdown();
            }
            return;
        }

        activeList = newList;
        localStorage.setItem('todo_lastActiveListId', activeList.id);
        
        tasks = await window.api.todo.getTasksForList(activeList.id);
        updateActiveListDisplay();
        renderTasks();
    }

    // --- Lógica de Inicialização ---

    async function initialize() {
        try {
            allLists = await window.api.todo.getLists();
            
            // --- INÍCIO DA CORREÇÃO ---
            // Sempre renderizamos o dropdown depois de buscar as listas.
            renderListsDropdown();
            // --- FIM DA CORREÇÃO ---
            
            const lastActiveListId = localStorage.getItem('todo_lastActiveListId');
            let listIdToLoad = null;

            if (lastActiveListId && allLists.some(l => l.id == lastActiveListId)) {
                listIdToLoad = parseInt(lastActiveListId, 10);
            } else if (allLists.length > 0) {
                listIdToLoad = allLists[0].id;
            }

            if (listIdToLoad) {
                await switchActiveList(listIdToLoad);
            } else {
                // Se não houver listas para carregar, ainda precisamos garantir
                // que a UI de tarefas e o display do nome estejam vazios.
                renderTasks();
                updateActiveListDisplay();
            }

        } catch (error) {
            console.error("Erro ao inicializar o widget de To-Do:", error);
            tasksContainer.innerHTML = `<p class="text-center text-error">Erro ao carregar tarefas.</p>`;
        }
    }

    // --- Event Listeners ---
    
    listNameBtn.addEventListener('click', () => {
        widgetContainer.classList.toggle('lists-expanded');
    });

    addTaskBtn.addEventListener('click', handleAddTask);
    newTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleAddTask();
        }
    });

    tasksContainer.addEventListener('click', async (e) => {
        const checkbox = e.target.closest('.task-checkbox');
        const removeBtn = e.target.closest('.remove-task-btn');

        if (checkbox) {
            const taskId = parseInt(checkbox.dataset.taskId, 10);
            const isDone = checkbox.checked;
            await window.api.todo.updateTaskStatus(taskId, isDone);
            tasks = await window.api.todo.getTasksForList(activeList.id);
            renderTasks();
        }

        if (removeBtn) {
            const taskId = parseInt(removeBtn.dataset.taskId, 10);
            await window.api.todo.removeTask(taskId);
            tasks = tasks.filter(t => t.id !== taskId);
            renderTasks();
        }
    });

    listsDropdown.addEventListener('click', async (e) => {
        const link = e.target.closest('a[data-list-id]');
        const removeBtn = e.target.closest('.remove-list-btn');

        if (link) {
            e.stopPropagation();
            const listId = parseInt(link.dataset.listId, 10);
            await switchActiveList(listId);
            widgetContainer.classList.remove('lists-expanded');
        }

        if (removeBtn) {
            e.stopPropagation();
            const listIdToRemove = parseInt(removeBtn.dataset.listId, 10);
            
            await window.api.todo.removeList(listIdToRemove);
            allLists = await window.api.todo.getLists();
            
            if (activeList && activeList.id === listIdToRemove) {
                await switchActiveList(allLists.length > 0 ? allLists[0].id : null);
            }
            renderListsDropdown();
        }
    });

    listsDropdown.addEventListener('keydown', async (e) => {
        if (e.target.id === 'new-list-input' && e.key === 'Enter') {
            const newName = e.target.value.trim();
            if (newName === '') return;
            
            try {
                const newListId = await window.api.todo.createList(newName);
                allLists = await window.api.todo.getLists();
                renderListsDropdown();
                await switchActiveList(newListId);
            } catch (error) {
                console.error("Erro ao criar lista:", error);
                e.target.value = '';
                e.target.placeholder = 'Nome já existe!';
            } finally {
                widgetContainer.classList.remove('lists-expanded');
            }
        }
    });

    closeWidgetBtn.addEventListener('click', () => window.close());
    toggleCollapseBtn.addEventListener('click', () => {
        const isCollapsed = widgetBody.classList.toggle('hidden');
        widgetFooter.classList.toggle('hidden');
        widgetContainer.classList.toggle('h-auto');
        toggleCollapseBtn.querySelector('svg').style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // --- Ponto de Entrada ---
    initialize();
});