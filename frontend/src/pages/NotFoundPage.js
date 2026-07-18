import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import './pages.css';

/**
 * NotFoundPage Component
 * 404 Not Found page
 */
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="page not-found-page">
      <h1 className="not-found-code">404</h1>
      <p className="not-found-message">Page Not Found</p>
      <Button onClick={() => navigate('/dashboard')} className="not-found-button">
        Back to Dashboard
      </Button>
    </div>
  );
};

export default NotFoundPage;
