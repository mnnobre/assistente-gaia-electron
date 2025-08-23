// /src/main/repositories/taskHubRepository.js
module.exports = (db) => ({
    companies: {
        add: async (name) => {
            const result = await db.run("INSERT INTO companies (name) VALUES (?)", [name]);
            return result.lastID;
        },
        list: async () => {
            return await db.all("SELECT * FROM companies ORDER BY name ASC");
        }
    },
    projects: {
        add: async (name, company_id) => {
            const result = await db.run("INSERT INTO projects (name, company_id) VALUES (?, ?)", [name, company_id]);
            return result.lastID;
        },
        listByCompany: async (company_id) => {
            return await db.all("SELECT * FROM projects WHERE company_id = ? ORDER BY name ASC", [company_id]);
        }
    },
    tasks: {
        add: async (title, clickup_url, project_id) => {
            const result = await db.run("INSERT INTO tasks (title, clickup_url, project_id) VALUES (?, ?, ?)", [title, clickup_url, project_id]);
            return result.lastID;
        },
        list: async () => {
            return await db.all(`
                SELECT t.id, t.title, t.clickup_url, t.status, t.project_id, p.name as project_name, p.company_id, c.name as company_name
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
        add: async (task_id, documentation, hours_worked, log_date) => {
            return await db.run("INSERT INTO work_logs (task_id, documentation, hours_worked, log_date) VALUES (?, ?, ?, ?)", [task_id, documentation, hours_worked, log_date]);
        },
        getForTask: async (taskId) => {
            return await db.all("SELECT * FROM work_logs WHERE task_id = ? ORDER BY log_date DESC, created_at DESC", [taskId]);
        }
    }
});