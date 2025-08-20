// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./src/renderer/**/*.html",
    "./plugins/**/*.html",
  ],
  
  theme: {
    extend: {},
  },

  plugins: [
    require('daisyui') // Apenas o daisyUI aqui
  ],

  daisyui: {
    themes: ["light", "night"], // Os temas que você quer
  },
}