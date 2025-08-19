const fs = require('fs');
const path = require('path');

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.loadPlugins();
    }

    loadPlugins() {
        // CORREÇÃO AQUI: Volta dois diretórios (de 'modules' para 'main', de 'main' para 'src')
        // para encontrar a pasta 'plugins' que está na raiz.
        const pluginsDir = path.join(__dirname, '..', '..', '..', 'plugins');
        try {
            const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            for (const folder of pluginFolders) {
                try {
                    const pluginPath = path.join(pluginsDir, folder, 'index.js');
                    delete require.cache[require.resolve(pluginPath)];
                    const plugin = require(pluginPath);

                    if (plugin.command && typeof plugin.execute === 'function') {
                        const commandName = plugin.command.startsWith('/') ? plugin.command.substring(1) : plugin.command;
                        plugin.command = commandName; 
                        this.plugins.set(commandName, plugin);
                    }
                } catch (error) {
                    console.error(`[PluginManager] FALHA ao carregar o plugin da pasta "${folder}".`, error);
                }
            }
        } catch (error) {
            console.error(`[PluginManager] Não foi possível ler o diretório de plugins: ${pluginsDir}`, error);
        }
    }

    async initializeAll(app, dependencies) {
        for (const [commandName, plugin] of this.plugins.entries()) {
            if (typeof plugin.initialize === 'function') {
                try {
                    await plugin.initialize(app, dependencies);
                    console.log(`[PluginManager] Plugin "/${commandName}" inicializado.`);
                } catch (error) {
                     console.error(`[PluginManager] FALHA ao inicializar o plugin "/${commandName}".`, error);
                }
            }
        }
    }

    async handleCommand(userInput, app, mainProcessContext = {}) {
        const args = userInput.trim().split(/\s+/);
        const commandNameWithSlash = args.shift().toLowerCase();
        
        if (commandNameWithSlash === '/help') {
            const commands = this.getCommandList();
            let helpText = "### Comandos Disponíveis\n\n";
            for (const cmd of commands) {
                helpText += `* **${cmd.command}**: ${cmd.description}\n`;
            }
            return { type: 'direct_response', content: helpText };
        }
        if (commandNameWithSlash === '/clear') return { type: 'action', action: 'clear_chat' };
        
        const commandName = commandNameWithSlash.substring(1);
        const plugin = this.plugins.get(commandName);
        
        if (plugin) {
            try {
                return await plugin.execute(args, app, mainProcessContext);
            } catch (error) {
                console.error(`[PluginManager] Erro ao executar o comando "${commandNameWithSlash}":`, error);
                return { type: 'direct_response', content: `Ocorreu um erro inesperado ao executar o comando.` };
            }
        }
        
        return { type: "direct_response", content: `Comando "${commandNameWithSlash}" não reconhecido. Digite /help para ver a lista de comandos.` };
    }

    getCommandList() {
        const commandList = [...this.plugins.values()].map(plugin => ({
            command: `/${plugin.command}`,
            description: plugin.description || '',
            subcommands: plugin.subcommands || null
        }));

        commandList.push({ command: '/clear', description: 'Limpa o histórico da conversa atual.', subcommands: null });
        commandList.push({ command: '/help', description: 'Mostra esta lista de comandos.', subcommands: null });

        return commandList.sort((a, b) => a.command.localeCompare(b.command));
    }
}

module.exports = new PluginManager();