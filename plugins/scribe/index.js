// /plugins/scribe/index.js

const audioManager = require("../../src/main/modules/audio-manager.js");
const dbManager = require("../../src/main/modules/database-manager.js");

module.exports = {
  command: "reuniao",
  description: "Grava, transcreve e gerencia as suas reuniões.",
  
  subcommands: {
    'iniciar': 'Começa a gravar e transcrever a reunião atual.',
    'parar': 'Para a gravação da reunião.',
    'listar': 'Lista todas as reuniões que foram gravadas.',
    'mostrar': 'Abre a janela de uma reunião específica. (Ex: /reuniao mostrar 1)',
    'deletar': 'Apaga uma reunião específica. (Ex: /reuniao deletar 1)',
    'limpar': 'Apaga TODAS as reuniões gravadas permanentemente.'
  },
  
  parameters: {
    type: "object",
    description: "Argumentos para gerenciar as gravações de reuniões.",
    properties: {
      subcommand: {
        type: "string",
        description: "A ação a ser executada.",
        enum: ["iniciar", "parar", "listar", "mostrar", "deletar", "limpar"],
      },
      id: {
        type: "number",
        description: "O ID numérico da reunião para os subcomandos 'mostrar' e 'deletar'.",
      },
    },
    required: []
  },

  initialize: async (app, dependencies) => {},

  // --- INÍCIO DA MODIFICAÇÃO ---
  // A função execute agora recebe ambas as funções de criação de janela
  execute: async (args, app, { createScribeWindow, createLiveScribeWindow } = {}) => {
  // --- FIM DA MODIFICAÇÃO ---
    let subcommand, id;

    if (Array.isArray(args)) {
        const commandMap = { 
            'iniciar': 'iniciar', 'start': 'iniciar', 
            'parar': 'parar', 'stop': 'parar', 
            'listar': 'listar', 'list': 'listar', 
            'mostrar': 'mostrar', 'show': 'mostrar', 
            'deletar': 'deletar', 'delete': 'deletar',
            'limpar': 'limpar', 'clear': 'limpar'
        };
        const firstArg = args[0]?.toLowerCase();
        subcommand = commandMap[firstArg];
        id = parseInt(args[1], 10);
    } else {
        subcommand = args.subcommand?.toLowerCase();
        id = args.id;
    }

    try {
      switch (subcommand) {
        case "iniciar":
          // --- INÍCIO DA MODIFICAÇÃO ---
          // Agora também chamamos a função para criar a janela ao vivo
          if (createLiveScribeWindow) {
            createLiveScribeWindow();
          }
          audioManager.start();
          // Retornamos uma ação para suprimir a mensagem "Ok, gravação iniciada" do chat
          return { type: 'action', action: 'suppress_chat_response' };
          // --- FIM DA MODIFICAÇÃO ---

        case "parar":
          audioManager.stop();
          return { success: true, message: "Gravação da reunião finalizada. O áudio está sendo processado e salvo." };

        case "listar":
          const meetings = await dbManager.scribe.listMeetings();
          if (meetings.length === 0) {
            return { success: true, message: "Você ainda não tem nenhuma reunião gravada." };
          }
          return { type: 'list_response', content: meetings };

        case "mostrar":
          if (!id || isNaN(id)) {
            return { success: false, message: "Por favor, me diga o número (ID) da reunião que você quer ver." };
          }
          if (createScribeWindow) {
            createScribeWindow(id);
            return { type: 'action', action: 'suppress_chat_response' };
          }
          return { success: false, message: "Erro interno: não foi possível abrir a janela da reunião." };

        case "deletar":
          if (!id || isNaN(id)) {
            return { success: false, message: "Por favor, forneça o número (ID) da reunião que você quer deletar." };
          }
          const changes = await dbManager.scribe.deleteMeetingById(id);
          return { success: true, message: changes > 0 ? `Reunião ID ${id} deletada.` : `Nenhuma reunião encontrada com o ID ${id}.` };

        case "limpar":
            await dbManager.scribe.clearAll();
            return { success: true, message: "Ok, todas as reuniões foram permanentemente apagadas." };

        default:
          return { success: false, message: `Comando para /reuniao inválido. Use: iniciar, parar, listar, mostrar, deletar ou limpar.` };
      }
    } catch (error) {
      return { success: false, message: "Ocorreu um erro interno no plugin de reuniões." };
    }
  },
};