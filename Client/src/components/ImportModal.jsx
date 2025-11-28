import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { githubAPI } from '../services/api'

const ImportModal = ({ projectId, onClose, onImportComplete }) => {
  const [importType, setImportType] = useState('github')
  const [githubUrl, setGithubUrl] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])

  const handleGithubImport = async (e) => {
    e.preventDefault()
    if (!githubUrl.trim()) {
      toast.error('Please enter a GitHub repository URL')
      return
    }
    
    setImporting(true)
    try {
      const response = await githubAPI.importFiles(projectId, githubToken, githubUrl)
      toast.success(`Imported ${response.data.filesCount} files successfully!`)
      onImportComplete()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleLocalImport = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to import')
      return
    }
    
    setImporting(true)
    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })
      
      const response = await githubAPI.importLocalFiles(projectId, formData)
      toast.success(`Imported ${response.data.filesCount} files successfully!`)
      onImportComplete()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">Import Files</h3>
        
        {/* Import Type Selection */}
        <div className="mb-4">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setImportType('github')}
              className={`px-4 py-2 rounded ${importType === 'github' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              GitHub Repository
            </button>
            <button
              type="button"
              onClick={() => setImportType('local')}
              className={`px-4 py-2 rounded ${importType === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Local Files
            </button>
          </div>
        </div>

        {importType === 'github' ? (
          <>
            <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
              <p className="font-medium mb-1">GitHub Import:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Public repos:</strong> No token needed</li>
                <li><strong>Private repos:</strong> GitHub token required</li>
              </ul>
            </div>

            <form onSubmit={handleGithubImport}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="https://github.com/username/repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Token (For private repos)
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import from GitHub'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="mb-4 p-3 bg-green-50 rounded text-sm text-green-800">
              <p className="font-medium mb-1">Local File Import:</p>
              <p className="text-xs">Select multiple code files from your computer</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Files *
              </label>
              <input
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.py,.java,.php,.rb,.go,.cpp,.c,.cs,.sql,.html,.css,.scss,.vue,.json,.xml,.yaml,.yml,.md,.txt"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              />
              {selectedFiles.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedFiles.length} file(s) selected
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLocalImport}
                disabled={importing || selectedFiles.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import Local Files'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ImportModal