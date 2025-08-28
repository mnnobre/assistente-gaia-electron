// /src/renderer/js/modules/store.js (Composição Corrigida)
// =================================================================================
// MODULE: APPLICATION STORE (Zustand Composer)
// =================================================================================

import { createStore } from "../vendor/vanilla.mjs";
import { subscribeWithSelector } from "../vendor/middleware.mjs";

import { createAiSlice } from "./storeSlices/aiSlice.js";
import { createCommandSlice } from "./storeSlices/commandSlice.js";
import { createContextSlice } from "./storeSlices/contextSlice.js";
import { createPlayerSlice } from "./storeSlices/playerSlice.js";
import { createPomodoroSlice } from "./storeSlices/pomodoroSlice.js";
import { createUiSlice } from "./storeSlices/uiSlice.js";

// --- INÍCIO DA CORREÇÃO ---
// A "store definition" agora é a combinação de todos os nossos slices.
// O padrão `(...args)` passa os argumentos (set, get, api) de forma transparente
// para cada slice que está sendo criado.
const storeDefinition = (...args) => ({
  ...createAiSlice(...args),
  ...createCommandSlice(...args),
  ...createContextSlice(...args),
  ...createPlayerSlice(...args),
  ...createPomodoroSlice(...args),
  ...createUiSlice(...args),
  
  // A ação de reset agora é definida no nível superior
  reset: () => {}, // Placeholder, será redefinida abaixo
});


// Criamos a store primeiro para obter acesso à função `set` original.
export const store = createStore(subscribeWithSelector(storeDefinition));

// Capturamos o estado inicial para usá-lo na ação de reset.
const initialState = store.getState();

// Agora, definimos a ação de reset corretamente, usando o estado inicial capturado.
store.setState({
  ...store.getState(),
  reset: () => store.setState(initialState),
});

// Finalmente, exportamos a `getState` para conveniência.
export const getState = store.getState;
// --- FIM DA CORREÇÃO ---