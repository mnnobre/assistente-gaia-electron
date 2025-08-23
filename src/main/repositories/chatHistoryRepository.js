// /src/main/repositories/chatHistoryRepository.js
// (Este repositório não estava sendo usado ativamente, mas separamos para consistência)
module.exports = (db) => ({
    add: async (sender, content, is_html = 0) => {
        return await db.run("INSERT INTO chat_history (sender, content, is_html) VALUES (?, ?, ?)", [sender, content, is_html]);
    }
});