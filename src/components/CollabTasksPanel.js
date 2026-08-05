import { useState, useEffect, useCallback } from 'react';
import {
  getCollabTasks, createCollabTask, toggleCollabTask,
  assignCollabTask, deleteCollabTask,
} from '../api/collab';
import { useToast } from '../context/ToastContext';
import './CollabTasksPanel.css';

/**
 * Shared task board for a collab team — the thing that turns a group chat
 * into somewhere a team actually coordinates work, not just talks. Slides
 * over the thread when open; any accepted collaborator can add/check off/
 * assign tasks, but only the task's creator or the collab owner can delete
 * one (enforced server-side too).
 */
export default function CollabTasksPanel({ postId, participants, currentUserId, isCollabOwner, onClose }) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    getCollabTasks(postId)
      .then(r => setTasks(r.data.tasks || []))
      .catch(() => showToast('Failed to load tasks', 'error'))
      .finally(() => setLoading(false));
  }, [postId, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    try {
      setAdding(true);
      await createCollabTask(postId, t);
      setTitle('');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not add task', 'error');
    } finally { setAdding(false); }
  };

  const handleToggle = async (task) => {
    setBusyId(task.id);
    // Optimistic — a checkbox that visibly lags feels broken.
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t));
    try {
      await toggleCollabTask(task.id);
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: task.is_done } : t));
      showToast('Could not update task', 'error');
    } finally { setBusyId(null); }
  };

  const handleAssign = async (task, assigneeId) => {
    setBusyId(task.id);
    try {
      await assignCollabTask(task.id, assigneeId || null);
      load();
    } catch {
      showToast('Could not assign task', 'error');
    } finally { setBusyId(null); }
  };

  const handleDelete = async (task) => {
    setBusyId(task.id);
    try {
      await deleteCollabTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not delete task', 'error');
    } finally { setBusyId(null); }
  };

  const doneCount = tasks.filter(t => t.is_done).length;

  return (
    <div className="tasks-panel">
      <div className="tasks-panel-header">
        <div>
          <h3>Tasks</h3>
          {tasks.length > 0 && <span className="tasks-panel-progress">{doneCount}/{tasks.length} done</span>}
        </div>
        <button className="tasks-panel-close" aria-label="Close tasks" onClick={onClose}>×</button>
      </div>

      <form className="tasks-add-form" onSubmit={handleAdd}>
        <input
          className="tasks-add-input"
          placeholder="Add a task..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={200}
        />
        <button type="submit" className="tasks-add-btn" disabled={adding || !title.trim()}>
          {adding ? '…' : 'Add'}
        </button>
      </form>

      <div className="tasks-list">
        {loading ? (
          <div className="tasks-empty">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="tasks-empty">No tasks yet — add the first one above.</div>
        ) : tasks.map(task => (
          <div key={task.id} className={`task-row ${task.is_done ? 'is-done' : ''}`}>
            <button
              className="task-check"
              aria-label={task.is_done ? 'Mark not done' : 'Mark done'}
              disabled={busyId === task.id}
              onClick={() => handleToggle(task)}>
              {task.is_done ? '✓' : ''}
            </button>
            <div className="task-info">
              <span className="task-title">{task.title}</span>
              <select
                className="task-assignee-select"
                value={task.assignee_id || ''}
                disabled={busyId === task.id}
                onChange={e => handleAssign(task, e.target.value)}>
                <option value="">Unassigned</option>
                {participants.map(p => (
                  <option key={p.id} value={p.id}>{p.username}</option>
                ))}
              </select>
            </div>
            {(task.created_by_id === currentUserId || isCollabOwner) && (
              <button className="task-delete" aria-label="Delete task"
                disabled={busyId === task.id}
                onClick={() => handleDelete(task)}>×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
