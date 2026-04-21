declare module '@tailwindcss/vite' {
  import type { Plugin } from 'vite'
  function tailwindcss(): Plugin
  export default tailwindcss
}
