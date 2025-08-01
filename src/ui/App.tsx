import { useState } from 'react'
import { Kanban } from '../components/ui/kanban'
import './App.css'
import React from 'react';

interface Project {
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

  const [activeTab, setActiveTab] = useState<'project' | 'calendar'>('project')
  const [projects, setProjects] = useState<Project[]>(getInitialProjects);
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectTitle, setEditingProjectTitle] = useState('')

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
        title: newProjectTitle.trim()
      }
      setProjects([...projects, newProject])
      setNewProjectTitle('')
      setShowAddProject(false)
    }
  }

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
      {/* Header with centered toggle switcher */}
      <header className="header">
        <div className="toggle-container">
          <div className="toggle-switch">
            <button 
              className={`toggle-option ${activeTab === 'project' ? 'active' : ''}`}
              onClick={() => setActiveTab('project')}
            >
              Project View
            </button>
            <button 
              className={`toggle-option ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              Calendar View
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="main-content">
        {activeTab === 'project' && (
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
                  onClick={() => handleProjectClick(project.id)}
                >
                  {editingProjectId === project.id ? (
                    <input
                      type="text"
                      value={editingProjectTitle}
                      onChange={(e) => setEditingProjectTitle(e.target.value)}
                      className="edit-card-title-input"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveProjectEdit()}
                      onBlur={handleSaveProjectEdit}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditProject(project.id, project.title)
                      }}
                      className="clickable-project-title"
                    >
                      {project.title}
                    </h3>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'calendar' && (
          <div className="calendar-view">
            <h2>Calendar View</h2>
            <p>Calendar functionality coming soon...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
