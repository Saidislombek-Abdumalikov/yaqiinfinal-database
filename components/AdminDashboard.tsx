
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { APP_NAME } from '../constants';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Stats
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [dailyActive, setDailyActive] = useState<any[]>([]);
  const [lastUsers, setLastUsers] = useState<any[]>([]);

  useEffect(() => {
    // Check if session exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAuthenticated(true);
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      subscribeToPresence();
    }
  }, [isAuthenticated]);

  const subscribeToPresence = () => {
    const channel = supabase.channel('online-users');
    channel.on('presence', { event: 'sync' }, () => {
       const state = channel.presenceState();
       // Count unique user_ids
       const uniqueUsers = new Set();
       Object.values(state).forEach((presences: any) => {
         presences.forEach((p: any) => uniqueUsers.add(p.user_id));
       });
       setOnlineCount(uniqueUsers.size);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const loadStats = async () => {
    setLoading(true);
    
    // 1. Total Users
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    setTotalUsers(count || 0);

    // 2. Last 10 Users
    const { data: users } = await supabase.from('users').select('*').order('last_active', { ascending: false }).limit(10);
    setLastUsers(users || []);

    // 3. Activity Chart (Logs grouped by date)
    // Note: Supabase JS doesn't do complex grouping easily without RPC, 
    // so we'll fetch last 7 days logs and group in JS for this mini app.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: logs } = await supabase
        .from('activity_logs')
        .select('timestamp')
        .gte('timestamp', sevenDaysAgo.toISOString());

    if (logs) {
        const grouped: Record<string, number> = {};
        logs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            grouped[date] = (grouped[date] || 0) + 1;
        });
        
        const chartData = Object.keys(grouped).map(key => ({
            name: key,
            count: grouped[key]
        })).reverse(); // Simple reverse, strictly should sort by date
        setDailyActive(chartData);
    }

    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        alert("Xatolik: " + error.message);
    } else {
        setIsAuthenticated(true);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    onLogout();
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
                <h2 className="text-2xl font-black text-center mb-6 text-gray-800">{APP_NAME} Admin</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="Email"
                        className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-primary"
                    />
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="Password"
                        className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-primary"
                    />
                    <button disabled={loading} className="w-full py-4 bg-primary text-white rounded-xl font-bold">
                        {loading ? 'Kirish...' : 'Kirish'}
                    </button>
                    <button type="button" onClick={onLogout} className="w-full py-2 text-gray-400 text-sm">Chiqish</button>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6 pb-20">
      <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-800">Dashboard</h1>
          <button onClick={handleSignOut} className="bg-white p-2 rounded-xl shadow-sm text-red-500">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl shadow-soft">
              <p className="text-xs text-gray-400 font-bold uppercase">Online Users</p>
              <div className="flex items-center gap-2 mt-1">
                 <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                 <span className="text-4xl font-black text-gray-800">{onlineCount}</span>
              </div>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-soft">
              <p className="text-xs text-gray-400 font-bold uppercase">Total Users</p>
              <div className="mt-1">
                 <span className="text-4xl font-black text-primary">{totalUsers}</span>
              </div>
          </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-soft mb-6">
          <h3 className="font-bold text-gray-800 mb-4">Daily Activity (Last 7 Days)</h3>
          <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={dailyActive}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                        cursor={{fill: '#F3F4F6'}}
                     />
                     <Bar dataKey="count" fill="#fe7d08" radius={[4, 4, 0, 0]} />
                 </BarChart>
             </ResponsiveContainer>
          </div>
      </div>

      <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Last Active Users</h3>
          </div>
          <table className="w-full text-left">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">ID</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">Name</th>
                      <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">Active</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                  {lastUsers.map((user) => (
                      <tr key={user.telegram_id}>
                          <td className="px-6 py-4 text-xs font-mono">{user.telegram_id}</td>
                          <td className="px-6 py-4 text-sm font-bold">{user.first_name}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                              {new Date(user.last_active).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
