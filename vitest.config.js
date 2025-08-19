import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Configuração padrão para a maioria dos testes
    environment: 'jsdom',
    // Define um "pool" de threads para isolar os ambientes
    pool: 'threads',
  },
});