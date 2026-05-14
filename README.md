# CollabSpace

A real-time collaborative workspace for teams to create documents and manage tasks together.

## Screenshots

Two demo accounts (**Alice** and **Bob**) in side-by-side browser windows, running locally.

![Create account — Alice and Bob registering](screenshots/Screenshot%20%28124%29.png)

*Registering two accounts to demo collaboration.*

![Dashboard — both users after sign-in](screenshots/Screenshot%20%28125%29.png)

*Dashboard for each user: documents and task board counts.*

![New document (Alice) and dashboard (Bob)](screenshots/Screenshot%20%28126%29.png)

*Alice creates a document while Bob stays on the dashboard.*

![Share document — invite Bob by email](screenshots/Screenshot%20%28127%29.png)

*Alice opens Share and enters Bob’s email.*

![Document editor (Alice) and shared document in list (Bob)](screenshots/Screenshot%20%28128%29.png)

*Alice edits the doc; Bob sees it in Documents.*

![Same document open in both windows — synced content and presence](screenshots/Screenshot%20%28129%29.png)

*Same URL on both sides; live content and collaborator presence.*

![Real-time editing — text from Alice and Bob in one document](screenshots/Screenshot%20%28130%29.png)

*Both users’ lines visible in each editor.*

![Share task board — invite by email](screenshots/Screenshot%20%28131%29.png)

*Share Board modal while Bob’s board list is still empty.*

![Kanban board (Alice) and task boards list (Bob)](screenshots/Screenshot%20%28132%29.png)

*Alice on a board; Bob sees the shared board in the list.*

![New task modal (Alice) and task boards list (Bob)](screenshots/Screenshot%20%28133%29.png)

*Creating a task with title, description, and priority.*

![Same Kanban board — both users on the board](screenshots/Screenshot%20%28134%29.png)

*Shared board with a task in To Do.*

![Kanban with multiple tasks and priority labels](screenshots/Screenshot%20%28135%29.png)

*Low, medium, and high priorities on the same board.*

![Kanban — tasks moved across columns](screenshots/Screenshot%20%28136%29.png)

*Board state after moving tasks (different columns visible per window).*

---

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

### Docker

Run the app in a single container with no setup required:

```bash
docker build -t collabspace .
docker run -p 3001:3001 collabspace
```

Then open [http://localhost:3001](http://localhost:3001).

To persist the database across restarts:

```bash
docker run -p 3001:3001 -v collabdata:/app collabspace
```

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
├── screenshots/    # README demo images
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