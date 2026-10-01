import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import OTPScreen from './screens/OTPScreen';
import AppsCheckScreen from './screens/AppsCheckScreen';
import SystemCheckScreen from './screens/SystemCheckScreen';
import FaceVerifyScreen from './screens/FaceVerifyScreen';
import ConsentScreen from './screens/ConsentScreen';
import ExamScreen from './screens/ExamScreen';
import ResultsScreen from './screens/ResultsScreen';

export type AppScreen =
  | 'splash'
  | 'login'
  | 'otp'
  | 'apps-check'
  | 'system-check'
  | 'face-verify'
  | 'consent'
  | 'exam'
  | 'results';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');

  const navigate = (to: AppScreen) => setScreen(to);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%)',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      color: '#ffffff',
    }}>
      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <motion.div key="splash" {...slideProps}>
            <SplashScreen onDone={() => navigate('login')} />
          </motion.div>
        )}
        {screen === 'login' && (
          <motion.div key="login" {...slideProps}>
            <LoginScreen onSuccess={() => navigate('otp')} />
          </motion.div>
        )}
        {screen === 'otp' && (
          <motion.div key="otp" {...slideProps}>
            <OTPScreen onSuccess={() => navigate('apps-check')} />
          </motion.div>
        )}
        {screen === 'apps-check' && (
          <motion.div key="apps-check" {...slideProps}>
            <AppsCheckScreen onClean={() => navigate('system-check')} />
          </motion.div>
        )}
        {screen === 'system-check' && (
          <motion.div key="system-check" {...slideProps}>
            <SystemCheckScreen onPass={() => navigate('face-verify')} />
          </motion.div>
        )}
        {screen === 'face-verify' && (
          <motion.div key="face-verify" {...slideProps}>
            <FaceVerifyScreen onVerified={() => navigate('consent')} />
          </motion.div>
        )}
        {screen === 'consent' && (
          <motion.div key="consent" {...slideProps}>
            <ConsentScreen onAgreed={() => navigate('exam')} />
          </motion.div>
        )}
        {screen === 'exam' && (
          <motion.div key="exam" {...slideProps}>
            <ExamScreen onSubmit={async () => {
              await invoke('release_lockdown').catch(() => {});
              navigate('results');
            }} />
          </motion.div>
        )}
        {screen === 'results' && (
          <motion.div key="results" {...slideProps}>
            <ResultsScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const slideProps = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.3 },
  style: { width: '100%', height: '100%', position: 'absolute' as const, top: 0, left: 0 },
};
