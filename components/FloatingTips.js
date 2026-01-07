import { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useSettings } from '../contexts/SettingsContext';

export default function FloatingTips() {
  const { tips, removeTip } = useSettings();

  return (
    <ToastContainer 
      position="top-end" 
      className="p-3"
      style={{ zIndex: 1050 }}
    >
      {tips.map((tip) => (
        <Toast
          key={tip.id}
          onClose={() => removeTip(tip.id)}
          show={true}
          delay={5000}
          autohide
          bg={
            tip.type === 'success' ? 'success' :
            tip.type === 'warning' ? 'warning' :
            tip.type === 'error' ? 'danger' : 'info'
          }
        >
          <Toast.Header>
            <i className={`fas fa-${
              tip.type === 'success' ? 'check-circle' :
              tip.type === 'warning' ? 'exclamation-triangle' :
              tip.type === 'error' ? 'times-circle' : 'info-circle'
            } me-2`}></i>
            <strong className="me-auto">StudyBuddy Tip</strong>
            <small>{new Date(tip.timestamp).toLocaleTimeString()}</small>
          </Toast.Header>
          <Toast.Body className={tip.type === 'info' ? 'text-dark' : 'text-white'}>
            {tip.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
