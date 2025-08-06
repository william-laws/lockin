"use client";

import React, { useState } from "react";
import { FiPlus, FiTrash2, FiEdit3, FiFileText, FiCheckSquare, FiMoreVertical } from "react-icons/fi";
import { cn } from "../../lib/utils";

// TypeScript interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      setFocusMode: (isFocusMode: boolean) => Promise<void>;
      onWindowFocusChanged: (callback: (isFocused: boolean) => void) => void;
    };
  }
}

interface Task {
  id: string;
  title: string;
  column: string;
  note?: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  scheduledDate?: string;
  scheduledStartTime?: string; // HH:MM format
  scheduledEndTime?: string; // HH:MM format
  scheduledColor?: string; // hex color
  estimatedTime?: string; // HH:MM format
  actualTime?: string; // HH:MM format
  priority?: 'urgent' | 'upcoming' | 'long-term';
}

interface Column {
  id: string;
  title: string;
}

interface KanbanProps {
  projectId: string;
}

export const Kanban = ({ projectId }: KanbanProps) => {
  // Initialize state with localStorage data
  const getInitialTasks = (): Task[] => {
    try {
      const savedData = localStorage.getItem(`kanban-${projectId}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        return parsedData.tasks || [];
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
    return [];
  };

  const getInitialColumns = (): Column[] => {
    try {
      const savedData = localStorage.getItem(`kanban-${projectId}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        return parsedData.columns || [
          { id: 'for-later', title: 'For Later' },
          { id: 'todo', title: 'To Do' },
          { id: 'doing', title: 'Doing' },
          { id: 'done', title: 'Done' }
        ];
      }
    } catch (error) {
      console.error('Error loading columns:', error);
    }
    return [
    { id: 'for-later', title: 'For Later' },
    { id: 'todo', title: 'To Do' },
    { id: 'doing', title: 'Doing' },
    { id: 'done', title: 'Done' }
    ];
  };

  const [tasks, setTasks] = useState<Task[]>(getInitialTasks);
  const [columns, setColumns] = useState<Column[]>(getInitialColumns);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  
  // New state for editing functionality
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [tempChecklist, setTempChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [tempScheduledDate, setTempScheduledDate] = useState('');

  // Card options menu
  const [showCardOptions, setShowCardOptions] = useState<string | null>(null);

  // Time tracking state
  const [editingEstimatedTime, setEditingEstimatedTime] = useState<string | null>(null);

  // Focus mode state
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusStartTime, setFocusStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const lastMinuteAddedRef = React.useRef(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [showEmptyDoingWarning, setShowEmptyDoingWarning] = useState(false);
  
  // Window focus state
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  
  // Pause and break state
  const [isPaused, setIsPaused] = useState(false);
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [breakTime, setBreakTime] = useState(300); // 5 minutes in seconds
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);

  // Save data to localStorage whenever tasks or columns change
  const saveToLocalStorage = React.useCallback((newTasks: Task[], newColumns: Column[]) => {
    try {
      const dataToSave = {
        tasks: newTasks,
        columns: newColumns,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`kanban-${projectId}`, JSON.stringify(dataToSave));
      console.log('Saved data for project:', projectId, 'Tasks:', newTasks.length, 'Columns:', newColumns.length);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [projectId]);

  // Save whenever tasks or columns change
  React.useEffect(() => {
    saveToLocalStorage(tasks, columns);
  }, [tasks, columns, saveToLocalStorage]);

  // Reload data when projectId changes
  React.useEffect(() => {
    console.log('Project changed to:', projectId);
    const newTasks = getInitialTasks();
    const newColumns = getInitialColumns();
    setTasks(newTasks);
    setColumns(newColumns);
    console.log('Loaded for project:', projectId, 'Tasks:', newTasks.length, 'Columns:', newColumns.length);
  }, [projectId]);

  // Listen for window focus changes
  React.useEffect(() => {
    if (window.electronAPI?.onWindowFocusChanged) {
      console.log('Setting up window focus listener');
      window.electronAPI.onWindowFocusChanged((isFocused: boolean) => {
        console.log('Window focus changed:', isFocused);
        setIsWindowFocused(isFocused);
      });
    } else {
      console.log('electronAPI.onWindowFocusChanged not available');
    }
  }, []);

  const addColumn = () => {
    if (newColumnTitle.trim()) {
      const title = newColumnTitle.trim();
      const newColumn: Column = {
        // Ensure "Doing" column gets the correct ID for focus mode
        id: title.toLowerCase() === 'doing' ? 'doing' : Math.random().toString(),
        title: title
      };
      setColumns([...columns, newColumn]);
      setNewColumnTitle('');
      setShowAddColumn(false);
    }
  };

  const deleteColumn = (columnId: string) => {
    // Prevent deletion of the "doing" column (by ID or title)
    const columnToDelete = columns.find(col => col.id === columnId);
    if (columnId === 'doing' || (columnToDelete && columnToDelete.title.toLowerCase() === 'doing')) {
      return;
    }
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
    const columnTasks = tasks.filter(task => task.column === columnId);
    
    // Sort tasks by priority if they're in the "Doing" column
    if (columnId === 'doing' || columns.find(col => col.id === columnId)?.title.toLowerCase() === 'doing') {
      return columnTasks.sort((a, b) => {
        const priorityOrder = { 'urgent': 0, 'upcoming': 1, 'long-term': 2 };
        const aPriority = a.priority ? priorityOrder[a.priority] : 3;
        const bPriority = b.priority ? priorityOrder[b.priority] : 3;
        return aPriority - bPriority;
      });
    }
    
    return columnTasks;
  };

  // Task editing functions
  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const saveTaskTitle = (taskId: string) => {
    if (editingTaskTitle.trim()) {
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, title: editingTaskTitle.trim() }
          : task
      ));
    }
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  // Note functions
  const startEditingNote = (task: Task) => {
    setShowNoteModal(task.id);
    setTempNote(task.note || '');
  };

  const saveNote = (taskId: string) => {
    if (tempNote.trim()) {
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, note: tempNote.trim() }
          : task
      ));
    }
    setShowNoteModal(null);
    setTempNote('');
  };

  const deleteNote = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, note: undefined }
        : task
    ));
  };

  // Checklist functions
  const startEditingChecklist = (task: Task) => {
    setShowChecklistModal(task.id);
    setTempChecklist(task.checklist || []);
  };

  const addChecklistItem = () => {
    setTempChecklist([...tempChecklist, { 
      id: Math.random().toString(), 
      text: '', 
      completed: false 
    }]);
  };

  const updateChecklistItem = (index: number, text: string) => {
    const newChecklist = [...tempChecklist];
    newChecklist[index] = { ...newChecklist[index], text };
    setTempChecklist(newChecklist);
  };

  const toggleChecklistItem = (index: number) => {
    const newChecklist = [...tempChecklist];
    newChecklist[index] = { ...newChecklist[index], completed: !newChecklist[index].completed };
    setTempChecklist(newChecklist);
  };

  const removeChecklistItem = (index: number) => {
    setTempChecklist(tempChecklist.filter((_, i) => i !== index));
  };

  const saveChecklist = (taskId: string) => {
    const filteredChecklist = tempChecklist.filter(item => item.text.trim());
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, checklist: filteredChecklist }
        : task
    ));
    setShowChecklistModal(null);
    setTempChecklist([]);
  };

  const toggleExistingChecklistItem = (taskId: string, itemId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId && task.checklist) {
        return {
          ...task,
          checklist: task.checklist.map(item =>
            item.id === itemId 
              ? { ...item, completed: !item.completed }
              : item
          )
        };
      }
      return task;
    }));
  };

  // Schedule functions
  const openScheduleModal = (task: Task) => {
    setScheduleForm({
      date: task.scheduledDate || '',
      startTime: task.scheduledStartTime || '',
      endTime: task.scheduledEndTime || '',
      color: task.scheduledColor || '#3b82f6'
    });
    setShowScheduleModal(task.id);
  };

  const saveSchedule = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            scheduledDate: scheduleForm.date,
            scheduledStartTime: scheduleForm.startTime,
            scheduledEndTime: scheduleForm.endTime,
            scheduledColor: scheduleForm.color
          }
        : task
    );
    

    
    setTasks(updatedTasks);
    setShowScheduleModal(null);
  };

  // Card options menu
  const toggleCardOptions = (taskId: string) => {
    setShowCardOptions(showCardOptions === taskId ? null : taskId);
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    setShowCardOptions(null);
  };

  // Time tracking functions
  const updateActualTime = (taskId: string, newTime: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, actualTime: newTime }
        : task
    ));
  };

  const addTimeToTask = (taskId: string, minutesToAdd: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentTime = task.actualTime || '00:00';
    const [hours, minutes] = currentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    
    updateActualTime(taskId, newTime);
  };

  // Format time from HH:MM to "X hours and Y minutes"
  const formatTimeToText = (time: string): string => {
    if (!time || time === '') return '';
    
    const [hours, minutes] = time.split(':').map(Number);
    let result = '';
    
    if (hours > 0) {
      result += `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    if (minutes > 0) {
      if (result) result += ' and ';
      result += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    return result || '0 minutes';
  };

  // Focus mode functions
  const resetAllTaskTimes = () => {
    setTasks(tasks.map(task => ({
      ...task,
      actualTime: '00:00'
    })));
  };

  const startFocusMode = async () => {
    // Check if there are any tasks in the doing column
    const doingTasks = getDoingTasks();
    if (doingTasks.length === 0) {
      // Show warning message
      setShowEmptyDoingWarning(true);
      // Hide warning after 3 seconds
      setTimeout(() => {
        setShowEmptyDoingWarning(false);
      }, 3000);
      return; // Don't enter focus mode
    }

    setIsFocusMode(true);
    setFocusStartTime(new Date());
    setElapsedTime(0);
    setSelectedTaskIndex(0);
    setTotalPausedTime(0);
    setTotalBreakTime(0);
    setPauseStartTime(null);
    
    // Resize window using Electron API
    if (window.electronAPI) {
      try {
        await window.electronAPI.setFocusMode(true);
      } catch (error) {
        console.error('Failed to resize window:', error);
      }
    }
  };

  const stopFocusMode = async () => {
    // Add any remaining partial minutes to the top doing task before stopping
    if (elapsedTime > 0) {
      const doingTasks = getDoingTasks();
      if (doingTasks.length > 0) {
        const topTask = doingTasks[0]; // First task in doing column
        const totalMinutes = Math.floor(elapsedTime / 60);
        const remainingMinutes = totalMinutes - lastMinuteAddedRef.current;
        if (remainingMinutes > 0) {
          addTimeToTask(topTask.id, remainingMinutes);
        }
      }
    }
    
    setIsFocusMode(false);
    setFocusStartTime(null);
    setElapsedTime(0);
    setSelectedTaskIndex(0);
    
    // Restore window size using Electron API
    if (window.electronAPI) {
      try {
        await window.electronAPI.setFocusMode(false);
      } catch (error) {
        console.error('Failed to restore window:', error);
      }
    }
  };

  // Helper function to find the doing column (by ID or title)
  const getDoingColumn = () => {
    return columns.find(col => col.id === 'doing' || col.title.toLowerCase() === 'doing');
  };

  const getDoingTasks = () => {
    const doingColumn = getDoingColumn();
    return doingColumn ? tasks.filter(task => task.column === doingColumn.id) : [];
  };

  // Helper function to find the done column (by ID or title)
  const getDoneColumn = () => {
    return columns.find(col => col.id === 'done' || col.title.toLowerCase() === 'done');
  };

  // Complete the active task (move to done column)
    const completeActiveTask = () => {
    const doingTasks = getDoingTasks();
    const doneColumn = getDoneColumn();

    if (doingTasks.length > 0 && doneColumn) {
      const activeTask = doingTasks[0]; // Top task is the active one
      setTasks(tasks.map(task =>
        task.id === activeTask.id
          ? { ...task, column: doneColumn.id }
          : task
      ));
    }
  };

  // Pause functionality
  const togglePause = () => {
    if (isPaused) {
      // Resuming - calculate total paused time and update
      if (pauseStartTime) {
        const currentPauseDuration = Math.floor((Date.now() - pauseStartTime.getTime()) / 1000);
        setTotalPausedTime(totalPausedTime + currentPauseDuration);
        setPauseStartTime(null);
      }
    } else {
      // Pausing - record when we started pausing
      setPauseStartTime(new Date());
    }
    setIsPaused(!isPaused);
  };

  // Break functionality
  const startBreak = () => {
    setIsBreakMode(true);
    setBreakStartTime(new Date());
    setBreakTime(300); // Reset to 5 minutes
  };

  const endBreak = () => {
    // Calculate total break time and add to total
    if (breakStartTime) {
      const breakDuration = Math.floor((Date.now() - breakStartTime.getTime()) / 1000);
      setTotalBreakTime(totalBreakTime + breakDuration);
    }
    
    setIsBreakMode(false);
    setBreakStartTime(null);
    setBreakTime(300);
  };

  // Priority functions
  const setTaskPriority = (taskId: string, priority: 'urgent' | 'upcoming' | 'long-term') => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, priority }
        : task
    ));
    setShowPriorityPopup(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'upcoming': return '#f59e0b';
      case 'long-term': return '#3b82f6';
      default: return 'transparent';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'upcoming': return 'Upcoming';
      case 'long-term': return 'Long-term';
      default: return '';
    }
  };



  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBreakTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isFocusMode && focusStartTime && !isPaused && !isBreakMode) {
      // Reset the minute counter when focus mode starts
      lastMinuteAddedRef.current = 0;
      
      interval = setInterval(() => {
        const newElapsedTime = Math.floor((Date.now() - focusStartTime.getTime()) / 1000) - totalPausedTime - totalBreakTime;
        setElapsedTime(newElapsedTime);
        
        // Add time to the top doing task every minute
        const currentMinutes = Math.floor(newElapsedTime / 60);
        if (currentMinutes > lastMinuteAddedRef.current) {
          // Use callback pattern to get current tasks
          setTasks(currentTasks => {
            const doingColumn = getDoingColumn();
            const doingTasks = doingColumn ? currentTasks.filter(task => task.column === doingColumn.id) : [];
            
            if (doingTasks.length > 0) {
              const topTask = doingTasks[0];
              const currentTime = topTask.actualTime || '00:00';
              const [hours, minutes] = currentTime.split(':').map(Number);
              const totalMinutes = hours * 60 + minutes + 1;
              const newHours = Math.floor(totalMinutes / 60);
              const newMinutes = totalMinutes % 60;
              const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
              
              return currentTasks.map(task => 
                task.id === topTask.id 
                  ? { ...task, actualTime: newTime }
                  : task
              );
            }
            return currentTasks;
          });
          
          lastMinuteAddedRef.current = currentMinutes;
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusMode, focusStartTime, isPaused, isBreakMode]); // Added pause and break dependencies

  // Break timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isBreakMode && breakStartTime) {
      interval = setInterval(() => {
        const elapsedBreakTime = Math.floor((Date.now() - breakStartTime.getTime()) / 1000);
        const remainingTime = Math.max(0, 300 - elapsedBreakTime);
        setBreakTime(remainingTime);
        
        // When break ends, automatically return to focus mode
        if (remainingTime <= 0) {
          endBreak();
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBreakMode, breakStartTime]);

  // Track break time to subtract from work time
  const [totalBreakTime, setTotalBreakTime] = useState(0);
  
  // Priority popup state
  const [showPriorityPopup, setShowPriorityPopup] = useState<string | null>(null);
  
  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    color: '#3b82f6' // default blue
  });

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

  // Debug log for focus state
  console.log('Focus state:', { isFocusMode, isWindowFocused, shouldBeUnfocused: isFocusMode && !isWindowFocused });

  return (
    <div className={cn("kanban-board", isFocusMode && "focus-mode", isFocusMode && !isWindowFocused && "unfocused")}>
      {isFocusMode && (
        <div className="focus-header">
          <div className="focus-timer">
            <span className={cn("timer-display", isBreakMode && "break-timer")}>
              {isBreakMode ? formatBreakTime(breakTime) : formatElapsedTime(elapsedTime)}
            </span>
          </div>
          <div className="focus-controls">
            {isBreakMode && (
              <button 
                className="exit-break-button"
                onClick={endBreak}
                title="Exit break mode"
              >
                Exit Break
              </button>
            )}
            <button 
              className="stop-focus-button"
              onClick={stopFocusMode}
              title="Stop focus mode"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Empty doing list warning */}
      {showEmptyDoingWarning && (
        <div className="empty-doing-warning">
          <p>You don't have anything in your 'Doing' list yet!</p>
          <button 
            className="close-warning-button"
            onClick={() => setShowEmptyDoingWarning(false)}
            title="Close warning"
          >
            ×
          </button>
        </div>
      )}
      
      <div className={cn("kanban-columns", draggedColumn && "dragging", isFocusMode && "focus-columns")}>
        {/* Existing Columns */}
        {columns.map((column, index) => (
          <div 
            key={column.id} 
                                className={cn(
                      "kanban-column",
                      draggedColumn === column.id && "dragging",
                      dragOverColumn === column.id && "drag-over",
                      isFocusMode && column.id !== 'doing' && column.title.toLowerCase() !== 'doing' && "hidden"
                    )}
            draggable={!isFocusMode}
            onDragStart={!isFocusMode ? (e) => handleColumnDragStart(e, column.id) : undefined}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, column.id)}
            onDragEnd={handleColumnDragEnd}
          >
            <div className="column-header">
              <h3 className="column-title">{column.title}</h3>
              <div className="column-actions">
                {!isFocusMode || (column.id !== 'doing' && column.title.toLowerCase() !== 'doing') && (
                  <button 
                    className="add-task-button"
                    onClick={() => setShowAddTask(column.id)}
                    title="Add task"
                  >
                    <FiPlus />
                  </button>
                )}
                {column.id !== 'doing' && column.title.toLowerCase() !== 'doing' && (
                  <button 
                    className="delete-column-button"
                    onClick={() => deleteColumn(column.id)}
                    title="Delete column"
                  >
                    <FiTrash2 />
                  </button>
                )}
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
                      draggedTask === task.id && "dragging",
                      task.column === 'done' && "done-task",
                      isFocusMode && (column.id === 'doing' || column.title.toLowerCase() === 'doing') && taskIndex === 0 && "focus-active-task"
                    )}
                    draggable
                    data-task-id={task.id}
                    onDragStart={(e) => handleTaskDragStart(e, task.id)}
                    onDragEnd={handleTaskDragEnd}
                  >
                    <div className="task-header">
                      {editingTaskId === task.id ? (
                        <input
                          type="text"
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveTaskTitle(task.id)}
                          onBlur={saveTaskTitle.bind(null, task.id)}
                          className="edit-task-title-input"
                          autoFocus
                        />
                      ) : (
                        <div className="task-title-section">
                          <p 
                            className="task-title"
                            onClick={!isFocusMode ? () => startEditingTask(task) : undefined}
                            style={{ cursor: isFocusMode ? 'default' : 'pointer' }}
                          >
                            {task.title}
                          </p>
                          {!isFocusMode && (
                                                      <button
                            className="priority-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPriorityPopup(showPriorityPopup === task.id ? null : task.id);
                            }}
                            title="Set priority"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                            </svg>
                          </button>
                          )}
                        </div>
                      )}
                      
                      {/* Task action buttons for active task in focus mode */}
                      {isFocusMode && (column.id === 'doing' || column.title.toLowerCase() === 'doing') && taskIndex === 0 && (
                        <div className="focus-task-actions">
                          <button
                            className="pause-task-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePause();
                            }}
                            title={isPaused ? "Resume" : "Pause"}
                          >
                            {isPaused ? "▶" : "⏸"}
                          </button>
                          <button
                            className="break-task-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startBreak();
                            }}
                            title="Take a break"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V6h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S14.67 9 15.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                            </svg>
                          </button>
                          <button
                            className="complete-task-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              completeActiveTask();
                            }}
                            title="Complete task"
                          >
                            ✓
                          </button>
                        </div>
                      )}
                      
                      {!isFocusMode && (
                        <div className="task-actions">
                          <button
                            className="task-action-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingNote(task);
                            }}
                            title="Add note"
                          >
                            <FiFileText />
                          </button>
                          <button
                            className="task-action-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingChecklist(task);
                            }}
                            title="Add checklist"
                          >
                            <FiCheckSquare />
                          </button>
                          <button
                            className="task-action-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCardOptions(task.id);
                            }}
                            title="Card options"
                          >
                            <FiMoreVertical />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Priority display */}
                    {task.priority && (
                      <div className="task-priority">
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(task.priority) }}
                        >
                          {getPriorityLabel(task.priority)}
                        </span>
                      </div>
                    )}

                    {/* Priority popup */}
                    {showPriorityPopup === task.id && (
                      <div className="priority-popup">
                        <button
                          className="priority-option urgent"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskPriority(task.id, 'urgent');
                          }}
                        >
                          Urgent
                        </button>
                        <button
                          className="priority-option upcoming"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskPriority(task.id, 'upcoming');
                          }}
                        >
                          Upcoming
                        </button>
                        <button
                          className="priority-option long-term"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskPriority(task.id, 'long-term');
                          }}
                        >
                          Long-term
                        </button>
                      </div>
                    )}

                    {/* Card options dropdown */}
                    {!isFocusMode && showCardOptions === task.id && (
                      <div className="card-options-dropdown">
                        <button
                          className="close-options-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCardOptions(null);
                          }}
                          title="Close"
                        >
                          ×
                        </button>
                        <button
                          className="card-option-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCardOptions(null);
                            openScheduleModal(task);
                          }}
                        >
                          📅 Schedule
                        </button>
                        <button
                          className="card-option-button delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                        >
                          🗑️ Delete Card
                        </button>
                      </div>
                    )}
                    
                    {/* Show note content */}
                    {!isFocusMode && task.note && (
                      <div className="task-note">
                        <div className="note-header">
                          <span className="note-icon">📝</span>
                          <button
                            className="edit-note-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingNote(task);
                            }}
                            title="Edit note"
                          >
                            <FiEdit3 />
                          </button>
                          <button
                            className="delete-note-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(task.id);
                            }}
                            title="Delete note"
                          >
                            ×
                          </button>
                        </div>
                        <p className="note-content">{task.note}</p>
                      </div>
                    )}

                    {/* Show checklist content */}
                    {task.checklist && task.checklist.length > 0 && (
                      <div className="task-checklist">
                        <div className="checklist-header">
                          <span className="checklist-icon">☑️</span>
                          <span className="checklist-progress">
                            {task.checklist.filter(item => item.completed).length}/{task.checklist.length}
                          </span>
                          {!isFocusMode && (
                            <button
                              className="edit-checklist-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingChecklist(task);
                              }}
                              title="Edit checklist"
                            >
                              <FiEdit3 />
                            </button>
                          )}
                        </div>
                        <div className="checklist-items-display">
                          {task.checklist.map((item) => (
                            <div key={item.id} className="checklist-item-display">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleExistingChecklistItem(task.id, item.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span 
                                className={item.completed ? 'completed' : ''}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExistingChecklistItem(task.id, item.id);
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show schedule indicator */}
                    {!isFocusMode && task.scheduledDate && (
                      <div className="task-schedule">
                        <span className="schedule-indicator">📅 {task.scheduledDate}</span>
                      </div>
                    )}

                    {/* Time tracking section */}
                    {!isFocusMode && (
                    <div className="task-time-tracking">
                      <div className="time-input-section">
                        {editingEstimatedTime === task.id ? (
                          <input
                            type="text"
                            value={task.estimatedTime || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Auto-format to HH:MM
                              let formatted = value.replace(/[^0-9]/g, '');
                              if (formatted.length >= 2) {
                                formatted = formatted.slice(0, 2) + ':' + formatted.slice(2, 4);
                              }
                              if (formatted.length <= 5) {
                                setTasks(tasks.map(t => 
                                  t.id === task.id 
                                    ? { ...t, estimatedTime: formatted }
                                    : t
                                ));
                              }
                            }}
                            onBlur={() => {
                              setEditingEstimatedTime(null);
                            }}
                            placeholder="00:00"
                            className="time-estimate-input"
                            onClick={(e) => e.stopPropagation()}
                            maxLength={5}
                            autoFocus
                          />
                        ) : task.estimatedTime && task.estimatedTime !== '' ? (
                          <span 
                            className="time-estimate-display"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEstimatedTime(task.id);
                            }}
                          >
                            {formatTimeToText(task.estimatedTime)}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={task.estimatedTime || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Auto-format to HH:MM
                              let formatted = value.replace(/[^0-9]/g, '');
                              if (formatted.length >= 2) {
                                formatted = formatted.slice(0, 2) + ':' + formatted.slice(2, 4);
                              }
                              if (formatted.length <= 5) {
                                setTasks(tasks.map(t => 
                                  t.id === task.id 
                                    ? { ...t, estimatedTime: formatted }
                                    : t
                                ));
                              }
                            }}
                            onBlur={() => {
                              if (task.estimatedTime && task.estimatedTime !== '') {
                                setEditingEstimatedTime(null);
                              }
                            }}
                            placeholder="00:00"
                            className="time-estimate-input"
                            onClick={(e) => e.stopPropagation()}
                            maxLength={5}
                          />
                        )}
                      </div>
                      <div className="time-display-section">
                        <span className="actual-time">
                          {task.actualTime || '00:00'}
                        </span>
                      </div>
                    </div>
                    )}

                    {/* Inline note editing for this specific card */}
                    {!isFocusMode && showNoteModal === task.id && (
                      <div className="inline-note-editor">
                        <div className="note-editor-header">
                          <span className="note-icon">📝</span>
                          <span>Add Note</span>
                        </div>
                        <textarea
                          value={tempNote}
                          onChange={(e) => setTempNote(e.target.value)}
                          placeholder="Enter your note..."
                          className="inline-note-textarea"
                          rows={3}
                          autoFocus
                        />
                        <div className="inline-editor-actions">
                          <button 
                            onClick={() => setShowNoteModal(null)}
                            className="cancel-button"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => saveNote(task.id)}
                            className="save-button"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline checklist editing for this specific card */}
                    {!isFocusMode && showChecklistModal === task.id && (
                      <div className="inline-checklist-editor">
                        <div className="checklist-editor-header">
                          <span className="checklist-icon">☑️</span>
                          <span>Checklist</span>
                        </div>
                        <div className="inline-checklist-items">
                          {tempChecklist.map((item, index) => (
                            <div key={item.id} className="inline-checklist-item">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => toggleChecklistItem(index)}
                              />
                              <input
                                type="text"
                                value={item.text}
                                onChange={(e) => updateChecklistItem(index, e.target.value)}
                                placeholder="Enter checklist item..."
                                className="inline-checklist-item-input"
                              />
                              <button
                                onClick={() => removeChecklistItem(index)}
                                className="remove-checklist-item"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={addChecklistItem} className="add-checklist-item">
                          + Add Item
                        </button>
                        <div className="inline-editor-actions">
                          <button 
                            onClick={() => setShowChecklistModal(null)}
                            className="cancel-button"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => saveChecklist(task.id)}
                            className="save-button"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}


                  </div>
                </div>
              ))}
              

              
              {showScheduleModal && (
                <div className="modal-overlay" onClick={() => setShowScheduleModal(null)}>
                  <div className="modal-content schedule-modal" onClick={(e) => e.stopPropagation()}>
                    <h3>Schedule Task</h3>
                    
                    <div className="schedule-form">
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          value={scheduleForm.date}
                          onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                          className="schedule-input"
                        />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Start Time</label>
                          <input
                            type="time"
                            value={scheduleForm.startTime}
                            onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                            className="schedule-input"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>End Time</label>
                          <input
                            type="time"
                            value={scheduleForm.endTime}
                            onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})}
                            className="schedule-input"
                          />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>Color</label>
                        <select
                          value={scheduleForm.color}
                          onChange={(e) => setScheduleForm({...scheduleForm, color: e.target.value})}
                          className="schedule-input"
                        >
                          <option value="#3b82f6">Blue</option>
                          <option value="#ef4444">Red</option>
                          <option value="#10b981">Green</option>
                          <option value="#f59e0b">Orange</option>
                          <option value="#8b5cf6">Purple</option>
                          <option value="#ec4899">Pink</option>
                          <option value="#06b6d4">Cyan</option>
                          <option value="#84cc16">Lime</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="modal-actions">
                      <button onClick={() => setShowScheduleModal(null)}>Cancel</button>
                      <button onClick={() => saveSchedule(showScheduleModal)}>Save</button>
                    </div>
                  </div>
                </div>
              )}
              
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
        {!isFocusMode && (
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
              <div className="add-column-container">
            <button 
              className="add-column-button"
              onClick={() => setShowAddColumn(true)}
            >
              <div className="plus-icon">+</div>
                  <span>Add List</span>
                </button>
                                <button 
                  className="start-working-button"
                  onClick={() => {
                    startFocusMode();
                  }}
                >
                  Start working
            </button>
              </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}; 