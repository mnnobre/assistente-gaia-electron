// /src/main/repositories/commandsRepository.js
module.exports = (db) => ({
    getPinned: async (aiModelKey) => {
        const results = await db.all("SELECT command_string FROM pinned_commands WHERE ai_model_key = ?", [aiModelKey]);
        return results.map(row => row.command_string);
    },

    setPinned: async (aiModelKey, commandsArray = []) => {
        await db.exec('BEGIN TRANSACTION');
        try {
            await db.run("DELETE FROM pinned_commands WHERE ai_model_key = ?", [aiModelKey]);
            if (commandsArray.length > 0) {
                const stmt = await db.prepare("INSERT INTO pinned_commands (ai_model_key, command_string) VALUES (?, ?)");
                for (const commandString of commandsArray) {
                    await stmt.run(aiModelKey, commandString);
                }
                await stmt.finalize();
            }
            await db.exec('COMMIT');
        } catch (error) {
            await db.exec('ROLLBACK');
            console.error("[CommandsRepository] Erro ao salvar comandos fixados:", error);
            throw error;
        }
    }
});