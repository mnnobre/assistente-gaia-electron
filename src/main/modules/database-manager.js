// /modules/database-manager.js
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

let db = null;

async function initializeDatabase(app) {
  if (db) return db;
  try {
    const dbPath = path.join(app.getPath("userData"), "assistente.db");
    db = await open({ filename: dbPath, driver: sqlite3.Database });

    await db.exec(`
            PRAGMA foreign_keys = ON;
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL UNIQUE,
                platform TEXT CHECK(platform IN ('PC', 'PS5', 'Switch', 'Outro')) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );
            
            CREATE TABLE IF NOT EXISTS game_tags (
                game_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (game_id, tag_id)
            );

            -- INÍCIO DA ALTERAÇÃO --
            CREATE TABLE IF NOT EXISTS game_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                log_text TEXT NOT NULL,
                mood_rating INTEGER CHECK(mood_rating >= 1 AND mood_rating <= 5),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );
            -- FIM DA ALTERAÇÃO --

            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                full_audio_me BLOB,
                full_audio_other BLOB
            );

            CREATE TABLE IF NOT EXISTS transcripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                speaker TEXT NOT NULL,
                text TEXT NOT NULL,
                audio_blob BLOB,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS scribe_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                context TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender TEXT NOT NULL,
                content TEXT NOT NULL,
                is_html INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memory_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_date TEXT NOT NULL UNIQUE,
                title TEXT,
                summary TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS memory_turns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                user_prompt TEXT NOT NULL,
                model_response TEXT NOT NULL,
                is_pinned INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES memory_sessions (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                company_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                clickup_url TEXT UNIQUE,
                project_id INTEGER NOT NULL,
                status TEXT DEFAULT 'open',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS work_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                documentation TEXT,
                hours_worked REAL NOT NULL,
                log_date DATETIME NOT NULL,
                is_clickup_synced INTEGER DEFAULT 0,
                is_clockify_synced INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
            );
        `);
    
    const meetingsInfo = await db.all("PRAGMA table_info(meetings)");
    if (!meetingsInfo.some(col => col.name === 'full_audio_me')) {
        await db.exec("ALTER TABLE meetings ADD COLUMN full_audio_me BLOB");
    }
    if (!meetingsInfo.some(col => col.name === 'full_audio_other')) {
        await db.exec("ALTER TABLE meetings ADD COLUMN full_audio_other BLOB");
    }

    return db;
  } catch (error) {
    console.error("[Database] Erro ao inicializar o banco de dados:", error);
    throw error;
  }
}

async function getSetting(key) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.get("SELECT value FROM settings WHERE key = ?", [key]);
    return result ? result.value : null;
}

async function setSetting(key, value) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
}

// --- FUNÇÕES DO MÓDULO HOBBIE / G.A.I.A. ---

async function addGame(title, platform, tags = []) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    
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
        console.error("[Database Hobbie] Erro ao adicionar jogo:", error);
        throw error;
    }
}

async function listGames() {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all(`
        SELECT
            g.id,
            g.title,
            g.platform,
            GROUP_CONCAT(t.name, ', ') AS tags
        FROM games g
        LEFT JOIN game_tags gt ON g.id = gt.game_id
        LEFT JOIN tags t ON gt.tag_id = t.id
        GROUP BY g.id
        ORDER BY g.title ASC
    `);
}

async function findGamesByTag(tagName) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const normalizedTag = tagName.trim().toLowerCase();
    return await db.all(`
        SELECT DISTINCT g.*
        FROM games g
        JOIN game_tags gt ON g.id = gt.game_id
        JOIN tags t ON gt.tag_id = t.id
        WHERE t.name = ?
    `, [normalizedTag]);
}

async function findGamesByTags(tagNames = []) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    if (tagNames.length === 0) return [];
    
    const normalizedTags = tagNames.map(t => t.trim().toLowerCase());
    const placeholders = normalizedTags.map(() => '?').join(',');

    const query = `
        SELECT DISTINCT g.*
        FROM games g
        JOIN game_tags gt ON g.id = gt.game_id
        JOIN tags t ON gt.tag_id = t.id
        WHERE t.name IN (${placeholders})
    `;
    
    return await db.all(query, normalizedTags);
}

// --- INÍCIO DA ALTERAÇÃO --
/**
 * Adiciona um novo registro de log de jogo.
 * @param {number} gameId - O ID do jogo.
 * @param {string} logText - O texto da anotação.
 * @param {number|null} moodRating - A nota de humor (1-5), opcional.
 * @returns {Promise<number>} O ID do log inserido.
 */
async function addGameLog(gameId, logText, moodRating = null) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run(
        "INSERT INTO game_logs (game_id, log_text, mood_rating) VALUES (?, ?, ?)",
        [gameId, logText, moodRating]
    );
    return result.lastID;
}
// --- FIM DA ALTERAÇÃO --

async function addNote(content) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  await db.run("INSERT INTO notes (content) VALUES (?)", [content]);
}
async function listNotes() {
  if (!db) throw new Error("Banco de dados não inicializado.");
  return await db.all("SELECT * FROM notes ORDER BY created_at DESC");
}
async function clearNotes() {
  if (!db) throw new Error("Banco de dados não inicializado.");
  await db.run("DELETE FROM notes");
}
async function deleteNoteById(id) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  const result = await db.run("DELETE FROM notes WHERE id = ?", [id]);
  return result.changes;
}

async function createMeeting(title) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  const result = await db.run("INSERT INTO meetings (title) VALUES (?)", [
    title,
  ]);
  return result.lastID;
}

async function updateMeetingFullAudio(meetingId, speaker, audioBuffer) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const columnName = speaker === 'me' ? 'full_audio_me' : 'full_audio_other';
    const sql = `UPDATE meetings SET ${columnName} = ? WHERE id = ?`;
    await db.run(sql, [audioBuffer, meetingId]);
}

async function addTranscript(meeting_id, speaker, text, audioBuffer) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  await db.run(
    "INSERT INTO transcripts (meeting_id, speaker, text, audio_blob) VALUES (?, ?, ?, ?)",
    [meeting_id, speaker, text, audioBuffer]
  );
}

async function addScribeAnalysis(meetingId, context, question, answer) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    await db.run(
        "INSERT INTO scribe_analyses (meeting_id, context, question, answer) VALUES (?, ?, ?, ?)",
        [meetingId, context, question, answer]
    );
}

async function getScribeAnalysesForMeeting(meetingId) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all(
        "SELECT * FROM scribe_analyses WHERE meeting_id = ? ORDER BY created_at ASC",
        [meetingId]
    );
}

async function listMeetings() {
  if (!db) throw new Error("Banco de dados não inicializado.");
  return await db.all(
    "SELECT id, title, created_at FROM meetings ORDER BY created_at DESC"
  );
}

async function getMeetingById(id) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  return await db.get("SELECT id, title, created_at, full_audio_me, full_audio_other FROM meetings WHERE id = ?", [id]);
}

async function getTranscriptsForMeeting(meeting_id) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  return await db.all(
    "SELECT speaker, text, timestamp, audio_blob FROM transcripts WHERE meeting_id = ? ORDER BY timestamp ASC",
    [meeting_id]
  );
}
async function deleteMeetingById(id) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  const result = await db.run("DELETE FROM meetings WHERE id = ?", [id]);
  return result.changes;
}
async function clearAllMeetings() {
  if (!db) throw new Error("Banco de dados não inicializado.");
  await db.run("DELETE FROM meetings");
}

async function addChatMessage(sender, content, is_html = 0) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  await db.run(
    "INSERT INTO chat_history (sender, content, is_html) VALUES (?, ?, ?)",
    [sender, content, is_html]
  );
}

async function addTodo(task) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  const result = await db.run("INSERT INTO todos (task) VALUES (?)", [task]);
  return result.lastID;
}
async function listTodos() {
  if (!db) throw new Error("Banco de dados não inicializado.");
  return await db.all(
    "SELECT * FROM todos ORDER BY status ASC, created_at DESC"
  );
}
async function updateTodoStatus(id, status) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  const result = await db.run("UPDATE todos SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
  return result.changes;
}
async function deleteTodo(id) {
  if (!db) throw new Error("Banco de dados não inicializado.");
  const result = await db.run("DELETE FROM todos WHERE id = ?", [id]);
  return result.changes;
}

async function addMemoryTurn(userPrompt, modelResponse) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const today = new Date().toISOString().split('T')[0];
    let session = await db.get("SELECT id FROM memory_sessions WHERE session_date = ?", [today]);
    if (!session) {
        const result = await db.run("INSERT INTO memory_sessions (session_date) VALUES (?)", [today]);
        session = { id: result.lastID };
    }
    await db.run(
        "INSERT INTO memory_turns (session_id, user_prompt, model_response) VALUES (?, ?, ?)",
        [session.id, userPrompt, modelResponse]
    );
}
async function getMemorySessions() {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all("SELECT * FROM memory_sessions ORDER BY session_date DESC");
}
async function getTurnsForSession(sessionId) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all("SELECT * FROM memory_turns WHERE session_id = ? ORDER BY timestamp ASC", [sessionId]);
}
async function updateSessionTitle(sessionId, title) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("UPDATE memory_sessions SET title = ? WHERE id = ?", [title, sessionId]);
    return result.changes;
}
async function updateSessionSummary(sessionId, summary) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("UPDATE memory_sessions SET summary = ? WHERE id = ?", [summary, sessionId]);
    return result.changes;
}
async function updateTurnContent(turnId, userPrompt, modelResponse) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("UPDATE memory_turns SET user_prompt = ?, model_response = ? WHERE id = ?", [userPrompt, modelResponse, turnId]);
    return result.changes;
}
async function setTurnPinnedStatus(turnId, isPinned) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("UPDATE memory_turns SET is_pinned = ? WHERE id = ?", [isPinned ? 1 : 0, turnId]);
    return result.changes;
}
async function getPinnedTurns() {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all("SELECT * FROM memory_turns WHERE is_pinned = 1 ORDER BY timestamp DESC");
}

async function addCompany(name) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("INSERT INTO companies (name) VALUES (?)", [name]);
    return result.lastID;
}
async function listCompanies() {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all("SELECT * FROM companies ORDER BY name ASC");
}

async function addProject(name, company_id) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("INSERT INTO projects (name, company_id) VALUES (?, ?)", [name, company_id]);
    return result.lastID;
}
async function listProjectsByCompany(company_id) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all("SELECT * FROM projects WHERE company_id = ? ORDER BY name ASC", [company_id]);
}

async function addTask(title, clickup_url, project_id) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("INSERT INTO tasks (title, clickup_url, project_id) VALUES (?, ?, ?)", [title, clickup_url, project_id]);
    return result.lastID;
}
async function listTasks() {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all(`
        SELECT 
            t.id, t.title, t.clickup_url, t.status, t.project_id,
            p.name as project_name, p.company_id,
            c.name as company_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN companies c ON p.company_id = c.id
        ORDER BY t.created_at DESC
    `);
}
async function updateTask(taskData) {
    const { id, title, clickup_url, project_id } = taskData;
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run(
        "UPDATE tasks SET title = ?, clickup_url = ?, project_id = ? WHERE id = ?",
        [title, clickup_url, project_id, id]
    );
    return result.changes;
}
async function deleteTask(taskId) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    const result = await db.run("DELETE FROM tasks WHERE id = ?", [taskId]);
    return result.changes;
}

async function addWorkLog(task_id, documentation, hours_worked, log_date) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    await db.run(
        "INSERT INTO work_logs (task_id, documentation, hours_worked, log_date) VALUES (?, ?, ?, ?)",
        [task_id, documentation, hours_worked, log_date]
    );
}
async function getWorkLogsForTask(taskId) {
    if (!db) throw new Error("Banco de dados não inicializado.");
    return await db.all(
        "SELECT * FROM work_logs WHERE task_id = ? ORDER BY log_date DESC, created_at DESC",
        [taskId]
    );
}

module.exports = {
  initializeDatabase,
  settings: {
      get: getSetting,
      set: setSetting,
  },
  hobbie: {
      addGame,
      listGames,
      findGamesByTag,
      findGamesByTags,
      addGameLog, // <-- NOVA EXPORTAÇÃO
  },
  notes: { add: addNote, list: listNotes, clear: clearNotes, delete: deleteNoteById },
  scribe: { 
      createMeeting, 
      addTranscript, 
      listMeetings, 
      getMeetingById, 
      getTranscriptsForMeeting, 
      deleteMeetingById, 
      clearAll: clearAllMeetings,
      updateMeetingFullAudio,
      addScribeAnalysis,
      getScribeAnalysesForMeeting
  },
  chatHistory: { add: addChatMessage },
  todos: { add: addTodo, list: listTodos, update: updateTodoStatus, delete: deleteTodo },
  memory: {
      addTurn: addMemoryTurn,
      getSessions: getMemorySessions,
      getTurnsForSession: getTurnsForSession,
      updateSessionTitle: updateSessionTitle,
      updateSessionSummary: updateSessionSummary,
      updateTurnContent: updateTurnContent,
      setTurnPinnedStatus: setTurnPinnedStatus,
      getPinnedTurns: getPinnedTurns
  },
  taskHub: {
      companies: { add: addCompany, list: listCompanies },
      projects: { add: addProject, listByCompany: listProjectsByCompany },
      tasks: { 
          add: addTask, 
          list: listTasks,
          update: updateTask,
          delete: deleteTask
      },
      workLogs: { 
          add: addWorkLog,
          getForTask: getWorkLogsForTask
      }
  }
};