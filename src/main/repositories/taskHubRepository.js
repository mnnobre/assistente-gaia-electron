// /src/main/repositories/taskHubRepository.js (VERSÃO FINAL E COMPLETA)
module.exports = (db) => ({
    companies: {
        add: async (companyData) => {
            const { name, clockify_workspace_id, clickup_team_id } = companyData;
            const result = await db.run(
                "INSERT INTO companies (name, clockify_workspace_id, clickup_team_id) VALUES (?, ?, ?)",
                [name, clockify_workspace_id, clickup_team_id]
            );
            return result.lastID;
        },
        list: async () => {
            return await db.all("SELECT * FROM companies ORDER BY name ASC");
        },
        findByName: async (name) => {
            return await db.get("SELECT * FROM companies WHERE name = ?", [name]);
        },
        // --- INÍCIO DA ALTERAÇÃO ---
        getById: async (id) => {
            return await db.get("SELECT * FROM companies WHERE id = ?", [id]);
        }
        // --- FIM DA ALTERAÇÃO ---
    },
    projects: {
        add: async (name, company_id) => {
            const result = await db.run("INSERT INTO projects (name, company_id) VALUES (?, ?)", [name, company_id]);
            return result.lastID;
        },
        listByCompany: async (company_id) => {
            return await db.all("SELECT * FROM projects WHERE company_id = ? ORDER BY name ASC", [company_id]);
        },
        findByName: async (name, company_id) => {
            return await db.get("SELECT * FROM projects WHERE name = ? AND company_id = ?", [name, company_id]);
        },
        listAll: async () => {
            return await db.all("SELECT * FROM projects");
        },
        getById: async (id) => {
            return await db.get("SELECT * FROM projects WHERE id = ?", [id]);
        },
        updateClockifyIds: async (localProjectId, clockifyProjectId, clockifyCustomFieldId) => {
            return await db.run(
                "UPDATE projects SET clockify_project_id = ?, clockify_custom_field_id = ? WHERE id = ?",
                [clockifyProjectId, clockifyCustomFieldId, localProjectId]
            );
        }
    },
    tasks: {
        add: async (taskData) => {
            const { title, description, clickup_url, clickup_task_id, project_id } = taskData;
            const result = await db.run(
                "INSERT INTO tasks (title, description, clickup_url, clickup_task_id, project_id) VALUES (?, ?, ?, ?, ?)",
                [title, description, clickup_url, clickup_task_id, project_id]
            );
            return result.lastID;
        },
        findByClickUpUrl: async (url) => {
            return await db.get("SELECT * FROM tasks WHERE clickup_url = ?", [url]);
        },
        getById: async (id) => {
             return await db.get(`
                SELECT t.*, p.name as project_name, p.clockify_project_id, p.clockify_custom_field_id, p.company_id, c.name as company_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN companies c ON p.company_id = c.id
                WHERE t.id = ?
            `, [id]);
        },
        list: async () => {
            return await db.all(`
                SELECT t.id, t.title, t.clickup_url, t.status, t.project_id, t.clickup_task_id, t.description, p.name as project_name, p.company_id, c.name as company_name
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN companies c ON p.company_id = c.id
                ORDER BY t.created_at DESC
            `);
        },
        update: async (taskData) => {
            const { id, title, clickup_url, project_id } = taskData;
            const result = await db.run("UPDATE tasks SET title = ?, clickup_url = ?, project_id = ? WHERE id = ?", [title, clickup_url, project_id, id]);
            return result.changes;
        },
        delete: async (taskId) => {
            const result = await db.run("DELETE FROM tasks WHERE id = ?", [taskId]);
            return result.changes;
        }
    },
    workLogs: {
        add: async (task_id, documentation, hours_worked, log_date, flags = {}) => {
            const { is_clickup_synced = 0, is_clockify_synced = 0 } = flags;
            return await db.run(
                "INSERT INTO work_logs (task_id, documentation, hours_worked, log_date, is_clickup_synced, is_clockify_synced) VALUES (?, ?, ?, ?, ?, ?)",
                [task_id, documentation, hours_worked, log_date, is_clickup_synced, is_clockify_synced]
            );
        },
        getForTask: async (taskId) => {
            return await db.all("SELECT * FROM work_logs WHERE task_id = ? ORDER BY log_date DESC, created_at DESC", [taskId]);
        }
    }
});