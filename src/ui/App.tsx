import { useState } from 'react'
import './App.css'

interface Project {
  id: string;
  title: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'project' | 'calendar'>('project')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')

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
    setSelectedProject(projectId)
  }

  const handleBackToProjects = () => {
    setSelectedProject(null)
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
            {projects.find(p => p.id === selectedProject)?.title}
          </div>
        </header>
        <main className="main-content">
          <div className="kanban-placeholder">
            <h2>Kanban Board</h2>
            <p>Kanban functionality coming soon...</p>
          </div>
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
                  <h3>{project.title}</h3>
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
