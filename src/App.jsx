import { useState } from 'react';
import { useStore } from './logic/store';
import { useCloudSync } from './cloud/useCloudSync';
import { useToday } from './hooks';
import { sfx } from './sfx';
import TodayView from './components/TodayView';
import WorkoutView from './components/WorkoutView';
import ProgressView from './components/ProgressView';
import BadgesView from './components/BadgesView';
import SettingsView from './components/SettingsView';
import RewardModal from './components/RewardModal';
import CardioSheet from './components/CardioSheet';
import { Icon } from './components/Icons';

const TABS = [
  ['today', 'Today', 'home'],
  ['progress', 'Progress', 'chart'],
  ['badges', 'Badges', 'trophy'],
  ['settings', 'Settings', 'gear'],
];

export default function App() {
  const [state, setState] = useStore();
  const [tab, setTab] = useState('today');
  const [reward, setReward] = useState(null);
  const [cardioOpen, setCardioOpen] = useState(false);
  const today = useToday();
  const cloud = useCloudSync(state, setState);
  const sound = state.settings.sound;

  /** Apply an action result of shape { state, reward }. */
  const apply = (result) => {
    if (!result) return;
    setState(result.state);
    if (result.reward) {
      setReward(result.reward);
      if (sound) sfx.fanfare();
    }
  };

  const modals = (
    <>
      {cardioOpen && (
        <CardioSheet
          today={today}
          onClose={() => setCardioOpen(false)}
          onSave={(result) => {
            setCardioOpen(false);
            apply(result);
          }}
          state={state}
        />
      )}
      {reward && <RewardModal reward={reward} sound={sound} onClose={() => setReward(null)} />}
    </>
  );

  if (state.activeWorkout) {
    return (
      <div className="app">
        <WorkoutView
          state={state}
          setState={setState}
          onFinish={(result) => {
            setTab('today');
            apply(result);
          }}
        />
        {modals}
      </div>
    );
  }

  return (
    <div className="app">
      <main className="page">
        {tab === 'today' && (
          <TodayView
            state={state}
            setState={setState}
            apply={apply}
            today={today}
            cloud={cloud}
            onCardio={() => setCardioOpen(true)}
            onOpenSettings={() => setTab('settings')}
          />
        )}
        {tab === 'progress' && <ProgressView state={state} setState={setState} />}
        {tab === 'badges' && <BadgesView state={state} />}
        {tab === 'settings' && <SettingsView state={state} setState={setState} cloud={cloud} />}
      </main>
      <nav className="tabbar">
        {TABS.map(([id, label, icon]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {modals}
    </div>
  );
}
