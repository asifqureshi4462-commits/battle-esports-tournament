import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthScreen } from './screens/AuthScreen.tsx';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { TournamentsScreen } from './screens/TournamentsScreen.tsx';
import { MyMatchesScreen } from './screens/MyMatchesScreen.tsx';
import { WalletScreen } from './screens/WalletScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { AdminScreen } from './screens/AdminScreen.tsx';
import { AddCashModal } from './components/modals/AddCashModal.tsx';
import { WithdrawModal } from './components/modals/WithdrawModal.tsx';
import { SupportModal } from './components/modals/SupportModal.tsx';
import { TournamentDetailModal } from './components/modals/TournamentDetailModal.tsx';
import { AccountSuspendedModal } from './components/modals/AccountSuspendedModal.tsx';
import { PushNotificationSettingsModal } from './components/modals/PushNotificationSettingsModal.tsx';
import { InAppPushBanner } from './components/notifications/InAppPushBanner.tsx';
import { Shield, RefreshCw } from 'lucide-react';

function MainApp() {
  const {
    user,
    isLoading,
    activeTab,
    setActiveTab,
    openAddCashModal,
    setOpenAddCashModal,
    openWithdrawModal,
    setOpenWithdrawModal,
    openSupportModal,
    setOpenSupportModal,
    openNotificationSettingsModal,
    setOpenNotificationSettingsModal,
    selectedTournamentId,
    setSelectedTournamentId,
    activePushAlert,
    dismissPushAlert,
  } = useAuth();

  // Loading state when validating session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5 mb-4 shadow-xl shadow-rose-950/60 flex items-center justify-center animate-pulse">
          <div className="w-full h-full bg-[#0e1017] rounded-[14px] flex items-center justify-center text-rose-500">
            <Shield className="w-7 h-7 animate-spin" />
          </div>
        </div>
        <h2 className="text-base font-bold font-heading tracking-wider">BATTLE ESPORTS TOURNAMENT</h2>
        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
          Loading Arena...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Real-time In-App Push Banner Toast for Mobile Users */}
      <InAppPushBanner
        alert={activePushAlert}
        onDismiss={dismissPushAlert}
        onAction={(tab) => setActiveTab(tab as any)}
      />

      <AccountSuspendedModal />

      {!user ? (
        <AuthScreen />
      ) : (
        <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
          {/* Top App Header */}
          <Navbar />

          {/* Main View Area */}
          <main className="flex-1 w-full pt-2">
            {activeTab === 'home' && <HomeScreen />}
            {activeTab === 'tournaments' && <TournamentsScreen />}
            {activeTab === 'matches' && <MyMatchesScreen />}
            {activeTab === 'wallet' && <WalletScreen />}
            {activeTab === 'profile' && <ProfileScreen />}
            {activeTab === 'admin' && (user.role === 'admin' ? <AdminScreen /> : <HomeScreen />)}
          </main>

          {/* Bottom Navigation */}
          <BottomNav />

          {/* Global Interactive Modals */}
          <AddCashModal
            isOpen={openAddCashModal}
            onClose={() => setOpenAddCashModal(false)}
          />

          <WithdrawModal
            isOpen={openWithdrawModal}
            onClose={() => setOpenWithdrawModal(false)}
          />

          <SupportModal
            isOpen={openSupportModal}
            onClose={() => setOpenSupportModal(false)}
          />

          <TournamentDetailModal
            tournamentId={selectedTournamentId}
            onClose={() => setSelectedTournamentId(null)}
          />

          <PushNotificationSettingsModal
            isOpen={openNotificationSettingsModal}
            onClose={() => setOpenNotificationSettingsModal(false)}
          />
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
