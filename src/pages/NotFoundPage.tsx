import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="relative mb-8">
          <h1 
            className="text-9xl font-bold font-black"
            style={{ 
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: 0.2,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: -1
            }}
          >
            404
          </h1>
          <img 
            src="https://illustrations.popsy.co/amber/page-not-found.svg" 
            alt="Not Found Illustration" 
            className="w-64 h-64 mx-auto object-contain"
            style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' }}
          />
        </div>
        
        <h2 className="text-3xl font-bold mb-4">Page not found</h2>
        <p className="text-muted mb-8 text-lg">
          We can't seem to find the page you're looking for. It might have been removed or doesn't exist.
        </p>
        
        <div className="flex gap-4 justify-center">
          <button 
            className="btn btn-outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="mr-2" /> Go Back
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            <Home size={18} className="mr-2" /> Back to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};
