import { useState } from 'react'
import { Kanban } from '../components/ui/kanban'
import './App.css'
import React from 'react';

interface Project {
  id: string;
  title: string;
  color?: string; // hex color for project border
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
  estimatedTime?: string; // HH:MM format for estimated time
  projectId?: string; // Added for calendar view
  projectTitle?: string; // Added for calendar view
  actualTime?: string; // Added for actual time tracking
}

interface Column {
  id: string;
  title: string;
}

function App() {
  // Initialize projects from localStorage
  const getInitialProjects = (): Project[] => {
    try {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        return JSON.parse(savedProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    return [];
  };

  const [activeTab, setActiveTab] = useState<'project' | 'calendar' | 'analytics'>('project')
  const [projects, setProjects] = useState<Project[]>(getInitialProjects);
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectTitle, setEditingProjectTitle] = useState('')
  const [showProjectOptionsModal, setShowProjectOptionsModal] = useState<string | null>(null);
  const [projectOptionsTitle, setProjectOptionsTitle] = useState('');
  const [projectOptionsColor, setProjectOptionsColor] = useState('#007AFF');
  
  // Calendar view state
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null)
  const [showAnalyticsView, setShowAnalyticsView] = useState(false)

  // Save projects to localStorage whenever projects change
  React.useEffect(() => {
    try {
      localStorage.setItem('projects', JSON.stringify(projects));
      console.log('Saved projects to localStorage:', projects.length, 'projects');
    } catch (error) {
      console.error('Error saving projects:', error);
    }
  }, [projects]);

  // Debug selectedProject changes
  React.useEffect(() => {
    console.log('selectedProject changed to:', selectedProject);
  }, [selectedProject]);

  const handleAddProject = () => {
    if (newProjectTitle.trim()) {
      const newProject: Project = {
        id: Math.random().toString(),
        title: newProjectTitle.trim(),
        color: '#007AFF' // Default blue color
      };
      setProjects([...projects, newProject]);
      setNewProjectTitle('');
      setShowAddProject(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    console.log('Selecting project:', projectId);
    setSelectedProject(projectId)
  }

  const handleBackToProjects = () => {
    console.log('Going back to projects, current selectedProject:', selectedProject);
    setSelectedProject(null)
  }

  const handleEditProject = (projectId: string, currentTitle: string) => {
    setEditingProjectId(projectId)
    setEditingProjectTitle(currentTitle)
  }

  const handleSaveProjectEdit = () => {
    if (editingProjectTitle.trim()) {
      setProjects(projects.map(project => 
        project.id === editingProjectId 
          ? { ...project, title: editingProjectTitle.trim() }
          : project
      ))
      setEditingProjectId(null)
      setEditingProjectTitle('')
    }
  }

  const handleCancelProjectEdit = () => {
    setEditingProjectId(null)
    setEditingProjectTitle('')
  }

  const handleProjectColorChange = (projectId: string, color: string) => {
    setProjects(projects.map(project => 
      project.id === projectId 
        ? { ...project, color }
        : project
    ));
  };

  const handleOpenProjectOptions = (project: Project) => {
    setShowProjectOptionsModal(project.id);
    setProjectOptionsTitle(project.title);
    setProjectOptionsColor(project.color || '#007AFF');
  };

  const handleSaveProjectOptions = () => {
    if (showProjectOptionsModal && projectOptionsTitle.trim()) {
      setProjects(projects.map(project => 
        project.id === showProjectOptionsModal 
          ? { ...project, title: projectOptionsTitle.trim(), color: projectOptionsColor }
          : project
      ));
      setShowProjectOptionsModal(null);
      setProjectOptionsTitle('');
      setProjectOptionsColor('#007AFF');
    }
  };

  const handleCancelProjectOptions = () => {
    setShowProjectOptionsModal(null);
    setProjectOptionsTitle('');
    setProjectOptionsColor('#007AFF');
  };

  // Calendar view functions
  const handleTabChange = (newTab: 'project' | 'calendar' | 'analytics') => {
    if (newTab !== activeTab) {
      const direction = newTab === 'calendar' ? 'left' : newTab === 'analytics' ? 'left' : 'right'
      setTransitionDirection(direction)
      setIsTransitioning(true)
      setTimeout(() => {
        setActiveTab(newTab)
        setIsTransitioning(false)
        setTransitionDirection(null)
      }, 300)
    }
  }

  const CalendarView = ({ currentProject }: { currentProject: string | null }) => {
    // Calendar navigation state
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    // Get tasks from the current project or all projects
    const getProjectTasks = (): Task[] => {
      if (currentProject) {
        // Get tasks from specific project
        try {
          const savedData = localStorage.getItem(`kanban-${currentProject}`);
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            return (parsedData.tasks || []) as Task[];
          }
        } catch (error) {
          console.error('Error loading project tasks:', error);
        }
        return [];
      } else {
        // Get tasks from all projects
        const allTasks: Task[] = [];
        try {
          projects.forEach(project => {
            const savedData = localStorage.getItem(`kanban-${project.id}`);
            if (savedData) {
              const parsedData = JSON.parse(savedData);
              const projectTasks = (parsedData.tasks || []) as Task[];
              // Add project info to tasks for identification
              const tasksWithProject = projectTasks.map(task => ({
                ...task,
                projectId: project.id,
                projectTitle: project.title
              }));
              allTasks.push(...tasksWithProject);
            }
          });
        } catch (error) {
          console.error('Error loading all project tasks:', error);
        }
        return allTasks;
      }
    };

    const tasks: Task[] = getProjectTasks();
    
    const calculateTaskDuration = (task: Task): number => {
      if (!task.scheduledStartTime || !task.scheduledEndTime) return 1; // Default 1 hour
      
      const startTime = new Date(`2000-01-01T${task.scheduledStartTime}:00`);
      const endTime = new Date(`2000-01-01T${task.scheduledEndTime}:00`);
      
      const diffMs = endTime.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return Math.max(0.5, diffHours); // Minimum 30 minutes
    };

    const organizeOverlappingTasks = (tasks: Task[]): Task[][] => {
      if (tasks.length <= 1) return [tasks];
      
      const sortedTasks = [...tasks].sort((a, b) => {
        const aStart = a.scheduledStartTime || '00:00';
        const bStart = b.scheduledStartTime || '00:00';
        return aStart.localeCompare(bStart);
      });
      
      const columns: Task[][] = [];
      
      sortedTasks.forEach(task => {
        let placed = false;
        
        // Try to place in existing column
        for (let i = 0; i < columns.length; i++) {
          const column = columns[i];
          const lastTask = column[column.length - 1];
          
          // Check if this task overlaps with the last task in this column
          const canPlace = !lastTask || !isOverlapping(task, lastTask);
          
          if (canPlace) {
            column.push(task);
            placed = true;
            break;
          }
        }
        
        // If couldn't place in existing column, create new column
        if (!placed) {
          columns.push([task]);
        }
      });
      
      return columns;
    };

    const isOverlapping = (task1: Task, task2: Task): boolean => {
      if (!task1.scheduledStartTime || !task1.scheduledEndTime || 
          !task2.scheduledStartTime || !task2.scheduledEndTime) {
        return false;
      }
      
      const start1 = new Date(`2000-01-01T${task1.scheduledStartTime}:00`);
      const end1 = new Date(`2000-01-01T${task1.scheduledEndTime}:00`);
      const start2 = new Date(`2000-01-01T${task2.scheduledStartTime}:00`);
      const end2 = new Date(`2000-01-01T${task2.scheduledEndTime}:00`);
      
      // Check if tasks overlap (including 15-minute buffer)
      const buffer = 15 * 60 * 1000; // 15 minutes in milliseconds
      return (start1.getTime() - buffer) < end2.getTime() && 
             (start2.getTime() - buffer) < end1.getTime();
    };
    
    const getCurrentDate = () => {
      return {
        year: currentViewDate.getFullYear(),
        month: currentViewDate.getMonth(),
        day: currentViewDate.getDate(),
        dayOfWeek: currentViewDate.getDay()
      }
    }

    const navigateCalendar = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentViewDate);
      
      switch (calendarView) {
        case 'day':
          newDate.setDate(currentViewDate.getDate() + (direction === 'next' ? 1 : -1));
          break;
        case 'week':
          newDate.setDate(currentViewDate.getDate() + (direction === 'next' ? 7 : -7));
          break;
        case 'month':
          newDate.setMonth(currentViewDate.getMonth() + (direction === 'next' ? 1 : -1));
          break;
      }
      
      setCurrentViewDate(newDate);
    }

    const goToToday = () => {
      setCurrentViewDate(new Date());
    }

    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
      return new Date(year, month, 1).getDay()
    }

    const getWeekDays = () => {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }

    const getMonthName = (month: number) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
      return months[month]
    }

    const currentDate = getCurrentDate()

    const renderDayView = () => {
      const currentDateString = `${currentDate.year}-${(currentDate.month + 1).toString().padStart(2, '0')}-${currentDate.day.toString().padStart(2, '0')}`;
      const dayTasks = tasks.filter(task => task.scheduledDate === currentDateString);
      const timedTasks = dayTasks.filter(task => task.scheduledStartTime);
      const untimedTasks = dayTasks.filter(task => !task.scheduledStartTime);
      
      return (
        <div className="calendar-day-view">
                  <div className="calendar-header">
          <h3>{getMonthName(currentDate.month)} {currentDate.day}, {currentDate.year}</h3>
          <div className="calendar-controls">
            <button 
              className="calendar-nav-btn" 
              onClick={() => navigateCalendar('prev')}
            >
              ‹
            </button>
            <button 
              className="calendar-today-btn" 
              onClick={goToToday}
            >
              Today
            </button>
            <button 
              className="calendar-nav-btn" 
              onClick={() => navigateCalendar('next')}
            >
              ›
            </button>
          </div>
        </div>
          <div className="calendar-day-content">
            {untimedTasks.length > 0 && (
              <div className="untimed-tasks-section">
                <h4 className="untimed-tasks-title">All Day Events</h4>
                <div className="untimed-tasks-list">
                  {untimedTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="scheduled-task untimed-task"
                      style={{ 
                        backgroundColor: task.scheduledColor || '#6b7280',
                        borderLeft: `4px solid ${task.scheduledColor || '#6b7280'}`
                      }}
                    >
                      <div className="scheduled-task-title">{task.title}</div>
                      {task.projectTitle && !currentProject && (
                        <div className="scheduled-task-project">{task.projectTitle}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="time-slots">
              {Array.from({ length: 24 }, (_, i) => {
                const hourTasks = timedTasks.filter(task => {
                  const startHour = parseInt(task.scheduledStartTime!.split(':')[0]);
                  return startHour === i;
                });
                
                return (
                  <div key={i} className="time-slot">
                    <span className="time-label">{i.toString().padStart(2, '0')}:00</span>
                    <div className="time-content">
                      {(() => {
                        const organizedTasks = organizeOverlappingTasks(hourTasks);
                        return (
                          <div className="task-columns" style={{ display: 'flex', gap: '4px' }}>
                            {organizedTasks.map((column, columnIndex) => (
                              <div key={columnIndex} className="task-column" style={{ flex: 1 }}>
                                {column.map(task => {
                                  const duration = calculateTaskDuration(task);
                                  return (
                                    <div 
                                      key={task.id} 
                                      className="scheduled-task"
                                      style={{ 
                                        backgroundColor: task.scheduledColor || '#3b82f6',
                                        borderLeft: `4px solid ${task.scheduledColor || '#3b82f6'}`,
                                        height: `${Math.max(40, duration * 60)}px`,
                                        minHeight: '40px',
                                        marginBottom: '2px'
                                      }}
                                    >
                                      <div className="scheduled-task-title">{task.title}</div>
                                      {duration >= 1 && task.projectTitle && !currentProject && (
                                        <div className="scheduled-task-project">{task.projectTitle}</div>
                                      )}
                                      {duration >= 1 && task.scheduledStartTime && task.scheduledEndTime && (
                                        <div className="scheduled-task-time">
                                          {task.scheduledStartTime} - {task.scheduledEndTime}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

    const renderWeekView = () => {
      const weekDays = getWeekDays()
      const startOfWeek = new Date(currentViewDate)
      startOfWeek.setDate(currentViewDate.getDate() - currentViewDate.getDay())

      return (
        <div className="calendar-week-view">
                  <div className="calendar-header">
          <h3>Week of {getMonthName(startOfWeek.getMonth())} {startOfWeek.getDate()}</h3>
          <div className="calendar-controls">
            <button 
              className="calendar-nav-btn" 
              onClick={() => navigateCalendar('prev')}
            >
              ‹
            </button>
            <button 
              className="calendar-today-btn" 
              onClick={goToToday}
            >
              Today
            </button>
            <button 
              className="calendar-nav-btn" 
              onClick={() => navigateCalendar('next')}
            >
              ›
            </button>
          </div>
        </div>
          <div className="calendar-week-content">
            <div className="week-header">
              <div className="time-column-header"></div>
              {weekDays.map((day, index) => {
                const date = new Date(startOfWeek)
                date.setDate(startOfWeek.getDate() + index)
                const isToday = date.toDateString() === new Date().toDateString()
                const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
                const dayTasks = tasks.filter(task => task.scheduledDate === dateString)
                const untimedTasks = dayTasks.filter(task => !task.scheduledStartTime)
                
                return (
                  <div key={day} className={`week-day-header ${isToday ? 'today' : ''}`}>
                    <span className="day-name">{day}</span>
                    <span className="day-date">{date.getDate()}</span>
                    {untimedTasks.length > 0 && (
                      <div className="week-day-untimed-tasks">
                        {untimedTasks.map(task => (
                          <div 
                            key={task.id} 
                            className="scheduled-task untimed-task"
                            style={{ 
                              backgroundColor: task.scheduledColor || '#6b7280',
                              borderLeft: `4px solid ${task.scheduledColor || '#6b7280'}`
                            }}
                          >
                            <div className="scheduled-task-title">{task.title}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="week-grid">
              <div className="time-column">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="time-slot">
                    <span className="time-label">{i.toString().padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>
              {weekDays.map((day, dayIndex) => {
                const date = new Date(startOfWeek)
                date.setDate(startOfWeek.getDate() + dayIndex)
                const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
                const dayTasks = tasks.filter(task => task.scheduledDate === dateString)
                const timedTasks = dayTasks.filter(task => task.scheduledStartTime)
                
                return (
                  <div key={day} className="week-day-column">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hourTasks = timedTasks.filter(task => {
                        const startHour = parseInt(task.scheduledStartTime!.split(':')[0]);
                        return startHour === i;
                      });
                      
                                              return (
                          <div key={i} className="week-time-slot">
                            {(() => {
                              const organizedTasks = organizeOverlappingTasks(hourTasks);
                              return (
                                <div className="task-columns" style={{ display: 'flex', gap: '2px' }}>
                                  {organizedTasks.map((column, columnIndex) => (
                                    <div key={columnIndex} className="task-column" style={{ flex: 1 }}>
                                      {column.map(task => {
                                        const duration = calculateTaskDuration(task);
                                        return (
                                          <div 
                                            key={task.id} 
                                            className="scheduled-task"
                                            style={{ 
                                              backgroundColor: task.scheduledColor || '#3b82f6',
                                              borderLeft: `4px solid ${task.scheduledColor || '#3b82f6'}`,
                                              height: `${Math.max(40, duration * 60)}px`,
                                              minHeight: '40px',
                                              marginBottom: '1px'
                                            }}
                                          >
                                            <div className="scheduled-task-title">{task.title}</div>
                                            {duration >= 1 && task.projectTitle && !currentProject && (
                                              <div className="scheduled-task-project">{task.projectTitle}</div>
                                            )}
                                            {duration >= 1 && task.scheduledStartTime && task.scheduledEndTime && (
                                              <div className="scheduled-task-time">
                                                {task.scheduledStartTime} - {task.scheduledEndTime}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        );
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    const renderMonthView = () => {
      const daysInMonth = getDaysInMonth(currentDate.year, currentDate.month)
      const firstDayOfMonth = getFirstDayOfMonth(currentDate.year, currentDate.month)
      const weekDays = getWeekDays()

      return (
        <div className="calendar-month-view">
                  <div className="calendar-header">
          <h3>{getMonthName(currentDate.month)} {currentDate.year}</h3>
          <div className="calendar-controls">
            <button 
              className="calendar-nav-btn" 
              onClick={() => navigateCalendar('prev')}
            >
              ‹
            </button>
            <button 
              className="calendar-today-btn" 
              onClick={goToToday}
            >
              Today
            </button>
            <button 
              className="calendar-nav-btn" 
              onClick={() => navigateCalendar('next')}
            >
              ›
            </button>
          </div>
        </div>
          <div className="calendar-month-content">
            <div className="month-header">
              {weekDays.map(day => (
                <div key={day} className="month-day-header">{day}</div>
              ))}
            </div>
            <div className="month-grid">
              {Array.from({ length: firstDayOfMonth }, (_, i) => (
                <div key={`empty-${i}`} className="month-day empty"></div>
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const isToday = day === currentDate.day
                const dateString = `${currentDate.year}-${(currentDate.month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                const dayTasks = tasks.filter(task => task.scheduledDate === dateString)
                
                return (
                  <div key={day} className={`month-day ${isToday ? 'today' : ''}`}>
                    <span className="day-number">{day}</span>
                    <div className="month-day-tasks">
                      {dayTasks.map(task => {
                        const duration = calculateTaskDuration(task);
                        return (
                          <div 
                            key={task.id} 
                            className="scheduled-task"
                            style={{ 
                              backgroundColor: task.scheduledColor || '#3b82f6',
                              borderLeft: `4px solid ${task.scheduledColor || '#3b82f6'}`
                            }}
                          >
                            <div className="scheduled-task-title">{task.title}</div>
                            {duration >= 2 && task.projectTitle && !currentProject && (
                              <div className="scheduled-task-project">{task.projectTitle}</div>
                            )}
                            {duration >= 2 && task.scheduledStartTime && (
                              <div className="scheduled-task-time">
                                {task.scheduledStartTime}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="calendar-container">
        <div className="calendar-view-selector">
          <select 
            value={calendarView} 
            onChange={(e) => setCalendarView(e.target.value as 'day' | 'week' | 'month')}
            className="calendar-view-dropdown"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        
        <div className="calendar-content">
          {calendarView === 'day' && renderDayView()}
          {calendarView === 'week' && renderWeekView()}
          {calendarView === 'month' && renderMonthView()}
        </div>
      </div>
    )
  }

  // Analytics View Component
  const AnalyticsView = () => {
    // Get all tasks across all projects
    const getAllTasks = (): Task[] => {
      const allTasks: Task[] = [];
      
      projects.forEach(project => {
        try {
          const savedData = localStorage.getItem(`kanban-${project.id}`);
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            const projectTasks = (parsedData.tasks || []) as Task[];
            const tasksWithProject = projectTasks.map((task: Task) => ({
              ...task,
              projectId: project.id,
              projectTitle: project.title
            }));
            allTasks.push(...tasksWithProject);
          }
        } catch (error) {
          console.error('Error loading tasks for project:', project.id, error);
        }
      });
      
      return allTasks;
    };

    // Calculate total time spent on each project
    const getProjectTimeDistribution = () => {
      const projectTimes: { [key: string]: number } = {};
      const allTasks = getAllTasks();
      
      projects.forEach(project => {
        let totalMinutes = 0;
        
        // Get all tasks for this project
        const projectTasks = allTasks.filter((task: Task) => task.projectId === project.id);
        
        // Sum up actual time for all tasks in this project
        projectTasks.forEach((task: Task) => {
          if (task.actualTime) {
            const [hours, minutes] = task.actualTime.split(':').map(Number);
            totalMinutes += hours * 60 + minutes;
          }
        });
        
        projectTimes[project.id] = totalMinutes;
      });
      
      return projectTimes;
    };

    const projectTimeDistribution = getProjectTimeDistribution();
    const totalTime = Object.values(projectTimeDistribution).reduce((sum, time) => sum + time, 0);

    const renderPieChart = () => {
      if (totalTime === 0) {
    return (
          <div className="analytics-placeholder">
            <p>No time data available. Start working on tasks to see your project time distribution.</p>
        </div>
        );
      }

      const sortedProjects = projects
        .filter(project => projectTimeDistribution[project.id] > 0)
        .sort((a, b) => projectTimeDistribution[b.id] - projectTimeDistribution[a.id]);

      return (
        <div className="pie-chart-container">
          <svg className="pie-chart" viewBox="0 0 200 200">
            {(() => {
              let currentAngle = 0;
              return sortedProjects.map((project, index) => {
                const time = projectTimeDistribution[project.id];
                const percentage = (time / totalTime) * 100;
                const angle = (percentage / 100) * 360;
                const radius = 80;
                const centerX = 100;
                const centerY = 100;
                
                // Calculate arc coordinates
                const startAngle = currentAngle * (Math.PI / 180);
                const endAngle = (currentAngle + angle) * (Math.PI / 180);
                
                const x1 = centerX + radius * Math.cos(startAngle);
                const y1 = centerY + radius * Math.sin(startAngle);
                const x2 = centerX + radius * Math.cos(endAngle);
                const y2 = centerY + radius * Math.sin(endAngle);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                
                const pathData = [
                  `M ${centerX} ${centerY}`,
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');
                
                // Calculate label position
                const labelAngle = (currentAngle + angle / 2) * (Math.PI / 180);
                const labelRadius = radius + 15;
                const labelX = centerX + labelRadius * Math.cos(labelAngle);
                const labelY = centerY + labelRadius * Math.sin(labelAngle);
                
                currentAngle += angle;
                
                return (
                  <g key={project.id}>
                    <path
                      d={pathData}
                      fill="#000"
                      stroke={project.color || '#007AFF'}
                      strokeWidth="3"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pie-chart-label"
                      fontSize="10"
                      fill="#fff"
                    >
                      {project.title}
                    </text>
                  </g>
                );
              });
            })()}
          </svg>
          <div className="pie-chart-legend">
            {sortedProjects.map(project => {
              const time = projectTimeDistribution[project.id];
              const percentage = ((time / totalTime) * 100).toFixed(1);
              const hours = Math.floor(time / 60);
              const minutes = time % 60;
              const timeDisplay = hours > 0 
                ? `${hours}h ${minutes}m` 
                : `${minutes}m`;
              
              return (
                <div key={project.id} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ backgroundColor: project.color || '#007AFF' }}
                  ></div>
                  <div className="legend-text">
                    <span className="legend-title">{project.title}</span>
                    <span className="legend-time">{timeDisplay} ({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    // Calculate project efficiency data
    const getProjectEfficiencyData = () => {
      const allTasks = getAllTasks();
      const efficiencyData: Array<{
        projectId: string;
        projectName: string;
        projectColor: string;
        totalEstimated: number;
        totalActual: number;
        efficiency: number;
        rating: string;
      }> = [];

      projects.forEach(project => {
        const projectTasks = allTasks.filter((task: Task) => task.projectId === project.id);
        
        let totalEstimatedMinutes = 0;
        let totalActualMinutes = 0;

        // Helper function to parse time string (handles single digit hours/minutes)
        const parseTimeString = (timeStr: string): number => {
          if (!timeStr || !timeStr.includes(':')) return 0;
          
          const parts = timeStr.split(':');
          if (parts.length !== 2) return 0;
          
          const hours = parseInt(parts[0].trim(), 10);
          const minutes = parseInt(parts[1].trim(), 10);
          
          if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
            return 0;
          }
          
          return hours * 60 + minutes;
        };

        // Get all tasks (for estimated time calculation)
        projectTasks.forEach((task: Task) => {
          // Sum ALL estimated times (regardless of completion status)
          if (task.estimatedTime) {
            const minutes = parseTimeString(task.estimatedTime);
            totalEstimatedMinutes += minutes;
          }
        });

        // Get only COMPLETED tasks (for actual time calculation)
        const completedTasks = projectTasks.filter((task: Task) => task.column === 'done');
        completedTasks.forEach((task: Task) => {
          // Sum actual time only from completed tasks
          if (task.actualTime) {
            const minutes = parseTimeString(task.actualTime);
            totalActualMinutes += minutes;
          }
        });

        // Debug logging
        if (project.title && (totalEstimatedMinutes > 0 || totalActualMinutes > 0)) {
          console.log(`Project "${project.title}":`, {
            allTasks: projectTasks.length,
            completedTasks: completedTasks.length,
            totalEstimated: totalEstimatedMinutes,
            totalActual: totalActualMinutes,
            tasksWithEstimates: projectTasks.filter(t => t.estimatedTime).length,
            completedTasksWithActual: completedTasks.filter(t => t.actualTime).length
          });
        }

        // Only include projects that have both estimated and actual time
        if (totalEstimatedMinutes > 0 && totalActualMinutes > 0) {
          const efficiency = (totalActualMinutes / totalEstimatedMinutes) * 100;
          
          let rating = "Needs work";
          if (efficiency <= 110 && efficiency >= 90) {
            rating = "Excellent";
          } else if (efficiency <= 130 && efficiency >= 80) {
            rating = "Good";
          }

          efficiencyData.push({
            projectId: project.id,
            projectName: project.title,
            projectColor: project.color || '#007AFF',
            totalEstimated: totalEstimatedMinutes,
            totalActual: totalActualMinutes,
            efficiency: efficiency,
            rating: rating
          });
        }
      });

      return efficiencyData.sort((a, b) => a.efficiency - b.efficiency);
    };

    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const renderEfficiencyTable = () => {
      const efficiencyData = getProjectEfficiencyData();

      if (efficiencyData.length === 0) {
        return (
            <div className="analytics-placeholder">
            <p>No efficiency data available. Add estimated times to your tasks to see project efficiency analysis.</p>
            </div>
        );
      }

      return (
        <div className="efficiency-table-container">
          <table className="efficiency-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Estimated Time</th>
                <th>Actual Time</th>
                <th>Efficiency</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {efficiencyData.map(project => (
                <tr key={project.projectId}>
                  <td className="project-name-cell">
                    <div className="project-indicator">
                      <div 
                        className="project-color-dot" 
                        style={{ backgroundColor: project.projectColor }}
                      ></div>
                      <span>{project.projectName}</span>
          </div>
                  </td>
                  <td>{formatTime(project.totalEstimated)}</td>
                  <td>{formatTime(project.totalActual)}</td>
                  <td className="efficiency-cell">
                    <span className={`efficiency-percentage ${project.rating.toLowerCase().replace(' ', '-')}`}>
                      {project.efficiency.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className={`efficiency-rating ${project.rating.toLowerCase().replace(' ', '-')}`}>
                      {project.rating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

        return (
      <div className="analytics-container">
        <div className="analytics-section">
          <h3>Project Time Distribution</h3>
          {renderPieChart()}
        </div>
        
        <div className="analytics-section">
          <h3>Project Efficiency</h3>
          {renderEfficiencyTable()}
        </div>
      </div>
    );
  };

  // Helper function to get kanban data for a project
  const getProjectKanbanData = (projectId: string) => {
    try {
      const savedData = localStorage.getItem(`kanban-${projectId}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        return {
          tasks: parsedData.tasks || [],
          columns: parsedData.columns || []
        };
      }
    } catch (error) {
      console.error('Error loading project kanban data:', error);
    }
    return { tasks: [], columns: [] };
  }

  // Miniature Kanban View Component
  const MiniKanbanView = ({ projectId }: { projectId: string }) => {
    const getProjectKanbanData = (projectId: string) => {
      try {
        const savedData = localStorage.getItem(`kanban-${projectId}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          return {
            tasks: parsedData.tasks || [],
            columns: parsedData.columns || []
          };
        }
      } catch (error) {
        console.error('Error loading project kanban data:', error);
      }
      return { tasks: [], columns: [] };
    };

    const { tasks, columns } = getProjectKanbanData(projectId);
    
    if (columns.length === 0) {
      return <div className="mini-kanban-empty">No lists yet</div>;
    }

    return (
      <div className="mini-kanban">
        <div className="mini-kanban-columns">
                  {columns.map((column: Column) => {
          const columnTasks = tasks.filter((task: Task) => task.column === column.id);
          return (
            <div key={column.id} className="mini-kanban-column">
              <div className="mini-column-content">
                {columnTasks.slice(0, 3).map((task: Task) => (
                  <div key={task.id} className="mini-task">
                  </div>
                ))}
                {columnTasks.length > 3 && (
                  <div className="mini-task-more">
                    +{columnTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  if (selectedProject) {
    return (
      <div className="app">
        <header className="header">
          <button 
            onClick={handleBackToProjects}
            className="back-button"
          >
            ← Back to Projects
          </button>
          <div className="project-title">
            {editingProjectId === selectedProject ? (
              <div className="edit-project-title">
                <input
                  type="text"
                  value={editingProjectTitle}
                  onChange={(e) => setEditingProjectTitle(e.target.value)}
                  className="edit-title-input"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveProjectEdit()}
                  onBlur={handleSaveProjectEdit}
                />
              </div>
            ) : (
              <span 
                onClick={() => handleEditProject(selectedProject, projects.find(p => p.id === selectedProject)?.title || '')}
                className="clickable-project-title"
              >
                {projects.find(p => p.id === selectedProject)?.title}
              </span>
            )}
          </div>
        </header>
        <main className="main-content">
          <Kanban projectId={selectedProject} />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Analytics View */}
      {showAnalyticsView ? (
        <div className="analytics-full-view">
          <header className="analytics-header">
            <button 
              onClick={() => setShowAnalyticsView(false)}
              className="back-button"
            >
              ← Back
            </button>
            <h1 className="analytics-title">Analytics</h1>
          </header>
          <main className="main-content">
            <AnalyticsView />
          </main>
        </div>
      ) : (
        <>
      {/* Header with centered toggle switcher and analytics button */}
      <header className="header">
        <div className="header-content">
          <div className="toggle-container">
            <div className="ios-toggle-switch">
              <div className="toggle-track">
                <div className={`toggle-slider ${activeTab === 'calendar' ? 'active' : ''}`}></div>
              </div>
              <div className="toggle-labels">
                <span className={`toggle-label ${activeTab === 'project' ? 'active' : ''}`}>Project</span>
                <span className={`toggle-label ${activeTab === 'calendar' ? 'active' : ''}`}>Calendar</span>
              </div>
              <button 
                className="toggle-button"
                onClick={() => handleTabChange(activeTab === 'project' ? 'calendar' : 'project')}
                aria-label={`Switch to ${activeTab === 'project' ? 'calendar' : 'project'} view`}
              >
                <span className="sr-only">Toggle view</span>
              </button>
            </div>
          </div>
          <button 
            className="analytics-button"
                onClick={() => setShowAnalyticsView(true)}
            title="Analytics"
          >
            Analytics
          </button>
        </div>
      </header>

            {/* Main content area */}
      <main className="main-content">
        <div className="view-container">
          {/* Project View */}
          <div className={`project-view-container ${activeTab === 'project' ? 'active' : ''} ${isTransitioning && transitionDirection === 'left' ? 'slide-out-left' : ''} ${isTransitioning && transitionDirection === 'right' ? 'slide-in-left' : ''} ${activeTab === 'calendar' ? 'hidden' : ''}`}>
            <div className="project-view">
              <div className="add-project-section">
                {showAddProject ? (
                  <div className="add-project-form">
                    <input
                      type="text"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Enter project title..."
                      className="project-input"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && handleAddProject()}
                    />
                    <div className="form-buttons">
                      <button 
                        onClick={handleAddProject}
                        className="save-button"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => {
                          setShowAddProject(false)
                          setNewProjectTitle('')
                        }}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="add-project-button"
                    onClick={() => setShowAddProject(true)}
                  >
                    <div className="plus-icon">+</div>
                    <span>Add Project</span>
                  </button>
                )}
              </div>
              <div className="projects-container">
                {projects.map(project => (
                  <div 
                    key={project.id}
                    className="project-card"
                        data-color={project.color || '#007AFF'}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="project-card-header">
                          <div className="project-header-content">
                            <h3 className="project-title">
                              {project.title}
                            </h3>
                          </div>
                          <div className="project-options-button">
                            <button 
                              className="three-dots-button"
                          onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProjectOptions(project);
                              }}
                              title="Project options"
                            >
                              ⋯
                            </button>
                          </div>
                    </div>
                    
                    <div className="project-card-divider"></div>
                    
                    <div className="project-card-content">
                      <MiniKanbanView projectId={project.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <div className={`calendar-view-container ${activeTab === 'calendar' ? 'active' : ''} ${isTransitioning && transitionDirection === 'left' ? 'slide-in-right' : ''} ${isTransitioning && transitionDirection === 'right' ? 'slide-out-right' : ''} ${activeTab === 'project' ? 'hidden' : ''}`}>
            <div className="calendar-view">
              <CalendarView currentProject={selectedProject} />
            </div>
          </div>
            </div>
          </main>
        </>
      )}
      {/* Project Options Modal */}
      {showProjectOptionsModal && (
        <div className="modal-overlay" onClick={handleCancelProjectOptions}>
          <div className="modal-content project-options-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Project Options</h3>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="project-title">Project Name</label>
                <input
                  id="project-title"
                  type="text"
                  value={projectOptionsTitle}
                  onChange={(e) => setProjectOptionsTitle(e.target.value)}
                  className="modal-input"
                  placeholder="Enter project name..."
                  autoFocus
                />
          </div>
              <div className="form-group">
                <label htmlFor="project-color">Project Color</label>
                <select
                  id="project-color"
                  value={projectOptionsColor}
                  onChange={(e) => setProjectOptionsColor(e.target.value)}
                  className="modal-color-select"
                >
                  <option value="#007AFF">🔵</option>
                  <option value="#FF3B30">🔴</option>
                  <option value="#34C759">🟢</option>
                  <option value="#FF9500">🟠</option>
                  <option value="#AF52DE">🟣</option>
                  <option value="#FFCC00">🟡</option>
                  <option value="#FF6B6B">🔺</option>
                  <option value="#4ECDC4">🔷</option>
                </select>
        </div>
              <div className="modal-actions">
                <button 
                  onClick={handleSaveProjectOptions}
                  className="save-button"
                >
                  Save
                </button>
                <button 
                  onClick={handleCancelProjectOptions}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App