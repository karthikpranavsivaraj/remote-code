import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import Home from "./components/Home";
import Editor from "./components/Editor";
import Homepage from "./components/Homepage.jsx";
import Login from './components/login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ProjectDashboard from './components/ProjectDashboard';
import ProjectManagement from './components/ProjectManagement';
import CodeEditor from './components/CodeEditor';
import LiveRoom from './components/LiveRoom';
import Calendar from './components/Calendar';
import Inbox from './components/Inbox';
import NotificationsPage from './components/NotificationsPage';
import StandupMeetings from './components/StandupMeetings';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import { useAuthStore } from './store/authStore';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="text-white">
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <Layout><ProjectDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/project/:projectId" element={
          <ProtectedRoute>
            <Layout><ProjectManagement /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/editor/:projectId" element={
          <ProtectedRoute>
            <Layout><CodeEditor /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/home" element={
          <ProtectedRoute>
            <Layout><StandupMeetings /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/editor/:id" element={
          <ProtectedRoute>
            <Layout><Editor /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/room/:projectId" element={
          <ProtectedRoute>
            <LiveRoom />
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <Layout><Calendar /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/inbox" element={
          <ProtectedRoute>
            <Layout><Inbox /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Layout><NotificationsPage /></Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;
