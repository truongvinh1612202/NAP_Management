import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationMenu from '../components/NavigationMenu';
import DataTable from '../components/DataTable';

const Main = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');

  // Check if user is authenticated
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-100 w-[100vw]">
      {/* Left Navigation Menu */}
      <NavigationMenu />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Welcome to NAP Management System</p>
        </div> */}

        {/* Data Table Area */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* <div className="border-b pb-4 mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-700">Projects Overview</h2>
              <p className="text-gray-500 text-sm">Manage and monitor your projects</p>
            </div>
            <div className="flex space-x-2">
              <button 
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                tabIndex={0}
                aria-label="Add New Project"
              >
                Add Project
              </button>
              <button 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                tabIndex={0}
                aria-label="Export Data"
              >
                Export
              </button>
            </div>
          </div> */}
          
          {/* AG Grid Enterprise Table */}
          <div className="h-[70vh]">
            <DataTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;
