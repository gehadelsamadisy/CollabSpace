import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3001';
const socket = io(API_URL);

const AuthContext = createContext();

const refreshDocs = () => socket.emit('refresh-documents');
const refreshBoards = () => socket.emit('refresh-boards');

const api = {
  register: (data) => fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  login: (data) => fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  me: (token) => fetch(`${API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  getDocuments: (token) => fetch(`${API_URL}/api/documents`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  createDocument: (token, data) => fetch(`${API_URL}/api/documents`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  getDocument: (token, id) => fetch(`${API_URL}/api/documents/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  updateDocument: (token, id, data) => fetch(`${API_URL}/api/documents/${id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteDocument: (token, id) => fetch(`${API_URL}/api/documents/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  getBoards: (token) => fetch(`${API_URL}/api/boards`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  createBoard: (token, data) => fetch(`${API_URL}/api/boards`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  getBoard: (token, id) => fetch(`${API_URL}/api/boards/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  deleteBoard: (token, id) => fetch(`${API_URL}/api/boards/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
  createTask: (token, boardId, data) => fetch(`${API_URL}/api/boards/${boardId}/tasks`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateTask: (token, id, data) => fetch(`${API_URL}/api/tasks/${id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteTask: (token, id) => fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
};

function useAuth() {
  return useContext(AuthContext);
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.me(token).then(data => {
        if (data.id) {
          setUser({ ...data, token });
        } else {
          localStorage.removeItem('token');
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    socket.on('documents-shared', () => window.location.reload());
    socket.on('boards-shared', () => window.location.reload());
    return () => {
      socket.off('documents-shared');
      socket.off('boards-shared');
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      setUser({ ...data.user, token: data.token });
      return null;
    }
    return data.error;
  };

  const register = async (username, email, password) => {
    const data = await api.register({ username, email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      setUser({ ...data.user, token: data.token });
      return null;
    }
    return data.error;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route path="/*" element={user ? <AppLayout /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/></svg>
            <span>CollabSpace</span>
          </div>
          <button className="btn btn-icon sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              {collapsed ? <polyline points="9,18 15,12 9,6"/> : <polyline points="15,18 9,12 15,6"/>}
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Workspace</div>
            <a className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={e => { e.preventDefault(); navigate('/dashboard'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>Dashboard</span>
            </a>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Tools</div>
            <a className={`nav-item ${location.pathname.startsWith('/documents') ? 'active' : ''}`} onClick={e => { e.preventDefault(); navigate('/documents'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              <span>Documents</span>
            </a>
            <a className={`nav-item ${location.pathname.startsWith('/tasks') ? 'active' : ''}`} onClick={e => { e.preventDefault(); navigate('/tasks'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              <span>Task Boards</span>
            </a>
          </div>
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar" onClick={logout} title="Logout">{user.username[0].toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.username}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <button className="btn btn-icon" onClick={logout} title="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/documents/:id" element={<DocumentEditorPage />} />
          <Route path="/tasks" element={<TaskBoardListPage />} />
          <Route path="/tasks/:id" element={<TaskBoardPage />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ docs: 0, boards: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getDocuments(user.token),
      api.getBoards(user.token)
    ]).then(([docs, boards]) => {
      setStats({ docs: docs.length, boards: boards.length });
    });
  }, [user.token]);

  return (
    <>
      <header className="header">
        <h1 className="header-title">Dashboard</h1>
      </header>
      <div className="page-content">
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-value">{stats.docs}</div>
            <div className="stat-label">Documents</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.boards}</div>
            <div className="stat-label">Task Boards</div>
          </div>
        </div>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Quick Actions</h2>
        <div className="card-grid">
          <div className="card card-hover" onClick={() => navigate('/documents')}>
            <div className="card-title">View Documents</div>
            <div className="card-meta">Open and edit shared documents</div>
          </div>
          <div className="card card-hover" onClick={() => navigate('/tasks')}>
            <div className="card-title">View Task Boards</div>
            <div className="card-meta">Manage your project boards</div>
          </div>
        </div>
      </div>
    </>
  );
}

function DocumentListPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, [user.token]);

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await api.getDocuments(user.token);
    setDocuments(docs);
    setLoading(false);
  };

  const createDocument = async () => {
    if (!newTitle.trim()) return;
    const doc = await api.createDocument(user.token, { title: newTitle });
    setShowModal(false);
    setNewTitle('');
    navigate(`/documents/${doc.id}`);
  };

  const deleteDocument = async (id, e) => {
    e.stopPropagation();
    await api.deleteDocument(user.token, id);
    loadDocuments();
  };

  return (
    <>
      <header className="header">
        <h1 className="header-title">Documents</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Document
          </button>
        </div>
      </header>
      <div className="page-content">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            <div className="empty-state-title">No documents yet</div>
            <div className="empty-state-text">Create your first document to start collaborating</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Document</button>
          </div>
        ) : (
          <div className="card-grid">
            {documents.map(doc => (
              <div key={doc.id} className="card card-hover" onClick={() => navigate(`/documents/${doc.id}`)}>
                <div className="card-title">{doc.title}</div>
                <div className="card-meta">Updated {new Date(doc.updated_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Document</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="input" placeholder="Document title" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createDocument()} autoFocus />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createDocument}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DocumentEditorPage() {
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [showShare, setShowShare] = useState(false);
const [shareEmail, setShareEmail] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();

const shareDocument = async () => {
    if (!shareEmail.trim()) return;
    await fetch(`${API_URL}/api/documents/${id}/share`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: shareEmail })
    });
    setShowShare(false);
    setShareEmail('');
    socket.emit('documents-shared');
  };

  useEffect(() => {
    loadDocument();
    socket.emit('join-document', { documentId: id, user: user });

    socket.on('document-update', data => {
      if (data.content) setContent(data.content);
    });

    socket.on('user-joined', u => {
      setCollaborators(prev => [...prev.filter(c => c.id !== u.id), u]);
    });

    socket.on('user-left', u => {
      setCollaborators(prev => prev.filter(c => c.id !== u));
    });

    return () => {
      socket.emit('leave-document', { documentId: id });
      socket.off('document-update');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (document) {
        api.updateDocument(user.token, id, { title, content });
        socket.emit('document-edit', { documentId: id, content });
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [content, title]);

  const loadDocument = async () => {
    const doc = await api.getDocument(user.token, id);
    if (!doc.id) {
      navigate('/documents');
      return;
    }
    setDocument(doc);
    setTitle(doc.title);
    setContent(doc.content);
  };

  if (!document) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <>
      <header className="header">
        <input className="header-title" style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '1.25rem', fontWeight: 600, width: '300px' }} value={title} onChange={e => setTitle(e.target.value)} />
        <div className="header-actions">
          <div className="collaborators">
            {collaborators.map(c => (
              <div key={c.id} className="collaborator-avatar" title={c.username}>{c.username[0].toUpperCase()}</div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/documents')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
            Back
          </button>
          <button className="btn btn-primary" onClick={() => setShowShare(true)}>Share</button>
        </div>
      </header>
      <div className="editor-container">
        <div className="editor-content">
          <textarea className="editor-textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="Start writing..." />
        </div>
      </div>
      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Share Document</h2>
              <button className="modal-close" onClick={() => setShowShare(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input" placeholder="user@example.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowShare(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={shareDocument}>Share</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskBoardListPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadBoards();
  }, [user.token]);

const loadBoards = async () => {
    setLoading(true);
    const data = await api.getBoards(user.token);
    setBoards(data);
    setLoading(false);
  };

  return (
    <>
      <header className="header">
        <h1 className="header-title">Task Boards</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Board
          </button>
        </div>
      </header>
      <div className="page-content">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            <div className="empty-state-title">No task boards yet</div>
            <div className="empty-state-text">Create your first board to start managing tasks</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Board</button>
          </div>
        ) : (
          <div className="card-grid">
            {boards.map(board => (
              <div key={board.id} className="card card-hover" onClick={() => navigate(`/tasks/${board.id}`)}>
                <div className="card-title">{board.name}</div>
                <div className="card-meta">Created {new Date(board.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Board</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Board Name</label>
                <input className="input" placeholder="Board name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createBoard()} autoFocus />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createBoard}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskBoardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', column_id: null });
  const [editingTask, setEditingTask] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    loadBoard();
    socket.emit('join-board', { boardId: id, user: user });

    socket.on('task-updated', task => {
      setTasks(prev => {
        const exists = prev.find(t => t.id === task.id);
        if (exists) {
          return prev.map(t => t.id === task.id ? task : t);
        }
        return [...prev, task];
      });
    });

    socket.on('task-moved', task => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    });

    socket.on('task-deleted', taskId => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    });

    return () => {
      socket.emit('leave-board', { boardId: id });
      socket.off('task-updated');
      socket.off('task-moved');
      socket.off('task-deleted');
    };
  }, [id]);

  const loadBoard = async () => {
    const data = await api.getBoard(user.token, id);
    if (!data.board) {
      navigate('/tasks');
      return;
    }
    setBoard(data.board);
    setColumns(data.columns);
    setTasks(data.tasks);
  };

  const createTask = async () => {
    if (!newTask.title.trim() || !newTask.column_id) return;
    await api.createTask(user.token, id, newTask);
    setShowModal(false);
    setNewTask({ title: '', description: '', priority: 'medium', column_id: null });
    loadBoard();
  };

  const shareBoard = async () => {
    if (!shareEmail.trim()) return;
    await fetch(`${API_URL}/api/boards/${id}/share`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: shareEmail })
    });
    setShowShare(false);
    setShareEmail('');
    socket.emit('boards-shared');
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.column_id === columnId) {
      setDraggedTask(null);
      return;
    }
    const maxPos = Math.max(...tasks.filter(t => t.column_id === columnId).map(t => t.position), -1);
    await api.updateTask(user.token, draggedTask.id, { column_id: columnId, position: maxPos + 1 });
    socket.emit('task-move', { boardId: id, taskId: draggedTask.id, columnId, position: maxPos + 1 });
    setDraggedTask(null);
  };

  const deleteTask = async (taskId, e) => {
    e.stopPropagation();
    await api.deleteTask(user.token, taskId);
    loadBoard();
  };

  if (!board) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <>
      <header className="header">
        <h1 className="header-title">{board.name}</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
            Back
          </button>
          <button className="btn btn-primary" onClick={() => setShowShare(true)}>Share</button>
        </div>
      </header>
      <div className="page-content">
        <div className="board-container">
          <div className="board-columns">
            {columns.map(col => (
              <div key={col.id} className="board-column" onDragOver={handleDragOver} onDrop={e => handleDrop(e, col.id)}>
                <div className="column-header">
                  <span className="column-title">{col.title}</span>
                  <span className="column-count">{tasks.filter(t => t.column_id === col.id).length}</span>
                </div>
                <div className="column-tasks">
                  {tasks.filter(t => t.column_id === col.id).map(task => (
                    <div key={task.id} className={`task-card ${draggedTask?.id === task.id ? 'dragging' : ''}`} data-column={col.title} draggable onDragStart={e => handleDragStart(e, task)} onClick={() => { setEditingTask(task); setNewTask({ title: '', description: '', priority: 'medium', column_id: null }); setShowModal(true); }}>
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        <span className={`priority-${task.priority}`}>{task.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="add-task-form">
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setNewTask({ ...newTask, column_id: col.id }); setShowModal(true); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingTask(null); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="input" placeholder="Task title" value={editingTask ? editingTask.title : newTask.title} onChange={e => editingTask ? setEditingTask({ ...editingTask, title: e.target.value }) : setNewTask({ ...newTask, title: e.target.value })} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="input" placeholder="Description" value={editingTask ? editingTask.description : newTask.description} onChange={e => editingTask ? setEditingTask({ ...editingTask, description: e.target.value }) : setNewTask({ ...newTask, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="input" value={editingTask ? editingTask.priority : newTask.priority} onChange={e => editingTask ? setEditingTask({ ...editingTask, priority: e.target.value }) : setNewTask({ ...newTask, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="modal-actions">
                {editingTask && (
                  <button className="btn btn-danger" onClick={() => { api.deleteTask(user.token, editingTask.id); setShowModal(false); setEditingTask(null); loadBoard(); }}>Delete</button>
                )}
                <button className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingTask(null); }}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { if (editingTask) { api.updateTask(user.token, editingTask.id, editingTask); } else { createTask(); } setShowModal(false); setEditingTask(null); loadBoard(); }}>{editingTask ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    {showShare && (
      <div className="modal-overlay" onClick={() => setShowShare(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Share Board</h2>
            <button className="modal-close" onClick={() => setShowShare(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="modal-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" placeholder="user@example.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowShare(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={shareBoard}>Share</button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    const err = await login(email, password);
    if (err) setError(err);
    else navigate('/dashboard');
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your workspace</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
        </form>
        <div className="auth-footer">
          Don't have an account? <a onClick={() => navigate('/register')}>Sign up</a>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    const err = await register(username, email, password);
    if (err) setError(err);
    else navigate('/dashboard');
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start collaborating today</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="input" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }}>Create Account</button>
        </form>
        <div className="auth-footer">
          Already have an account? <a onClick={() => navigate('/login')}>Sign in</a>
        </div>
      </div>
    </div>
  );
}

export default App;
