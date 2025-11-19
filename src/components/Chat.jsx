import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { FaVideo, FaPhone, FaSmile, FaPaperPlane, FaCommentDots } from 'react-icons/fa';

const Chat = ({ selectedUser, onStartCall }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;

    const id = currentUser.uid > selectedUser.uid 
      ? `${currentUser.uid + selectedUser.uid}` 
      : `${selectedUser.uid + currentUser.uid}`;

    const messagesRef = collection(db, "messages", id, "chat");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedUser, currentUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const id = currentUser.uid > selectedUser.uid 
      ? `${currentUser.uid + selectedUser.uid}` 
      : `${selectedUser.uid + currentUser.uid}`;

    await addDoc(collection(db, "messages", id, "chat"), {
      text: newMessage,
      senderId: currentUser.uid,
      to: selectedUser.uid,
      createdAt: new Date()
    });

    setNewMessage('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
      {selectedUser ? (
        <>
          <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ position: 'relative' }}>
                <img 
                  src={selectedUser.photoURL || 'https://via.placeholder.com/50'} 
                  alt={selectedUser.displayName} 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }} 
                />
                <div style={{ position: 'absolute', bottom: 2, right: 2, width: '12px', height: '12px', background: '#2cb67d', borderRadius: '50%', border: '2px solid #16161a' }}></div>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedUser.displayName}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active now</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
               <button 
                onClick={() => onStartCall('video')}
                style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  border: 'none', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '45px', height: '45px',
                  cursor: 'pointer'
                }}
                title="Start Video Call"
              >
                <FaVideo size={18} />
              </button>
              <button 
                onClick={() => onStartCall('audio')}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Start Voice Call"
              >
                <FaPhone size={18} />
              </button>
            </div>
          </div>

          <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.uid;
              return (
                <div 
                  key={msg.id} 
                  style={{ 
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ 
                    padding: '15px 20px', 
                    borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
                    background: isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', 
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    fontSize: '1rem',
                    lineHeight: '1.5'
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '5px', padding: '0 5px' }}>
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '25px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>
              <FaSmile />
            </button>
            <input 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..." 
              style={{ 
                flex: 1, 
                padding: '15px 20px', 
                borderRadius: '30px', 
                border: '1px solid var(--glass-border)', 
                background: 'rgba(255,255,255,0.05)', 
                color: 'white',
                fontSize: '1rem'
              }}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              style={{ 
                background: newMessage.trim() ? 'var(--secondary-color)' : 'rgba(255,255,255,0.1)', 
                border: 'none', 
                color: 'white', 
                padding: '15px', 
                borderRadius: '50%',
                cursor: newMessage.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '50px', height: '50px',
                transition: 'all 0.3s ease'
              }}
            >
              <FaPaperPlane size={18} style={{ marginLeft: '-2px' }} />
            </button>
          </form>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', opacity: 0.7 }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            <FaCommentDots size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'normal' }}>Select a chat to start messaging</h2>
        </div>
      )}
    </div>
  );
};

export default Chat;
