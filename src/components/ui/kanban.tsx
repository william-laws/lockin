"use client";

import React, { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { cn } from "../../lib/utils";

interface Task {
  id: string;
  title: string;
  column: string;
}

interface Column {
  id: string;
  title: string;
}

interface KanbanProps {
  projectId: string;
}

export const Kanban = ({ projectId }: KanbanProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([
    { id: 'for-later', title: 'For Later' },
    { id: 'todo', title: 'To Do' },
    { id: 'doing', title: 'Doing' },
    { id: 'done', title: 'Done' }
  ]);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const addColumn = () => {
    if (newColumnTitle.trim()) {
      const newColumn: Column = {
        id: Math.random().toString(),
        title: newColumnTitle.trim()
      };
      setColumns([...columns, newColumn]);
      setNewColumnTitle('');
      setShowAddColumn(false);
    }
  };

  const deleteColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
    setTasks(tasks.filter(task => task.column !== columnId));
  };

  const addTask = (columnId: string) => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Math.random().toString(),
        title: newTaskTitle.trim(),
        column: columnId
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      setShowAddTask(null);
    }
  };

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter(task => task.column === columnId);
  };

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetColumnId) {
      const draggedIndex = columns.findIndex(col => col.id === draggedColumn);
      const targetIndex = columns.findIndex(col => col.id === targetColumnId);
      
      const newColumns = [...columns];
      const [draggedColumnData] = newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumnData);
      
      setColumns(newColumns);
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  return (
    <div className="kanban-board">
      <div className={cn("kanban-columns", draggedColumn && "dragging")}>
        {/* Existing Columns */}
        {columns.map((column, index) => (
          <div 
            key={column.id} 
            className={cn(
              "kanban-column",
              draggedColumn === column.id && "dragging",
              dragOverColumn === column.id && "drag-over"
            )}
            draggable
            onDragStart={(e) => handleDragStart(e, column.id)}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            onDragEnd={handleDragEnd}
          >
            <div className="column-header">
              <h3 className="column-title">{column.title}</h3>
              <div className="column-actions">
                <button 
                  className="add-task-button"
                  onClick={() => setShowAddTask(column.id)}
                  title="Add task"
                >
                  <FiPlus />
                </button>
                <button 
                  className="delete-column-button"
                  onClick={() => deleteColumn(column.id)}
                  title="Delete column"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
            <div className="column-content">
              {showAddTask === column.id && (
                <div className="add-task-form">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="task-input"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && addTask(column.id)}
                    onBlur={() => {
                      if (newTaskTitle.trim()) {
                        addTask(column.id);
                      } else {
                        setShowAddTask(null);
                        setNewTaskTitle('');
                      }
                    }}
                  />
                </div>
              )}
              {getTasksForColumn(column.id).map(task => (
                <div key={task.id} className="task-card">
                  <p>{task.title}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add Column Button */}
        <div className="add-column-container">
          {showAddColumn ? (
            <div className="add-column-form">
              <input
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Enter column title..."
                className="column-input"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && addColumn()}
                onBlur={() => {
                  if (newColumnTitle.trim()) {
                    addColumn();
                  } else {
                    setShowAddColumn(false);
                    setNewColumnTitle('');
                  }
                }}
              />
            </div>
          ) : (
            <button 
              className="add-column-button"
              onClick={() => setShowAddColumn(true)}
            >
              <div className="plus-icon">+</div>
              <span>Add Column</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 