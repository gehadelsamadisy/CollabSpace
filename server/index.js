const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'collabspace-secret-key-2024';
const PORT = process.env.PORT || 3001;
const DB_FILE = process.env.DB_FILE || 'collabspace.db';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';

let db;

const initDb = async () => {
  const SQL = await initSqlJs();
  try {
    const data = fs.readFileSync(DB_FILE);
    db = new SQL.Database(data);
  } catch {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS document_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      can_edit INTEGER DEFAULT 1,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS task_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS board_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      can_edit INTEGER DEFAULT 1,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES task_boards(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS task_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES task_boards(id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      assignee_id INTEGER,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES task_columns(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );
  `);
  saveDb();
};

const saveDb = () => {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
};

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash]);
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    saveDb();
    const token = jwt.sign({ userId: lastId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: lastId, username, email } });
  } catch (err) {
    res.status(400).json({ error: 'Username or email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);
  if (!result.length || !result[0].values.length) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = { id: result[0].values[0][0], username: result[0].values[0][1], email: result[0].values[0][2], password_hash: result[0].values[0][3] };
  if (!await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const result = db.exec('SELECT id, username, email FROM users WHERE id = ?', [req.userId]);
  if (!result.length || !result[0].values.length) {
    return res.status(404).json({ error: 'Not found' });
  }
  const row = result[0].values[0];
  res.json({ id: row[0], username: row[1], email: row[2] });
});

const rowToObj = (result, cols) => result.map(row => {
  const obj = {};
  cols.forEach((c, i) => obj[c] = row[i]);
  return obj;
});

app.get('/api/documents', authenticate, (req, res) => {
  const result = db.exec(`
    SELECT d.* FROM documents d
    LEFT JOIN document_access da ON d.id = da.document_id
    WHERE d.owner_id = ? OR da.user_id = ?
    GROUP BY d.id
    ORDER BY d.updated_at DESC
  `, [req.userId, req.userId]);
  if (!result.length) return res.json([]);
  const cols = result[0].columns;
  res.json(rowToObj(result[0].values, cols));
});

app.post('/api/documents', authenticate, (req, res) => {
  const { title } = req.body;
  db.run('INSERT INTO documents (title, owner_id) VALUES (?, ?)', [title, req.userId]);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  db.run('INSERT INTO document_access (document_id, user_id) VALUES (?, ?)', [lastId, req.userId]);
  saveDb();
  const result = db.exec('SELECT * FROM documents WHERE id = ?', [lastId]);
  const cols = result[0].columns;
  res.json(rowToObj(result[0].values, cols)[0]);
});

app.get('/api/documents/:id', authenticate, (req, res) => {
  const result = db.exec('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cols = result[0].columns;
  res.json(rowToObj(result[0].values, cols)[0]);
});

app.post('/api/documents/:id/share', authenticate, (req, res) => {
  const { email } = req.body;
  const userResult = db.exec('SELECT id FROM users WHERE email = ?', [email]);
  if (!userResult.length || !userResult[0].values.length) {
    return res.status(404).json({ error: 'User not found' });
  }
  const userId = userResult[0].values[0][0];
  try {
    db.run('INSERT INTO document_access (document_id, user_id) VALUES (?, ?)', [req.params.id, userId]);
    saveDb();
    io.to(`doc-${req.params.id}`).emit('user-shared', { documentId: parseInt(req.params.id), userId });
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Already shared with this user' });
  }
});

app.put('/api/documents/:id', authenticate, (req, res) => {
  const { title, content } = req.body;
  db.run('UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, content, req.params.id]);
  saveDb();
  const result = db.exec('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  const cols = result[0].columns;
  const doc = rowToObj(result[0].values, cols)[0];
  io.to(`doc-${req.params.id}`).emit('document-update', doc);
  res.json(doc);
});

app.delete('/api/documents/:id', authenticate, (req, res) => {
  db.run('DELETE FROM document_access WHERE document_id = ?', [req.params.id]);
  db.run('DELETE FROM documents WHERE id = ? AND owner_id = ?', [req.params.id, req.userId]);
  saveDb();
  res.json({ success: true });
});

app.get('/api/boards', authenticate, (req, res) => {
  const result = db.exec(`
    SELECT b.* FROM task_boards b
    LEFT JOIN board_access ba ON b.id = ba.board_id
    WHERE b.owner_id = ? OR ba.user_id = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `, [req.userId, req.userId]);
  if (!result.length) return res.json([]);
  const cols = result[0].columns;
  res.json(rowToObj(result[0].values, cols));
});

app.post('/api/boards', authenticate, (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO task_boards (name, owner_id) VALUES (?, ?)', [name, req.userId]);
  const boardId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  db.run('INSERT INTO task_columns (board_id, title, position) VALUES (?, ?, ?)', [boardId, 'To Do', 0]);
  db.run('INSERT INTO task_columns (board_id, title, position) VALUES (?, ?, ?)', [boardId, 'In Progress', 1]);
  db.run('INSERT INTO task_columns (board_id, title, position) VALUES (?, ?, ?)', [boardId, 'Done', 2]);
  db.run('INSERT INTO task_columns (board_id, title, position) VALUES (?, ?, ?)', [boardId, 'Cancelled', 3]);
  db.run('INSERT INTO board_access (board_id, user_id) VALUES (?, ?)', [boardId, req.userId]);
  saveDb();
  res.json({ id: boardId, name });
});

app.get('/api/boards/:id', authenticate, (req, res) => {
  const boardResult = db.exec('SELECT * FROM task_boards WHERE id = ?', [req.params.id]);
  if (!boardResult.length || !boardResult[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cols = boardResult[0].columns;
  const board = rowToObj(boardResult[0].values, cols)[0];

  const colResult = db.exec('SELECT * FROM task_columns WHERE board_id = ? ORDER BY position', [req.params.id]);
  const columns = colResult.length ? rowToObj(colResult[0].values, colResult[0].columns) : [];

  const hasCancelled = columns.find(c => c.title === 'Cancelled');
  if (!hasCancelled) {
    const maxPos = Math.max(...columns.map(c => c.position), -1);
    db.run('INSERT INTO task_columns (board_id, title, position) VALUES (?, ?, ?)', [req.params.id, 'Cancelled', maxPos + 1]);
    saveDb();
    const newColResult = db.exec('SELECT * FROM task_columns WHERE board_id = ? ORDER BY position', [req.params.id]);
    columns.push(...rowToObj(newColResult[0].values, newColResult[0].columns));
  }

  const colIds = columns.map(c => c.id).join(',');
  let tasks = [];
  if (colIds) {
    const taskResult = db.exec(`
      SELECT t.*, u.username as assignee_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assignee_id = u.id 
      WHERE t.column_id IN (${colIds})
      ORDER BY t.position
    `);
    if (taskResult.length) {
      tasks = rowToObj(taskResult[0].values, taskResult[0].columns);
    }
  }
  res.json({ board, columns, tasks });
});

app.post('/api/boards/:id/share', authenticate, (req, res) => {
  const { email } = req.body;
  const userResult = db.exec('SELECT id FROM users WHERE email = ?', [email]);
  if (!userResult.length || !userResult[0].values.length) {
    return res.status(404).json({ error: 'User not found' });
  }
  const userId = userResult[0].values[0][0];
  try {
    db.run('INSERT INTO board_access (board_id, user_id) VALUES (?, ?)', [req.params.id, userId]);
    saveDb();
    io.to(`board-${req.params.id}`).emit('user-shared', { boardId: parseInt(req.params.id), userId });
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Already shared with this user' });
  }
});

app.delete('/api/boards/:id', authenticate, (req, res) => {
  const colResult = db.exec('SELECT id FROM task_columns WHERE board_id = ?', [req.params.id]);
  if (colResult.length) {
    const colIds = colResult[0].values.map(r => r[0]);
    db.run(`DELETE FROM tasks WHERE column_id IN (${colIds.join(',')})`);
  }
  db.run('DELETE FROM task_columns WHERE board_id = ?', [req.params.id]);
  db.run('DELETE FROM task_boards WHERE id = ? AND owner_id = ?', [req.params.id, req.userId]);
  saveDb();
  res.json({ success: true });
});

app.post('/api/boards/:id/tasks', authenticate, (req, res) => {
  const { column_id, title, description, priority } = req.body;
  const maxPosResult = db.exec('SELECT MAX(position) as max FROM tasks WHERE column_id = ?', [column_id]);
  const position = (maxPosResult[0]?.values[0]?.[0] ?? -1) + 1;
  db.run('INSERT INTO tasks (column_id, title, description, priority, position) VALUES (?, ?, ?, ?, ?)', [column_id, title, description || '', priority || 'medium', position]);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  saveDb();
  const result = db.exec('SELECT * FROM tasks WHERE id = ?', [lastId]);
  const cols = result[0].columns;
  const task = rowToObj(result[0].values, cols)[0];
  io.to(`board-${req.params.id}`).emit('task-updated', task);
  res.json(task);
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const { title, description, priority, due_date, assignee_id, column_id, position } = req.body;
  const result = db.exec('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cols = result[0].columns;
  const task = rowToObj(result[0].values, cols)[0];

  const colId = column_id || task.column_id;
  const pos = position !== undefined ? position : task.position;

  db.run(`UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, assignee_id = ?, column_id = ?, position = ? WHERE id = ?`,
    [title || task.title, description ?? task.description, priority || task.priority, due_date || null, assignee_id || null, colId, pos, req.params.id]);
  saveDb();

  const updatedResult = db.exec('SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.id = ?', [req.params.id]);
  const upCols = updatedResult[0].columns;
  const updated = rowToObj(updatedResult[0].values, upCols)[0];
  io.to(`board-${colId}`).emit('task-updated', updated);
  res.json(updated);
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  const taskResult = db.exec('SELECT t.column_id, tc.board_id FROM tasks t JOIN task_columns tc ON t.column_id = tc.id WHERE t.id = ?', [req.params.id]);
  const row = taskResult[0]?.values[0];
  const boardId = row ? row[1] : null;
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
saveDb();
  if (boardId) io.to(`board-${boardId}`).emit('task-deleted', parseInt(req.params.id));
  res.json({ success: true });
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  socket.on('join-document', ({ documentId, user }) => {
    socket.join(`doc-${documentId}`);
    connectedUsers.set(socket.id, { documentId, user });
    socket.to(`doc-${documentId}`).emit('user-joined', user);
  });

  socket.on('document-edit', ({ documentId, content }) => {
    db.run('UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, documentId]);
    saveDb();
    socket.to(`doc-${documentId}`).emit('document-update', { content });
  });

  socket.on('leave-document', ({ documentId }) => {
    socket.leave(`doc-${documentId}`);
    connectedUsers.delete(socket.id);
  });

  socket.on('join-board', ({ boardId, user }) => {
    socket.join(`board-${boardId}`);
    connectedUsers.set(socket.id, { boardId, user });
  });

  socket.on('task-move', ({ boardId, taskId, columnId, position }) => {
    db.run('UPDATE tasks SET column_id = ?, position = ? WHERE id = ?', [columnId, position, taskId]);
    saveDb();
    const result = db.exec('SELECT t.*, u.username as assignee_name FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.id = ?', [taskId]);
    const task = rowToObj(result[0].values, result[0].columns)[0];
    io.to(`board-${boardId}`).emit('task-moved', task);
  });

  socket.on('leave-board', ({ boardId }) => {
    socket.leave(`board-${boardId}`);
  });

  socket.on('disconnect', () => {
    const info = connectedUsers.get(socket.id);
    if (info) {
      if (info.documentId) {
        socket.to(`doc-${info.documentId}`).emit('user-left', info.user);
      }
      connectedUsers.delete(socket.id);
    }
  });
});

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});