import { useState, FormEvent } from 'react';
import credentialsData from '../data/credentials.json';
import { useNavigate } from 'react-router-dom';

interface LoginFormState {
  username: string;
  password: string;
  error: string;
}

const Login = () => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<LoginFormState>({
    username: '',
    password: '',
    error: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
      error: ''
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formState.username || !formState.password) {
      setFormState(prev => ({ ...prev, error: 'Please enter both username and password' }));
      return;
    }
    
    // Validate against hard-coded credentials
    if (
      formState.username === credentialsData.username && 
      formState.password === credentialsData.password
    ) {
      // Store auth state (in a real app, you might use a proper auth token)
      sessionStorage.setItem('isAuthenticated', 'true');
      // Redirect to main page
      navigate('/main');
    } else {
      setFormState(prev => ({ ...prev, error: 'Invalid username or password' }));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Quản Lý Dữ Liệu NAP</h1>
          <h2 className="mt-2 text-gray-600">Đăng nhập</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formState.username}
                onChange={handleInputChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border
                border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none
                focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm
                bg-white
                max-w-[420px]"
                placeholder="Tài khoản"
                aria-label="Username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formState.password}
                onChange={handleInputChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm
                max-w-[420px]
                bg-white
                mt-5"
                placeholder="Mật khẩu"
                aria-label="Password"
              />
            </div>
          </div>

          {formState.error && (
            <div className="text-red-500 text-sm text-center">{formState.error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              aria-label="Sign in"
              tabIndex={0}
            >
              Đăng nhập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;