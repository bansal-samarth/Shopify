import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, DollarSign, Users, ShoppingCart, LogOut, Package, Store, Eye, EyeOff, Sparkles } from 'lucide-react';

// API Configuration - Update this if your backend is deployed elsewhere
const API_BASE = 'https://shopify-c669.onrender.com';

// Demo credentials for testing
const demoCredentials = [
  {
    username: 'admin_tenant1',
    password: 'admin123',
    tenantId: 1,
    description: 'Admin - 14dgk9-my.myshopify.com'
  },
  {
    username: 'manager_tenant1',
    password: 'manager123',
    tenantId: 1,
    description: 'Manager - 14dgk9-my.myshopify.com'
  },
  {
    username: 'admin_tenant2',
    password: 'admin456',
    tenantId: 2,
    description: 'Admin - ukqatr-e0.myshopify.com'
  },
  {
    username: 'staff_tenant2',
    password: 'staff123',
    tenantId: 2,
    description: 'Staff - ukqatr-e0.myshopify.com'
  }
];

// API functions for interacting with the backend
const api = {
  login: async (username, password) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }
    
    return response.json();
  },
  getDashboardData: async (tenantId, token, dateFrom, dateTo) => {
    const params = new URLSearchParams({ from: dateFrom, to: dateTo });
    const response = await fetch(`${API_BASE}/api/dashboard/${tenantId}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }
    
    return response.json();
  }
};

// Auth Page Component with Demo Credentials
const AuthPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const result = await api.login(username, password);
      onLogin(result.user, result.token);
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (credentials) => {
    setUsername(credentials.username);
    setPassword(credentials.password);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20 relative z-10 transform transition-all duration-500 hover:scale-105">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform transition-transform duration-300 hover:rotate-12">
            <Store className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Shopify Insights
          </h1>
          <p className="text-gray-300">Sign in to view your store analytics</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 backdrop-blur-sm"
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 backdrop-blur-sm"
                placeholder="Enter your password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm animate-shake">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Demo Credentials Section */}
          <div className="mt-6">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-center text-gray-300 hover:text-white transition-colors duration-300 text-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {showDemo ? 'Hide' : 'Show'} Demo Credentials
            </button>
            
            {showDemo && (
              <div className="mt-4 space-y-2 animate-fadeIn">
                <p className="text-xs text-gray-400 text-center mb-3">Click any credential to auto-fill:</p>
                {demoCredentials.map((cred, index) => (
                  <div
                    key={index}
                    onClick={() => handleDemoLogin(cred)}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white text-sm font-medium">{cred.username}</p>
                        <p className="text-gray-400 text-xs">{cred.description}</p>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {cred.password}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Stats Card Component with Enhanced Animations
const StatsCard = ({ title, value, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
    green: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100/50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 group">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium mb-2 group-hover:text-gray-600 transition-colors">{title}</p>
          <p className="text-3xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">{value}</p>
        </div>
        <div className={`bg-gradient-to-r ${colorClasses[color]} p-4 rounded-2xl shadow-lg group-hover:shadow-xl transform group-hover:rotate-12 transition-all duration-300`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
};

// Dashboard Component with Modern Enhancements
const Dashboard = ({ user, token, onLogout }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError('');
    try {
      const dashboardData = await api.getDashboardData(user.tenantId, token, dateFrom, dateTo);
      setData(dashboardData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dateFrom, dateTo, token, user.tenantId]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto animate-spin animation-delay-150"></div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Loading dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Preparing your analytics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center text-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={loadData} 
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <div>No data found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-xl shadow-lg">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Analytics for {user.shopDomain}
              </h1>
              <p className="text-gray-600">Welcome back, <span className="font-semibold text-purple-600">{user.username}</span>!</p>
            </div>
          </div>
          <button 
            onClick={onLogout} 
            className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100/50 rounded-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </button>
        </div>
      </header>
      
      <main className="p-6 space-y-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 flex flex-wrap items-center gap-4 border border-gray-100/50">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 text-purple-500 mr-3" />
            <span className="text-gray-700 font-semibold">Date Range:</span>
          </div>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-white/50 backdrop-blur-sm"
          />
          <span className="text-gray-500 font-medium">to</span>
          <input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-white/50 backdrop-blur-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="Total Customers" value={Number(data.totalCustomers).toLocaleString()} icon={Users} color="blue" />
          <StatsCard title="Total Products" value={Number(data.totalProducts).toLocaleString()} icon={Package} color="green" />
          <StatsCard title="Total Orders" value={Number(data.totalOrders).toLocaleString()} icon={ShoppingCart} color="purple" />
          <StatsCard title="Total Revenue" value={formatCurrency(data.totalRevenue)} icon={DollarSign} color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100/50 hover:shadow-2xl transition-all duration-500">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3"></div>
              Orders Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.ordersByDate}>
                <defs>
                  <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  labelFormatter={formatDate}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fill="url(#orderGradient)"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100/50 hover:shadow-2xl transition-all duration-500">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <div className="w-2 h-6 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full mr-3"></div>
              Revenue Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByDate}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  labelFormatter={formatDate} 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100/50 hover:shadow-2xl transition-all duration-500">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-2 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-3"></div>
            Top 5 Customers by Spend
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Customer</th>
                  <th className="text-center py-4 px-4 font-bold text-gray-700">Orders</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((customer, index) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 group">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${
                          index === 0 ? 'from-yellow-400 to-orange-400' :
                          index === 1 ? 'from-gray-400 to-gray-500' :
                          index === 2 ? 'from-orange-400 to-red-400' :
                          'from-blue-400 to-purple-400'
                        } flex items-center justify-center text-white font-bold mr-4 group-hover:scale-110 transition-transform duration-300`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{customer.firstName} {customer.lastName}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {customer.orderCount}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-green-600 text-lg">{formatCurrency(customer.totalSpent)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100/50 hover:shadow-2xl transition-all duration-500">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full mr-3"></div>
            Recently Added Products
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.recentProducts.map((product) => (
              <div key={product.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
                <div className="flex items-start justify-between mb-3">
                  <Package className="text-indigo-500 w-6 h-6 flex-shrink-0" />
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">NEW</span>
                </div>
                <h4 className="font-semibold text-gray-800 truncate mb-2">{product.title}</h4>
                <p className="text-sm text-gray-600">by <span className="font-medium text-indigo-600">{product.vendor}</span></p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('shopify_user');
    const savedToken = localStorage.getItem('shopify_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('shopify_user', JSON.stringify(userData));
    localStorage.setItem('shopify_token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.clear();
  };

  return (
    <div className="App">
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        
        .animation-delay-2000 {
          animation-delay: 2000ms;
        }
        
        .animation-delay-4000 {
          animation-delay: 4000ms;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
      {!user || !token ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} token={token} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;