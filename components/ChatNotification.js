import { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useRouter } from 'next/router';

export default function ChatNotification({ notification, onClose }) {
  const router = useRouter();
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(true);
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const handleClick = () => {
    if (notification?.roomId) {
      router.push(`/chat?room=${notification.roomId}`);
      handleClose();
    }
  };

  if (!notification) return null;

  return (
    <ToastContainer 
      position="bottom-end" 
      className="p-3 chat-notification-container"
      style={{ zIndex: 9999 }}
    >
      <Toast 
        show={show} 
        onClose={handleClose}
        className="chat-notification-toast"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <Toast.Header className="bg-primary text-white">
          <div className="d-flex align-items-center">
            <i className="fas fa-comment-dots me-2"></i>
            <strong className="me-auto">{notification.roomName || 'New Message'}</strong>
            <small className="text-white-50">just now</small>
          </div>
        </Toast.Header>
        <Toast.Body className="d-flex align-items-center" style={{ padding: '1rem' }}>
          {notification.userPhoto && (
            <img
              src={notification.userPhoto}
              alt={notification.userName}
              className="rounded-circle me-3"
              style={{ width: '40px', height: '40px' }}
            />
          )}
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-bold text-primary mb-1" style={{ fontSize: '0.9rem' }}>
              {notification.userName}
            </div>
            <div className="text-truncate" style={{ maxWidth: '300px', fontSize: '0.95rem', lineHeight: '1.4' }}>
              {notification.message}
            </div>
          </div>
        </Toast.Body>
      </Toast>

      <style jsx global>{`
        .chat-notification-container {
          position: fixed;
          bottom: 100px;
          right: 20px;
          z-index: 9999;
        }

        @media (max-width: 768px) {
          .chat-notification-container {
            bottom: 90px;
            right: 10px;
            left: 10px;
          }

          .chat-notification-toast {
            width: 100% !important;
            max-width: none !important;
          }
        }

        .chat-notification-toast {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-left: 4px solid #007bff;
          transition: transform 0.3s ease-in-out;
        }

        .chat-notification-toast:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .chat-notification-toast .toast-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </ToastContainer>
  );
}
