/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-activity-bar': '#333333',
        'vscode-text': '#cccccc',
        'vscode-blue': '#007acc',
        'vscode-hover': '#2a2d2e',
        'vscode-selection': '#094771',
        'vscode-tab-active': '#1e1e1e',
        'vscode-tab-inactive': '#2d2d2d',
        'vscode-border': '#2b2b2b',
      },
    },
  },
  plugins: [],
}
