import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { 
  FiHome, 
  FiGrid, 
  FiVideo, 
  FiCalendar, 
  FiMail, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiCode
} from 'react-icons/fi'

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()

  const menuItems = [
    { name: 'Home', path: '/', icon: FiHome, public: true },
    { name: 'Dashboard', path: '/dashboard', icon: FiGrid, auth: true },
    { name: 'Projects', path: '/projects', icon: FiCode, auth: true },
    { name: 'Meetings', path: '/home', icon: FiVideo, auth: true },
    { name: 'Calendar', path: '/calendar', icon: FiCalendar, auth: true },
    { name: 'Inbox', path: '/inbox', icon: FiMail, auth: true },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleNavigation = (path) => {
    navigate(path)
    onClose()
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    onClose()
  }

  const getUserInitials = (username) => {
    if (!username) return 'U'
    return username.substring(0, 2).toUpperCase()
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-gray-900 to-gray-800 text-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FiCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">CodeCollab</h1>
                <p className="text-xs text-gray-400">Remote Collaboration</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 p-6">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              if (item.auth && !isAuthenticated) return null
              if (!item.public && !item.auth && !isAuthenticated) return null
              
              const IconComponent = item.icon
              const active = isActive(item.path)
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${
                    active ? 'text-white' : 'text-gray-400'
                  }`} />
                  <span className="font-medium">{item.name}</span>
                  {active && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
        
        {/* User Panel */}
        {isAuthenticated && user && (
          <div className="p-6 border-t border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {getUserInitials(user.username)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.username || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.email || 'user@example.com'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => handleNavigation('/settings')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-colors"
              >
                <FiSettings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-colors"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Login prompt for non-authenticated users */}
        {!isAuthenticated && (
          <div className="p-6 border-t border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-3">Sign in to access all features</p>
              <button
                onClick={() => handleNavigation('/login')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Sidebar