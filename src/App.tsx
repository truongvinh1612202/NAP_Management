import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './utils/trpc';
import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Main from './pages/Main'
import './App.css'

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    // This is just to ensure the app is properly initialized
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route 
              path="/main" 
              element={
                <ProtectedRoute>
                  <Main />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
    </QueryClientProvider>
  );
}

export default App