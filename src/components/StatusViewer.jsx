import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes, FaEye, FaTrash } from 'react-icons/fa';
import { db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const StatusViewer = ({ status, onClose }) => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!status || !currentUser) return;

    // Mark as viewed if not my own status
    if (status.uid !== currentUser.uid) {
      const markViewed = async () => {
        try {
          const statusRef = doc(db, "status", status.id);
          // Check if already viewed to avoid unnecessary writes is handled by arrayUnion logic mostly, 
          // but good to be mindful. Firestore arrayUnion adds only if unique.
          await updateDoc(statusRef, {
            views: arrayUnion(currentUser.uid)
          });
        } catch (error) {
          console.error("Error marking status as viewed:", error);
        }
      };
      markViewed();
    }
  }, [status, currentUser]);

  if (!status) return null;

  const isOwner = currentUser?.uid === status.uid;
  const viewCount = status.views ? status.views.length : 0;

  const handleDelete = async () => {
    if (window.confirm("Delete this status?")) {
      try {
        await deleteDoc(doc(db, "status", status.id));
        onClose();
      } catch (error) {
        console.error("Error deleting status:", error);
      }
    }
  };

  const [scale, setScale] = React.useState(1);

  const handleWheel = (e) => {
    e.stopPropagation();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 4); // Min 1x, Max 4x
    setScale(newScale);
  };

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'black', zIndex: 9999,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      overflow: 'hidden'
    }} onWheel={handleWheel}>
      {/* Progress Bar (Visual only for now) */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', zIndex: 10 }}>
        <div style={{ width: '100%', height: '100%', background: 'white', borderRadius: '2px' }}></div>
      </div>

      {/* Header */}
      <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src={status.photoURL || 'https://via.placeholder.com/40'} 
            alt={status.displayName} 
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }} 
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{status.displayName}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              {status.createdAt?.toDate ? status.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
           {isOwner && (
            <button onClick={handleDelete} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <FaTrash size={20} />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <FaTimes size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        width: '100%', height: '100%', 
        display: 'flex', justifyContent: 'center', alignItems: 'center', 
        padding: '0',
        transform: `scale(${scale})`,
        transition: 'transform 0.1s ease-out'
      }}>
        {status.image ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', height: '100%', justifyContent: 'center' }}>
             <img src={status.image} alt="Status" style={{ maxHeight: '90vh', maxWidth: '100%', objectFit: 'contain' }} />
             {status.text && <div style={{ color: 'white', fontSize: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.6)', padding: '15px 30px', borderRadius: '30px', position: 'absolute', bottom: '100px', transform: `scale(${1/scale})` }}>{status.text}</div>}
          </div>
        ) : (
          <div style={{ color: 'white', fontSize: '3rem', textAlign: 'center', padding: '40px', background: status.background || '#7b2cbf', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
            {status.text}
          </div>
        )}
      </div>

      {/* Footer / Views */}
      {isOwner && (
        <div style={{ position: 'absolute', bottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
          <FaEye size={24} />
          <span style={{ marginTop: '5px', fontWeight: 'bold' }}>{viewCount} views</span>
        </div>
      )}
    </div>,
    document.body
  );
};

export default StatusViewer;
