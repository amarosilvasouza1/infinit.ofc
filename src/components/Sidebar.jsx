import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaUserEdit, FaCircle, FaSearch, FaUserPlus, FaCheck, FaTimes, FaCommentDots, FaCircleNotch, FaPlus, FaImage } from 'react-icons/fa';
import ProfileModal from './ProfileModal';
import UserProfileModal from './UserProfileModal';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, arrayUnion, arrayRemove, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageUtils';
import StatusViewer from './StatusViewer';

const Sidebar = ({ onSelectUser }) => {
  const { currentUser, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // chats, search, requests, status
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  
  // Status State
  const [statuses, setStatuses] = useState([]);
  const [showStatusInput, setShowStatusInput] = useState(false);
  const [newStatusText, setNewStatusText] = useState('');
  const [newStatusImage, setNewStatusImage] = useState(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  // Keep selected user updated with real-time data
  useEffect(() => {
    if (selectedProfileUser) {
      const updatedUser = users.find(u => u.uid === selectedProfileUser.uid);
      if (updatedUser) {
        setSelectedProfileUser(updatedUser);
      }
    }
  }, [users]);

  // Fetch Users (Friends Only logic for Chats tab)
  useEffect(() => {
    if (!currentUser) return;

    const usersRef = collection(db, "users");
    const q = query(usersRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let usersList = [];
      snapshot.forEach((doc) => {
        if (doc.data().uid !== currentUser.uid) {
          usersList.push(doc.data());
        }
      });
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Friend Requests
  useEffect(() => {
    if (!currentUser) return;
    const requestsRef = collection(db, "friendRequests");
    const q = query(requestsRef, where("to", "==", currentUser.uid), where("status", "==", "pending"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let reqs = [];
      snapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() });
      });
      setFriendRequests(reqs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Statuses (Last 24h & Friends Only)
  useEffect(() => {
    if (activeTab === 'status' && currentUser) {
      const statusRef = collection(db, "status");
      // Query statuses (fetch all recent, filter client-side to avoid index issues)
      const q = query(statusRef, orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let statusList = [];
        const friends = currentUser.friends || [];
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          
          // Filter: 
          // 1. Must be within last 24 hours
          // 2. Must be my status OR my friends' status
          if (createdAt > oneDayAgo && (data.uid === currentUser.uid || friends.includes(data.uid))) {
            statusList.push({ id: doc.id, ...data });
          }
        });
        setStatuses(statusList);
      }, (error) => {
        console.error("Error fetching statuses:", error);
      });
      return () => unsubscribe();
    }
  }, [activeTab, currentUser]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    // Simple client-side search for this demo
    const results = users.filter(u => 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  };

  const sendFriendRequest = async (toUser) => {
    try {
      await addDoc(collection(db, "friendRequests"), {
        from: currentUser.uid,
        fromName: currentUser.displayName,
        fromPhoto: currentUser.photoURL,
        to: toUser.uid,
        status: "pending",
        createdAt: new Date()
      });
      alert("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send request");
    }
  };

  const acceptRequest = async (requestId, fromUid) => {
    try {
      // Add to my friends
      const myRef = doc(db, "users", currentUser.uid);
      await updateDoc(myRef, {
        friends: arrayUnion(fromUid)
      });

      // Add me to their friends
      const theirRef = doc(db, "users", fromUid);
      await updateDoc(theirRef, {
        friends: arrayUnion(currentUser.uid)
      });

      // Delete request
      await updateDoc(doc(db, "friendRequests", requestId), { status: "accepted" });
      
      alert("Friend added!");
    } catch (error) {
      console.error("Error accepting friend:", error);
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await updateDoc(doc(db, "friendRequests", requestId), { status: "rejected" });
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };




// ... imports

  const handlePostStatus = async (e) => {
    e.preventDefault();
    if (!newStatusText && !newStatusImage) return;

    try {
      let imageUrl = '';
      if (newStatusImage) {
        imageUrl = await compressImage(newStatusImage);
      }

      await addDoc(collection(db, "status"), {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        text: newStatusText,
        image: imageUrl,
        createdAt: new Date()
      });

      setNewStatusText('');
      setNewStatusImage(null);
      setShowStatusInput(false);
    } catch (error) {
      console.error("Error posting status:", error);
      alert("Failed to post status");
    }
  };

  // Filter friends for Chat tab
  const friendsList = users.filter(u => currentUser.friends?.includes(u.uid));

  const [selectedStatus, setSelectedStatus] = useState(null);

  // Group statuses by user (WhatsApp style: one entry per user)
  const getUniqueUserStatuses = () => {
    const userMap = new Map();
    statuses.forEach(status => {
      if (!userMap.has(status.uid)) {
        userMap.set(status.uid, status);
      }
    });
    return Array.from(userMap.values());
  };

  const uniqueStatuses = getUniqueUserStatuses();

  return (
    <div className="glass" style={{ width: '350px', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setIsProfileOpen(true)}>
          <img 
            src={currentUser?.photoURL || 'https://via.placeholder.com/50'} 
            alt="Profile" 
            style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }} 
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{currentUser?.displayName}</h3>
            <span style={{ fontSize: '0.8rem', color: '#2cb67d' }}>Online</span>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <FaSignOutAlt size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '10px', gap: '5px' }}>
        <button 
          onClick={() => setActiveTab('chats')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'chats' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Chats
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'search' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Search
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'requests' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', position: 'relative', fontSize: '0.9rem' }}
        >
          Reqs
          {friendRequests.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'red', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{friendRequests.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('status')}
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: activeTab === 'status' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Status
        </button>
      </div>

      {/* Content */}
      <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        
        {activeTab === 'chats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {friendsList.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>No friends yet. Go to Search to find people!</p>
            ) : (
              friendsList.map(user => (
                <div 
                  key={user.uid} 
                  style={{ padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ position: 'relative' }} onClick={() => setSelectedProfileUser(user)}>
                    <img src={user.photoURL || 'https://via.placeholder.com/40'} alt={user.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} />
                    <FaCircle size={10} color={user.isOnline ? "#2cb67d" : "#666"} style={{ position: 'absolute', bottom: 0, right: 0, border: '2px solid #16161a', borderRadius: '50%' }} />
                  </div>
                  <div onClick={() => onSelectUser(user)} style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>{user.displayName}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to chat</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Search username..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
              <button onClick={handleSearch} style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--secondary-color)', color: 'white', cursor: 'pointer' }}><FaSearch /></button>
            </div>
            
            {searchResults.map(user => (
              <div key={user.uid} style={{ padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={user.photoURL || 'https://via.placeholder.com/40'} alt={user.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <span>{user.displayName}</span>
                </div>
                {currentUser.friends?.includes(user.uid) ? (
                  <span style={{ fontSize: '0.8rem', color: '#2cb67d' }}>Friend</span>
                ) : (
                  <button onClick={() => sendFriendRequest(user)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }} title="Add Friend">
                    <FaUserPlus />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {friendRequests.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>No pending requests.</p>
            ) : (
              friendRequests.map(req => (
                <div key={req.id} style={{ padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={req.fromPhoto || 'https://via.placeholder.com/40'} alt={req.fromName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span>{req.fromName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => acceptRequest(req.id, req.from)} style={{ background: '#2cb67d', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><FaCheck /></button>
                    <button onClick={() => rejectRequest(req.id)} style={{ background: '#ef476f', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><FaTimes /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <>
             <div 
                onClick={() => setShowStatusInput(!showStatusInput)}
                style={{ 
                  padding: '15px', 
                  borderRadius: '16px', 
                  background: 'rgba(255,255,255,0.03)', 
                  marginBottom: '20px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  border: '1px dashed var(--glass-border)'
                }}
              >
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <FaPlus />
                </div>
                <div style={{ fontWeight: 'bold' }}>Add New Status</div>
              </div>

              {showStatusInput && (
                <form onSubmit={handlePostStatus} style={{ marginBottom: '25px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                  {/* ... form inputs ... */}
                  <input 
                    type="text" 
                    placeholder="What's happening?" 
                    value={newStatusText}
                    onChange={(e) => setNewStatusText(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', marginBottom: '15px', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                      <FaImage /> <span style={{ fontSize: '0.9rem' }}>Photo</span>
                      <input type="file" hidden accept="image/*" onChange={(e) => setNewStatusImage(e.target.files[0])} />
                    </label>
                    <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 'bold' }}>Post</button>
                  </div>
                  {newStatusImage && <div style={{ fontSize: '0.8rem', marginTop: '10px', color: 'var(--secondary-color)' }}>Image selected</div>}
                </form>
              )}

              <h4 style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Updates</h4>
              
              {uniqueStatuses.map(status => (
                <div 
                  key={status.id} 
                  onClick={() => setSelectedStatus(status)}
                  style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    borderRadius: '12px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ position: 'relative', padding: '2px', border: '2px solid #2cb67d', borderRadius: '50%' }}>
                    <img 
                      src={status.photoURL || 'https://via.placeholder.com/50'} 
                      alt={status.displayName} 
                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} 
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{status.displayName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {status.createdAt?.toDate ? status.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <UserProfileModal user={selectedProfileUser} isOpen={!!selectedProfileUser} onClose={() => setSelectedProfileUser(null)} />
      {selectedStatus && <StatusViewer status={selectedStatus} onClose={() => setSelectedStatus(null)} />}
    </div>
  );
};

export default Sidebar;
