// /src/main/repositories/memoryRepository.js
module.exports = (db) => ({
    addTurn: async (userPrompt, modelResponse) => {
        const today = new Date().toISOString().split('T')[0];
        let session = await db.get("SELECT id FROM memory_sessions WHERE session_date = ?", [today]);
        if (!session) {
            const result = await db.run("INSERT INTO memory_sessions (session_date) VALUES (?)", [today]);
            session = { id: result.lastID };
        }
        await db.run("INSERT INTO memory_turns (session_id, user_prompt, model_response) VALUES (?, ?, ?)", [session.id, userPrompt, modelResponse]);
    },

    getSessions: async () => {
        return await db.all("SELECT * FROM memory_sessions ORDER BY session_date DESC");
    },

    getTurnsForSession: async (sessionId) => {
        return await db.all("SELECT * FROM memory_turns WHERE session_id = ? ORDER BY timestamp ASC", [sessionId]);
    },

    updateTurnContent: async (turnId, userPrompt, modelResponse) => {
        const result = await db.run("UPDATE memory_turns SET user_prompt = ?, model_response = ? WHERE id = ?", [userPrompt, modelResponse, turnId]);
        return result.changes;
    },

    setTurnPinnedStatus: async (turnId, isPinned) => {
        const result = await db.run("UPDATE memory_turns SET is_pinned = ? WHERE id = ?", [isPinned ? 1 : 0, turnId]);
        return result.changes;
    },

    getPinnedTurns: async () => {
        return await db.all("SELECT * FROM memory_turns WHERE is_pinned = 1 ORDER BY timestamp DESC");
    }
});