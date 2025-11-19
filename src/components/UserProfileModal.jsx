import React from 'react';
import { FaTimes } from 'react-icons/fa';

const UserProfileModal = ({ user, isOpen, onClose }) => {
  if (!isOpen || !user) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', zIndex: 3000,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '20px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass" 
        style={{
          width: '100%', maxWidth: '500px',
          borderRadius: '20px', overflow: 'hidden',
          background: 'rgba(30,30,30,0.95)',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '15px', right: '15px',
            background: 'rgba(0,0,0,0.5)', border: 'none',
            color: 'white', borderRadius: '50%', width: '35px', height: '35px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10
          }}
        >
          <FaTimes size={18} />
        </button>

        {/* Banner */}
        <div style={{
          width: '100%', height: '150px',
          background: user.bannerURL 
            ? `url(${user.bannerURL}) center/cover` 
            : 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
          position: 'relative'
        }} />

        {/* Profile Picture */}
        <div style={{
          marginTop: '-60px', display: 'flex', justifyContent: 'center',
          position: 'relative', zIndex: 5
        }}>
          <img 
            src={user.photoURL || 'https://via.placeholder.com/120'} 
            alt={user.displayName}
            style={{
              width: '120px', height: '120px',
              borderRadius: '50%', objectFit: 'cover',
              border: '5px solid #16161a',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}
          />
        </div>

        {/* User Info */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ margin: '10px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
            {user.displayName}
          </h2>
          
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: user.isOnline ? 'rgba(44, 182, 125, 0.2)' : 'rgba(100, 100, 100, 0.2)', 
            padding: '5px 15px',
            borderRadius: '20px', marginBottom: '20px'
          }}>
            <div style={{
              width: '8px', height: '8px',
              background: user.isOnline ? '#2cb67d' : '#666', 
              borderRadius: '50%'
            }} />
            <span style={{ color: user.isOnline ? '#2cb67d' : '#999', fontSize: '0.9rem' }}>
              {user.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Additional Info */}
          <div style={{
            marginTop: '25px', padding: '20px',
            background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                About
              </div>
              <div style={{ color: 'white', fontSize: '1rem' }}>
                {user.bio || 'No bio yet'}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                Member Since
              </div>
              <div style={{ color: 'white', fontSize: '1rem' }}>
                {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
