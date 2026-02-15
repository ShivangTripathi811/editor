# GeeksCode - Advanced Code Editor

GeeksCode is a high-performance, feature-rich code editor built with Electron, React, and Node.js. It is designed for competitive programmers and developers who require a streamlined, AI-integrated workflow. This editor combines a modern UI with powerful tools like an integrated terminal, Codeforces problem explorer, AI-powered assistance, and automated test case generation.

## Key Features

### Core Functionality

- **Monaco Editor Integration**: Full-featured code editing experience with syntax highlighting and intelligent code completion.
- **Integrated Terminal**: Seamlessly run commands and scripts without leaving the editor.
- **File Explorer**: Efficiently manage your project files and folders.
- **Tab Management**: Work on multiple files simultaneously with an intuitive tab system.

### Competitive Programming Tools

- **Codeforces Integration**: Browse, filter, and view Codeforces problems directly within the sidebar.
- **Problem Viewer**: Read problem statements and submit solutions.
- **Quick Open**: Rapidly navigate between files and symbols.

### AI & Automation

- **AI Chat Assistant**: Built-in AI chat for code explanations, debugging, and generation.
- **RAG (Retrieval-Augmented Generation)**: Context-aware AI responses based on your project codebase.
- **Test Case Generator**: Automatically generate input/output test cases for your code using AI. Supports custom constraints (e.g., Max Input Length).
- **Code Runner**: Execute your code instantly with a single click.

### Advanced Search

- **Cpp/Header Search**: specialized search panel to quickly find text within `.cpp`, `.h`, `.hpp`, and `.c` files.
- **Real-time Filtering**: fast search results with file preview snippets.

## Installation

Ensure you have Node.js and Yarn installed on your system.

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd GeeksCode

# Install dependencies
yarn install
```

## Running the Application

To start the application in development mode:

```bash
yarn start
```

This command concurrently runs the Vite development server and the Electron application.

## Building for Production

To create a production build for your operating system:

```bash
# General build
yarn build

# Linux AppImage build
yarn build:linux
```

## Project Structure

- **src/**: React frontend source code.
  - **components/**: UI components (Sidebar, Editor, Terminal, etc.).
  - **utils/**: Utility functions and helper classes.
- **electron/**: Main process logic (main.js, preload.js).
- **dist/**: Production build artifacts.

## Technologies Used

- **Electron**: Cross-platform desktop application framework.
- **React**: Frontend library for building user interfaces.
- **Vite**: Fast build tool and development server.
- **Monaco Editor**: The code editor that powers VS Code.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Node-pty**: Terminal emulation.

## License

This project is licensed under the MIT License.
