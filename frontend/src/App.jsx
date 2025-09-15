import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, DollarSign, Users, ShoppingCart, LogOut, Package, Store } from 'lucide-react';

// API Configuration - Update this if your backend is deployed elsewhere
const API_BASE = 'https://shopify-c669.onrender.com/';

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

// Auth Page Component
const AuthPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Shopify Insights</h1>
          <p className="text-gray-600">Sign in to view your store analytics</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`bg-gradient-to-r ${colorClasses[color]} p-3 rounded-lg shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={loadData} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return <div>No data found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Analytics for {user.shopDomain}</h1>
            <p className="text-gray-600">Welcome, <span className="font-medium">{user.username}</span>!</p>
          </div>
          <button onClick={onLogout} className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 mr-2" />Sign Out
          </button>
        </div>
      </header>
      
      <main className="p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center"><Calendar className="w-5 h-5 text-gray-500 mr-2" /><span className="text-gray-700 font-medium">Date Range:</span></div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg"/>
            <span className="text-gray-500">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg"/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Total Customers" value={Number(data.totalCustomers).toLocaleString()} icon={Users} color="blue" />
            <StatsCard title="Total Products" value={Number(data.totalProducts).toLocaleString()} icon={Package} color="green" />
            <StatsCard title="Total Orders" value={Number(data.totalOrders).toLocaleString()} icon={ShoppingCart} color="purple" />
            <StatsCard title="Total Revenue" value={formatCurrency(data.totalRevenue)} icon={DollarSign} color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Orders Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.ordersByDate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={formatDate} /><YAxis /><Tooltip labelFormatter={formatDate} /><Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByDate}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={formatDate} /><YAxis /><Tooltip labelFormatter={formatDate} formatter={(value) => formatCurrency(value)}/><Bar dataKey="revenue" fill="#10B981" /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Customers by Spend</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b"><th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th><th className="text-center py-3 px-4 font-semibold text-gray-700">Orders</th><th className="text-right py-3 px-4 font-semibold text-gray-700">Total Spent</th></tr></thead>
              <tbody>
                {data.topCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4"><div className="font-medium">{customer.firstName} {customer.lastName}</div><div className="text-sm text-gray-500">{customer.email}</div></td>
                    <td className="py-3 px-4 text-center">{customer.orderCount}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(customer.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recently Added Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recentProducts.map((product) => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 truncate">{product.title}</h4>
                <p className="text-sm text-gray-600 mt-1">by {product.vendor}</p>
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
      {!user || !token ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} token={token} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;