// /src/main/repositories/notesRepository.js
module.exports = (db) => ({
    add: async (content) => {
        return await db.run("INSERT INTO notes (content) VALUES (?)", [content]);
    },
    list: async () => {
        return await db.all("SELECT * FROM notes ORDER BY created_at DESC");
    },
    clear: async () => {
        return await db.run("DELETE FROM notes");
    },
    delete: async (id) => {
        const result = await db.run("DELETE FROM notes WHERE id = ?", [id]);
        return result.changes;
    }
});