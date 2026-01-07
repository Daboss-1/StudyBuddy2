import { createContext, useContext, useEffect, useState } from 'react';

const SettingsContext = createContext({});

export const useSettings = () => useContext(SettingsContext);

// High school schedule configuration
const DEFAULT_SCHEDULE = {
  periods: [
    { id: 1, name: 'Period 1', startTime: '08:00', endTime: '09:30', duration: 90, subject: 'Math' },
    { id: 2, name: 'Period 2', startTime: '09:40', endTime: '11:10', duration: 90, subject: 'Science' },
    { id: 'lunch', name: 'Lunch', startTime: '11:10', endTime: '11:50', duration: 40, subject: 'Lunch' },
    { id: 3, name: 'Period 3', startTime: '11:50', endTime: '13:20', duration: 90, subject: 'English' },
    { id: 4, name: 'Period 4', startTime: '13:30', endTime: '15:00', duration: 90, subject: 'History' }
  ],
  lunchTime: {
    start: '11:10',
    end: '11:50'
  }
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    schedule: DEFAULT_SCHEDULE,
    showTips: true,
    theme: 'light',
    notifications: true
  });

  const [tips, setTips] = useState([]);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('studybuddy_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Error parsing saved settings:', error);
        }
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studybuddy_settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Update schedule
  const updateSchedule = (newSchedule) => {
    setSettings(prev => ({
      ...prev,
      schedule: { ...prev.schedule, ...newSchedule }
    }));
  };

  // Update period subject
  const updatePeriodSubject = (periodId, subject) => {
    const updatedPeriods = settings.schedule.periods.map(period => {
      if (period.id === periodId) {
        return { ...period, subject };
      }
      return period;
    });

    setSettings(prev => ({
      ...prev,
      schedule: { ...prev.schedule, periods: updatedPeriods }
    }));
  };

  // Update period time
  const updatePeriodTime = (periodId, startTime, endTime) => {
    const updatedPeriods = settings.schedule.periods.map(period => {
      if (period.id === periodId) {
        return {
          ...period,
          startTime,
          endTime,
          duration: calculateDuration(startTime, endTime)
        };
      }
      return period;
    });

    setSettings(prev => ({
      ...prev,
      schedule: { ...prev.schedule, periods: updatedPeriods }
    }));
  };

  // Update lunch time
  const updateLunchTime = (startTime, endTime) => {
    const updatedPeriods = settings.schedule.periods.map(period => {
      if (period.id === 'lunch') {
        return {
          ...period,
          startTime,
          endTime,
          duration: calculateDuration(startTime, endTime)
        };
      }
      return period;
    });

    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        periods: updatedPeriods,
        lunchTime: { start: startTime, end: endTime }
      }
    }));
  };

  // Calculate duration in minutes
  const calculateDuration = (startTime, endTime) => {
    const start = new Date(`2024-01-01 ${startTime}`);
    const end = new Date(`2024-01-01 ${endTime}`);
    return (end - start) / (1000 * 60);
  };

  // Get current period
  const getCurrentPeriod = () => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return settings.schedule.periods.find(period => {
      return currentTime >= period.startTime && currentTime < period.endTime;
    });
  };

  // Get next period
  const getNextPeriod = () => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return settings.schedule.periods.find(period => {
      return currentTime < period.startTime;
    });
  };

  // Calculate time until next period
  const getTimeUntilNextPeriod = () => {
    const nextPeriod = getNextPeriod();
    if (!nextPeriod) return null;

    const now = new Date();
    const nextPeriodTime = new Date();
    const [hours, minutes] = nextPeriod.startTime.split(':');
    nextPeriodTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If next period is tomorrow, add 24 hours
    if (nextPeriodTime < now) {
      nextPeriodTime.setDate(nextPeriodTime.getDate() + 1);
    }

    return nextPeriodTime - now;
  };

  // Show tip
  const showTip = (message, type = 'info', duration = 5000) => {
    if (!settings.showTips) return;

    const tip = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };

    setTips(prev => [...prev, tip]);

    // Auto remove tip after duration
    setTimeout(() => {
      setTips(prev => prev.filter(t => t.id !== tip.id));
    }, duration);
  };

  // Remove tip
  const removeTip = (tipId) => {
    setTips(prev => prev.filter(tip => tip.id !== tipId));
  };

  // Toggle tips
  const toggleTips = () => {
    setSettings(prev => ({ ...prev, showTips: !prev.showTips }));
  };

  // Update general setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const value = {
    settings,
    updateSchedule,
    updateLunchTime,
    updatePeriodSubject,
    updatePeriodTime,
    getCurrentPeriod,
    getNextPeriod,
    getTimeUntilNextPeriod,
    showTip,
    removeTip,
    toggleTips,
    updateSetting,
    tips
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
