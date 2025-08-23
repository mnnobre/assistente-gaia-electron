// /src/main/repositories/todoRepository.js
module.exports = (db) => ({
    add: async (task) => {
        const result = await db.run("INSERT INTO todos (task) VALUES (?)", [task]);
        return result.lastID;
    },
    list: async () => {
        return await db.all("SELECT * FROM todos ORDER BY status ASC, created_at DESC");
    },
    update: async (id, status) => {
        const result = await db.run("UPDATE todos SET status = ? WHERE id = ?", [status, id]);
        return result.changes;
    },
    delete: async (id) => {
        const result = await db.run("DELETE FROM todos WHERE id = ?", [id]);
        return result.changes;
    }
});