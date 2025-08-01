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
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<number | null>(null);

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

  // Column dragging handlers
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
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

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Task dragging handlers
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); // Prevent column drag from starting
  };

  const handleTaskDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedTask) {
      setDragOverColumn(columnId);
      
      // Calculate drop position based on mouse position
      const columnContent = e.currentTarget as HTMLElement;
      const rect = columnContent.getBoundingClientRect();
      const mouseY = e.clientY;
      const tasks = getTasksForColumn(columnId);
      
      // Find the position where the task should be dropped
      let position = tasks.length; // Default to end
      
      for (let i = 0; i < tasks.length; i++) {
        const taskElement = columnContent.querySelector(`[data-task-id="${tasks[i].id}"]`) as HTMLElement;
        if (taskElement) {
          const taskRect = taskElement.getBoundingClientRect();
          if (mouseY < taskRect.top + taskRect.height / 2) {
            position = i;
            break;
          }
        }
      }
      
      setDropPosition(position);
    }
  };

  const handleTaskDragLeave = () => {
    setDragOverColumn(null);
    setDropPosition(null);
  };

  const handleTaskDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedTask) {
      const taskToMove = tasks.find(task => task.id === draggedTask);
      if (taskToMove && taskToMove.column !== columnId) {
        const updatedTasks = tasks.map(task => 
          task.id === draggedTask 
            ? { ...task, column: columnId }
            : task
        );
        setTasks(updatedTasks);
      }
    }
    setDraggedTask(null);
    setDragOverColumn(null);
    setDropPosition(null);
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    setDropPosition(null);
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
            onDragStart={(e) => handleColumnDragStart(e, column.id)}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, column.id)}
            onDragEnd={handleColumnDragEnd}
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
            <div 
              className="column-content"
              onDragOver={(e) => handleTaskDragOver(e, column.id)}
              onDragLeave={handleTaskDragLeave}
              onDrop={(e) => handleTaskDrop(e, column.id)}
            >
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
              
              {getTasksForColumn(column.id).map((task, taskIndex) => (
                <div key={task.id}>
                  <div 
                    className={cn(
                      "task-card",
                      draggedTask === task.id && "dragging"
                    )}
                    draggable
                    data-task-id={task.id}
                    onDragStart={(e) => handleTaskDragStart(e, task.id)}
                    onDragEnd={handleTaskDragEnd}
                  >
                    <p>{task.title}</p>
                  </div>
                </div>
              ))}
              
              {/* Single drop indicator at the calculated position */}
              {dragOverColumn === column.id && dropPosition !== null && (
                <div 
                  className="drop-indicator"
                  style={{ order: dropPosition }}
                />
              )}
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