import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { FaCamera, FaTimes } from 'react-icons/fa';
import { compressImage } from '../utils/imageUtils';

const ProfileModal = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photo, setPhoto] = useState(null);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;



// ...

  if (!isOpen) return null;

  // compressImage helper removed (imported from utils)

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("Starting profile update (Base64 mode)...");
    
    try {
      if (!currentUser) throw new Error("No current user found");
      
      let photoURL = currentUser.photoURL;
      let bannerURL = currentUser.bannerURL || ''; 

      // Compress and convert to Base64
      if (photo) {
        console.log("Processing photo...", photo.name);
        photoURL = await compressImage(photo);
        console.log("Photo processed.");
      }

      if (banner) {
        console.log("Processing banner...", banner.name);
        bannerURL = await compressImage(banner);
        console.log("Banner processed.");
      }

      console.log("Updating Firestore User Doc...");
      const userRef = doc(db, "users", currentUser.uid);
      
      // Update Firestore first
      await updateDoc(userRef, {
        displayName,
        photoURL,
        bannerURL
      });

      // Update Local Context
      await updateUserProfile({ displayName, photoURL, bannerURL });

      console.log("Profile updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="glass" style={{ width: '500px', padding: '20px', position: 'relative', background: '#1a1a2e' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem' }}>
          <FaTimes />
        </button>
        
        <h2 style={{ marginBottom: '20px' }}>Edit Profile</h2>
        
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Banner Upload */}
          <div style={{ 
            height: '120px', 
            backgroundImage: banner ? `url(${URL.createObjectURL(banner)})` : (currentUser?.bannerURL ? `url(${currentUser.bannerURL})` : 'none'),
            backgroundColor: banner || currentUser?.bannerURL ? 'transparent' : 'rgba(255,255,255,0.1)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '8px', 
            position: 'relative',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <label style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '50%' }}>
              <FaCamera color="white" />
              <input type="file" hidden onChange={(e) => setBanner(e.target.files[0])} />
            </label>
          </div>

          {/* Photo Upload */}
          <div style={{ marginTop: '-50px', marginLeft: '20px', position: 'relative', width: '80px', height: '80px' }}>
            <img 
              src={photo ? URL.createObjectURL(photo) : (currentUser?.photoURL || 'https://via.placeholder.com/80')} 
              alt="Profile" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', border: '3px solid #1a1a2e', objectFit: 'cover' }} 
            />
            <label style={{ 
              position: 'absolute', bottom: '0', right: '0', 
              background: 'var(--secondary-color)', padding: '5px', borderRadius: '50%', 
              cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '25px', height: '25px' 
            }}>
              <FaCamera color="white" size={12} />
              <input type="file" hidden onChange={(e) => setPhoto(e.target.files[0])} />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Display Name</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              border: 'none', 
              background: 'var(--secondary-color)', 
              color: 'white', 
              fontWeight: 'bold',
              marginTop: '10px'
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
