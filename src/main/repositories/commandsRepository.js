// /src/main/repositories/commandsRepository.js (REFATORADO)
module.exports = (db) => ({
    /**
     * Busca todas as configurações de comandos para um modelo de IA específico.
     * @param {string} aiModelKey - A chave do modelo de IA (ex: 'gpt-4o-mini').
     * @returns {Promise<Map<string, {is_quick_action: boolean, is_direct_action: boolean}>>}
     */
    getSettingsForModel: async (aiModelKey) => {
        const results = await db.all(
            "SELECT command_string, is_quick_action, is_direct_action FROM command_settings WHERE ai_model_key = ?",
            [aiModelKey]
        );
        
        const settingsMap = new Map();
        results.forEach(row => {
            settingsMap.set(row.command_string, {
                is_quick_action: !!row.is_quick_action,
                is_direct_action: !!row.is_direct_action
            });
        });
        return settingsMap;
    },

    /**
     * Atualiza ou insere a configuração para um comando específico.
     * @param {string} aiModelKey - A chave do modelo de IA.
     * @param {string} commandString - O comando a ser configurado (ex: '/nota adicionar').
     * @param {object} settings - O objeto com as configurações.
     * @param {boolean} settings.is_quick_action - Deve aparecer na barra de atalhos?
     * @param {boolean} settings.is_direct_action - Deve executar sem pedir mais input?
     */
    updateCommandSetting: async (aiModelKey, commandString, { is_quick_action, is_direct_action }) => {
        try {
            await db.run(
                `INSERT OR REPLACE INTO command_settings (command_string, ai_model_key, is_quick_action, is_direct_action) 
                 VALUES (?, ?, ?, ?)`,
                [commandString, aiModelKey, is_quick_action ? 1 : 0, is_direct_action ? 1 : 0]
            );
        } catch (error) {
            console.error(`[CommandsRepository] Erro ao atualizar configuração para "${commandString}":`, error);
            throw error;
        }
    }
});