// /src/main/repositories/settingsRepository.js
module.exports = (db) => ({
    get: async (key) => {
        const result = await db.get("SELECT value FROM settings WHERE key = ?", [key]);
        return result ? result.value : null;
    },
    set: async (key, value) => {
        return await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    }
});