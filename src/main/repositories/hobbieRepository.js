// /src/main/repositories/hobbieRepository.js
module.exports = (db) => ({
    addGame: async (title, platform, tags = []) => {
        await db.exec('BEGIN TRANSACTION');
        try {
            const gameResult = await db.run("INSERT INTO games (title, platform) VALUES (?, ?)", [title, platform]);
            const gameId = gameResult.lastID;
            for (const tagName of tags) {
                const normalizedTag = tagName.trim().toLowerCase();
                await db.run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [normalizedTag]);
                const tag = await db.get("SELECT id FROM tags WHERE name = ?", [normalizedTag]);
                if (tag) {
                    await db.run("INSERT INTO game_tags (game_id, tag_id) VALUES (?, ?)", [gameId, tag.id]);
                }
            }
            await db.exec('COMMIT');
            return gameId;
        } catch (error) {
            await db.exec('ROLLBACK');
            console.error("[HobbieRepository] Erro ao adicionar jogo:", error);
            throw error;
        }
    },

    listGames: async () => {
        return await db.all(`
            SELECT g.id, g.title, g.platform, g.status, GROUP_CONCAT(t.name, ', ') AS tags
            FROM games g
            LEFT JOIN game_tags gt ON g.id = gt.game_id
            LEFT JOIN tags t ON gt.tag_id = t.id
            GROUP BY g.id
            ORDER BY g.title ASC
        `);
    },

    findGamesByTags: async (tagNames = []) => {
        if (tagNames.length === 0) return [];
        const normalizedTags = tagNames.map(t => t.trim().toLowerCase());
        const placeholders = normalizedTags.map(() => '?').join(',');
        const query = `
            SELECT DISTINCT g.* FROM games g
            JOIN game_tags gt ON g.id = gt.game_id
            JOIN tags t ON gt.tag_id = t.id
            WHERE t.name IN (${placeholders})
        `;
        return await db.all(query, normalizedTags);
    },

    findGameByTitle: async (title) => {
        return await db.get("SELECT * FROM games WHERE LOWER(title) = LOWER(?)", [title.trim()]);
    },

    addGameLog: async (gameId, logText, moodRating = null) => {
        const result = await db.run("INSERT INTO game_logs (game_id, log_text, mood_rating) VALUES (?, ?, ?)", [gameId, logText, moodRating]);
        return result.lastID;
    },

    updateGameStatus: async (gameTitle, newStatus) => {
        const result = await db.run("UPDATE games SET status = ? WHERE LOWER(title) = LOWER(?)", [newStatus, gameTitle.trim()]);
        return result.changes;
    },

    getActiveGames: async () => {
        return await db.all("SELECT * FROM games WHERE status = 'Jogando Atualmente'");
    },

    getRandomPositiveGameLog: async () => {
        return await db.get(`
            SELECT g.title, gl.log_text FROM game_logs gl
            JOIN games g ON gl.game_id = g.id
            WHERE gl.mood_rating >= 4
            ORDER BY RANDOM()
            LIMIT 1;
        `);
    },

    getGameLogs: async () => {
        return await db.all(`
            SELECT gl.id, gl.log_text, gl.mood_rating, gl.created_at, g.title as game_title
            FROM game_logs gl
            JOIN games g ON gl.game_id = g.id
            ORDER BY gl.created_at DESC;
        `);
    }
});