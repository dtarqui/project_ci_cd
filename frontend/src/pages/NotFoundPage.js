import React from 'react';
import { useNavigate } from 'react-router-dom';
import './pages.css';

/**
 * NotFoundPage Component
 * 404 Not Found page
 */
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', color: '#ef4444', margin: '1rem 0' }}>404</h1>
      <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Page Not Found</p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: '600',
          transition: 'background-color 0.2s ease',
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#764ba2'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#667eea'}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default NotFoundPage;
