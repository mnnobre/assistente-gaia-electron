// /src/main/modules/database-manager.js (REFATORADO)
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

// 1. Importa as "fábricas" de cada repositório
const createSettingsRepository = require('../repositories/settingsRepository');
const createHobbieRepository = require('../repositories/hobbieRepository');
const createCommandsRepository = require('../repositories/commandsRepository');
const createNotesRepository = require('../repositories/notesRepository');
const createScribeRepository = require('../repositories/scribeRepository');
const createChatHistoryRepository = require('../repositories/chatHistoryRepository');
const createTodoRepository = require('../repositories/todoRepository');
const createMemoryRepository = require('../repositories/memoryRepository');
const createTaskHubRepository = require('../repositories/taskHubRepository');

let dbConnection = null;

// A função de inicialização agora é privada deste módulo
async function connectAndMigrate(app) {
    if (dbConnection) return dbConnection;
    try {
        const dbPath = path.join(app.getPath("userData"), "assistente.db");
        const db = await open({ filename: dbPath, driver: sqlite3.Database });

        // Toda a lógica de criação de tabelas e migrações permanece aqui
        await db.exec(`
            PRAGMA foreign_keys = ON;
            
            CREATE TABLE IF NOT EXISTS settings ( key TEXT PRIMARY KEY NOT NULL, value TEXT );
            CREATE TABLE IF NOT EXISTS games ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE, platform TEXT CHECK(platform IN ('PC', 'PS5', 'Switch', 'Outro')) NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS tags ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE );
            CREATE TABLE IF NOT EXISTS game_tags ( game_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (game_id, tag_id) );
            CREATE TABLE IF NOT EXISTS game_logs ( id INTEGER PRIMARY KEY AUTOINCREMENT, game_id INTEGER NOT NULL, log_text TEXT NOT NULL, mood_rating INTEGER CHECK(mood_rating >= 1 AND mood_rating <= 5), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE );
            CREATE TABLE IF NOT EXISTS pinned_commands ( id INTEGER PRIMARY KEY AUTOINCREMENT, ai_model_key TEXT NOT NULL, command_string TEXT NOT NULL, UNIQUE(ai_model_key, command_string) );
            CREATE TABLE IF NOT EXISTS notes ( id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS meetings ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, full_audio_me BLOB, full_audio_other BLOB );
            CREATE TABLE IF NOT EXISTS transcripts ( id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id INTEGER NOT NULL, speaker TEXT NOT NULL, text TEXT NOT NULL, audio_blob BLOB, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE );
            CREATE TABLE IF NOT EXISTS scribe_analyses ( id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id INTEGER NOT NULL, context TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE );
            CREATE TABLE IF NOT EXISTS chat_history ( id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT NOT NULL, content TEXT NOT NULL, is_html INTEGER DEFAULT 0, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS todos ( id INTEGER PRIMARY KEY AUTOINCREMENT, task TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS memory_sessions ( id INTEGER PRIMARY KEY AUTOINCREMENT, session_date TEXT NOT NULL UNIQUE, title TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS memory_turns ( id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, user_prompt TEXT NOT NULL, model_response TEXT NOT NULL, is_pinned INTEGER DEFAULT 0, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES memory_sessions (id) ON DELETE CASCADE );
            CREATE TABLE IF NOT EXISTS companies ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS projects ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE );
            CREATE TABLE IF NOT EXISTS tasks ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, clickup_url TEXT UNIQUE, project_id INTEGER NOT NULL, status TEXT DEFAULT 'open', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE );
            CREATE TABLE IF NOT EXISTS work_logs ( id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, documentation TEXT, hours_worked REAL NOT NULL, log_date DATETIME NOT NULL, is_clickup_synced INTEGER DEFAULT 0, is_clockify_synced INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE );
        `);
        
        const gamesTableInfo = await db.all("PRAGMA table_info(games)");
        if (!gamesTableInfo.some(col => col.name === 'status')) {
            await db.exec("ALTER TABLE games ADD COLUMN status TEXT NOT NULL DEFAULT 'Na Estante'");
        }
        
        const meetingsInfo = await db.all("PRAGMA table_info(meetings)");
        if (!meetingsInfo.some(col => col.name === 'full_audio_me')) {
            await db.exec("ALTER TABLE meetings ADD COLUMN full_audio_me BLOB");
        }
        if (!meetingsInfo.some(col => col.name === 'full_audio_other')) {
            await db.exec("ALTER TABLE meetings ADD COLUMN full_audio_other BLOB");
        }

        dbConnection = db;
        return dbConnection;
    } catch (error) {
        console.error("[Database] Erro ao inicializar o banco de dados:", error);
        throw error;
    }
}

// 2. Cria o objeto que será exportado. Ele começa "vazio".
const dbManager = {
    settings: null,
    hobbie: null,
    commands: null,
    notes: null,
    scribe: null,
    chatHistory: null,
    todos: null,
    memory: null,
    taskHub: null,
    // A função de inicialização é a única coisa pública no início.
    initializeDatabase: async (app) => {
        const db = await connectAndMigrate(app);
        if (!db) {
            throw new Error("Falha ao estabelecer conexão com o banco de dados.");
        }

        // 3. Popula o objeto dbManager com os repositórios instanciados
        dbManager.settings = createSettingsRepository(db);
        dbManager.hobbie = createHobbieRepository(db);
        dbManager.commands = createCommandsRepository(db);
        dbManager.notes = createNotesRepository(db);
        dbManager.scribe = createScribeRepository(db);
        dbManager.chatHistory = createChatHistoryRepository(db);
        dbManager.todos = createTodoRepository(db);
        dbManager.memory = createMemoryRepository(db);
        dbManager.taskHub = createTaskHubRepository(db);

        console.log("[Database] Todos os repositórios foram inicializados.");
        // Retorna a conexão 'db' para compatibilidade com a chamada original
        return db; 
    }
};

module.exports = dbManager;