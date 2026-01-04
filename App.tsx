
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TabHome from './components/TabHome';
import TabCalculator from './components/TabCalculator';
import TabProfile from './components/TabProfile';
import TabMyParcels from './components/TabMyParcels';
import TabSupport from './components/TabSupport';
import Registration from './components/Registration';
import AdminDashboard from './components/AdminDashboard';
import AddTrackModal from './components/AddTrackModal';
import { Tab } from './types';
import { getUserProfile, logoutUser, syncGlobalSettings, registerUserActivity } from './services/storageService';
import { supabase, upsertUser, trackUserActivity } from './services/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // SUPABASE TRACKING & INIT
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      try {
        window.Telegram.WebApp.enableClosingConfirmation();
      } catch (e) {
        console.log('Closing confirmation not supported');
      }

      // 1. Upsert User to DB
      upsertUser();
      
      // 2. Log Login Activity
      trackUserActivity('app_open');

      // 3. Realtime Presence (Who is online)
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        const channel = supabase.channel('online-users');
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
             await channel.track({
               online_at: new Date().toISOString(),
               user_id: user.id,
               name: user.first_name
             });
          }
        });

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, []);

  useEffect(() => {
    const profile = getUserProfile();
    if (profile && profile.clientId && profile.phone) {
      setIsRegistered(true);
      registerUserActivity(profile);
    }
    
    // Check for #admin hash
    if (window.location.hash === '#admin') {
      setIsAdminMode(true);
    }

    syncGlobalSettings();
  }, []);

  const handleLogout = () => {
      logoutUser();
      setIsRegistered(false);
      setActiveTab(Tab.HOME);
  };

  const handleTrackAdded = () => {
      setRefreshKey(prev => prev + 1);
      setActiveTab(Tab.MY_PARCELS);
      trackUserActivity('add_track');
  };

  // When tab changes, log it
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    trackUserActivity('tab_change', tab);
  }

  if (isAdminMode) {
      return <AdminDashboard onLogout={() => {
        setIsAdminMode(false);
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }} />;
  }

  if (!isRegistered) {
    return (
      <Registration 
        onRegister={() => {
          setIsRegistered(true);
          trackUserActivity('registration_success');
        }} 
        onAdminLogin={() => {
          setIsAdminMode(true);
        }} 
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case Tab.HOME: return <TabHome onNavigate={handleTabChange} />;
      case Tab.MY_PARCELS: return <TabMyParcels refreshTrigger={refreshKey} />;
      case Tab.CALCULATOR: return <TabCalculator />;
      case Tab.SUPPORT: return <TabSupport />;
      case Tab.PROFILE: return <TabProfile onLogout={handleLogout} />;
      default: return <TabHome onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen pb-safe-bottom">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <main className="relative z-10 max-w-md mx-auto min-h-screen px-5 pt-6 pb-24 safe-area-top h-full">
        {renderContent()}
      </main>

      {isAddModalOpen && (
          <AddTrackModal 
            onClose={() => setIsAddModalOpen(false)} 
            onAdded={handleTrackAdded}
          />
      )}

      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onAddClick={() => setIsAddModalOpen(true)}
      />
    </div>
  );
}

export default App;
