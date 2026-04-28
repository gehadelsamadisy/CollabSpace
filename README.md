# CollabSpace

A real-time collaborative workspace for teams to create documents and manage tasks together.

## Features

- **Real-time Collaboration** - Multiple users can edit documents simultaneously with live updates
- **Task Boards** - Kanban-style task management with To Do, In Progress, Done, and Cancelled columns
- **Drag & Drop** - Move tasks between columns easily
- **User Authentication** - Secure registration and login
- **Sharing** - Share documents and boards with team members
- **Dark Mode** - Modern dark-themed UI

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, JWT, bcryptjs, SQL.js
- **Frontend**: React, Vite, React Router, Socket.IO Client

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
# Install all dependencies
npm install
cd client && npm install && cd ..
```

### Running the App

```bash
# Run both server and client
npm run dev

# Or run separately
npm run server    # Backend on http://localhost:3001
npm run client   # Frontend on http://localhost:5173
```

### Production Build

```bash
npm run build
```

The built files will be in `client/dist/`

## Project Structure

```
collabspace/
├── client/          # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── server/         # Express backend
│   └── index.js
├── package.json    # Root config
└── README.md
```

## Usage

1. **Register** - Create an account
2. **Create Documents** - Click "New Document" to start writing
3. **Create Boards** - Set up task boards for projects
4. **Share** - Click Share and enter teammate's email to collaborate
5. **Manage Tasks** - Drag tasks between columns, click to edit

## License

MIT