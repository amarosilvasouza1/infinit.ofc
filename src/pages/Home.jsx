import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Peer from 'peerjs';
import ProfileModal from '../components/ProfileModal';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import VideoCall from '../components/VideoCall';
import { FaPhone, FaTimes, FaVideo } from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const Home = () => {
  const { currentUser } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callUser, setCallUser] = useState(null);
  const [callType, setCallType] = useState('video'); // 'video' or 'audio'
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallUser, setIncomingCallUser] = useState(null);
  const [peerInstance, setPeerInstance] = useState(null);
  
  const ringtoneRef = useRef(null);
  const callTimeoutRef = useRef(null);

  // Initialize Peer
  useEffect(() => {
    if (!currentUser) return;

    const peer = new Peer(currentUser.uid, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setPeerInstance(peer);
    });

    // Listen for incoming calls
    // Listen for incoming calls
    peer.on('call', (call) => {
      console.log('Incoming call from:', call.peer);
      setIncomingCall(call);
      // Set initial unknown state to ensure modal shows immediately
      setIncomingCallUser({ uid: call.peer, displayName: 'Unknown Caller' });
      
      // Fetch caller info
      getDoc(doc(db, "users", call.peer))
        .then((userDoc) => {
          if (userDoc.exists()) {
            setIncomingCallUser(userDoc.data());
          }
        })
        .catch((error) => {
          console.error("Error fetching caller info:", error);
        });
      
      // Play ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.loop = true;
        ringtoneRef.current.play().catch(err => console.error('Failed to play ringtone:', err));
      }
      
      // Set timeout: auto-reject after 3 minutes
      callTimeoutRef.current = setTimeout(() => {
        console.log('Call timeout - rejecting');
        call.close();
        setIncomingCall(null);
        setIncomingCallUser(null);
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }
      }, 3 * 60 * 1000); // 3 minutes
    });

    return () => {
      peer.destroy();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
    };
  }, [currentUser]);

  const startCall = (user, type = 'video') => {
    setCallUser(user);
    setCallType(type);
    setIsInCall(true);
  };

  const answerCall = () => {
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    // Clear timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }
    
    setCallUser(incomingCallUser);
    setCallType('video'); // Assume video for now, could be improved
    setIsInCall(true);
    // Don't clear incomingCall yet, let VideoCall handle it
  };

  const rejectCall = () => {
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    // Clear timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }
    
    if (incomingCall) {
      incomingCall.close();
    }
    setIncomingCall(null);
    setIncomingCallUser(null);
  };

  const activeCallRef = useRef(null);

  const endCall = () => {
    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }
    if (incomingCall) {
      incomingCall.close();
    }
    setIsInCall(false);
    setCallUser(null);
    setIncomingCall(null);
    setIncomingCallUser(null);
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container">
      {/* Ringtone audio */}
      <audio ref={ringtoneRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi..." />
      
      <div className="glass main-content">
        {(!isMobile || !selectedUser) && (
          <Sidebar 
            onSelectUser={setSelectedUser} 
            setIsProfileOpen={setIsProfileOpen} 
            isMobile={isMobile}
          />
        )}
        
        {(!isMobile || selectedUser) && (
          <Chat 
            selectedUser={selectedUser} 
            onStartCall={(type) => startCall(selectedUser, type)} 
            onBack={() => setSelectedUser(null)}
            isMobile={isMobile}
          />
        )}
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      {/* Incoming Call Modal */}
      {incomingCall && !isInCall && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 3000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="glass" style={{
            padding: '40px', borderRadius: '20px', textAlign: 'center',
            minWidth: '350px', background: 'rgba(30,30,30,0.95)'
          }}>
            <div style={{ marginBottom: '30px' }}>
              <FaPhone size={50} color="#2cb67d" style={{ marginBottom: '20px' }} />
              <h2 style={{ margin: '10px 0', fontSize: '1.5rem' }}>Incoming Call</h2>
              <p style={{ color: 'var(--text-muted)', margin: '5px 0' }}>{incomingCallUser?.displayName || 'Unknown'}</p>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button 
                onClick={answerCall}
                style={{
                  padding: '15px 30px', borderRadius: '50px', border: 'none',
                  background: '#2cb67d', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem'
                }}
              >
                <FaVideo /> Answer
              </button>
              <button 
                onClick={rejectCall}
                style={{
                  padding: '15px 30px', borderRadius: '50px', border: 'none',
                  background: '#ef476f', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem'
                }}
              >
                <FaTimes /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call */}
      {isInCall && peerInstance && (
        <VideoCall 
          peer={peerInstance}
          callerId={callUser?.uid}
          callerUser={callUser}
          callType={callType}
          incomingCall={incomingCall}
          onEndCall={endCall}
          activeCallRef={activeCallRef}
        />
      )}
    </div>
  );
};

export default Home;
