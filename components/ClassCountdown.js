import { useState, useEffect } from 'react';
import { Card, Badge, ProgressBar } from 'react-bootstrap';
import { useSettings } from '../contexts/SettingsContext';

export default function ClassCountdown() {
  const { getCurrentPeriod, getNextPeriod, getTimeUntilNextPeriod } = useSettings();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const timeUntilNext = getTimeUntilNextPeriod();
      setTimeLeft(timeUntilNext);
    }, 1000);

    return () => clearInterval(timer);
  }, [getTimeUntilNextPeriod]);

  const formatTime = (milliseconds) => {
    if (!milliseconds) return '00:00:00';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCurrentProgress = () => {
    const currentPeriod = getCurrentPeriod();
    if (!currentPeriod) return 0;

    const now = currentTime;
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const periodStart = new Date(`2024-01-01 ${currentPeriod.startTime}`);
    const periodEnd = new Date(`2024-01-01 ${currentPeriod.endTime}`);
    const currentTimeDate = new Date(`2024-01-01 ${currentTimeStr}`);
    
    const totalDuration = periodEnd - periodStart;
    const elapsed = currentTimeDate - periodStart;
    
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  const currentPeriod = getCurrentPeriod();
  const nextPeriod = getNextPeriod();

  return (
    <Card className="class-countdown-card border-0 shadow-sm">
      <Card.Body className="text-center">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">
            <i className="fas fa-clock me-2 text-primary"></i>
            Schedule
          </h5>
          <Badge bg="secondary" className="current-time">
            {formatCurrentTime()}
          </Badge>
        </div>

        {currentPeriod ? (
          <div className="current-period">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold text-success">
                <i className="fas fa-play-circle me-1"></i>
                Current: {currentPeriod.name}
              </span>
              <small className="text-muted">
                {currentPeriod.startTime} - {currentPeriod.endTime}
              </small>
            </div>
            <ProgressBar 
              now={getCurrentProgress()} 
              variant="success" 
              className="mb-2"
              style={{ height: '8px' }}
            />
            <small className="text-muted">
              {Math.round(getCurrentProgress())}% complete
            </small>
          </div>
        ) : (
          <div className="between-periods">
            <Badge bg="info" className="mb-2">
              <i className="fas fa-pause me-1"></i>
              Between Classes
            </Badge>
          </div>
        )}

        {nextPeriod && timeLeft > 0 ? (
          <div className="next-period mt-3">
            <hr />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-bold text-primary">
                <i className="fas fa-forward me-1"></i>
                Next: {nextPeriod.name}
              </span>
              <small className="text-muted">
                {nextPeriod.startTime} - {nextPeriod.endTime}
              </small>
            </div>
            <div className="countdown-display">
              <div className="time-display bg-light p-3 rounded">
                <div className="countdown-time text-primary fw-bold fs-4">
                  {formatTime(timeLeft)}
                </div>
                <small className="text-muted">until next class</small>
              </div>
            </div>
          </div>
        ) : !currentPeriod && !nextPeriod ? (
          <div className="after-school mt-3">
            <Badge bg="secondary" className="mb-2">
              <i className="fas fa-home me-1"></i>
              School Day Complete
            </Badge>
            <p className="text-muted small mb-0">
              Great job today! Time to relax or study at your own pace.
            </p>
          </div>
        ) : null}
      </Card.Body>

      <style jsx>{`
        .class-countdown-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 15px;
        }
        
        .class-countdown-card .card-body {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 15px;
          color: #333;
        }
        
        .countdown-time {
          font-family: 'Courier New', monospace;
          letter-spacing: 2px;
        }
        
        .time-display {
          border: 2px dashed #007bff;
        }
      `}</style>
    </Card>
  );
}
