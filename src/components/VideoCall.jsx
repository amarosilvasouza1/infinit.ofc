import React, { useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaDesktop } from 'react-icons/fa';

const VideoCall = ({ peer, callerId, callerUser, callType = 'video', incomingCall, onEndCall, activeCallRef }) => {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const myVideoRef = useRef();
  const remoteVideoRef = useRef();
  // We use activeCallRef passed from parent if available, otherwise local ref (fallback)
  const localCallRef = useRef(null);
  const callRef = activeCallRef || localCallRef;

  useEffect(() => {
    if (!peer) return;

    const mediaConstraints = {
      audio: true,
      video: callType === 'video'
    };

    navigator.mediaDevices.getUserMedia(mediaConstraints).then((mediaStream) => {
      setStream(mediaStream);
      if (myVideoRef.current && callType === 'video') {
        myVideoRef.current.srcObject = mediaStream;
      }

      // If call already exists (e.g. from remount), just attach stream listeners if needed
      // But PeerJS doesn't easily let us re-attach to existing call stream events if we missed them.
      // However, since we don't close the call, the remote peer is still sending.
      // We might need to check if we already have a call.

      if (callRef.current) {
        console.log("Call already active, reusing...");
        // If we have a call, we should probably check its state or re-assign stream?
        // For now, let's assume if it's open, we don't need to do anything except maybe update local stream?
        // But if we remounted, we have a NEW local stream. We need to replace it.
        const sender = callRef.current.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && mediaStream.getVideoTracks()[0]) {
            sender.replaceTrack(mediaStream.getVideoTracks()[0]);
        }
        const audioSender = callRef.current.peerConnection.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (audioSender && mediaStream.getAudioTracks()[0]) {
            audioSender.replaceTrack(mediaStream.getAudioTracks()[0]);
        }
        return; 
      }

      // If this is an incoming call, answer it
      if (incomingCall) {
        console.log('Answering incoming call');
        // Only answer if not already open
        if (!incomingCall.open) {
            incomingCall.answer(mediaStream);
        }
        
        incomingCall.on('stream', (remoteMediaStream) => {
          setRemoteStream(remoteMediaStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteMediaStream;
          }
        });
        incomingCall.on('close', () => {
          console.log('Call closed by remote peer');
          onEndCall();
        });
        callRef.current = incomingCall;
      }
      else if (callerId) {
        console.log('Calling peer:', callerId);
        const call = peer.call(callerId, mediaStream);
        call.on('stream', (remoteMediaStream) => {
          setRemoteStream(remoteMediaStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteMediaStream;
          }
        });
        call.on('close', () => {
          console.log('Call closed by remote peer');
          onEndCall();
        });
        callRef.current = call;
      }
    }).catch((err) => {
      console.error('Failed to get media', err);
      alert('Could not access camera/microphone. Please check permissions.');
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // IMPORTANT: Do NOT close the call here. 
      // React Strict Mode will unmount/remount this component immediately.
      // If we close the call, the connection is lost.
      // The call cleanup is now handled by Home.jsx via onEndCall/activeCallRef.
    };
  }, [peer, callerId, callType, incomingCall, onEndCall]);

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (stream && callType === 'video') {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (myVideoRef.current) myVideoRef.current.srcObject = mediaStream;
      
      const videoTrack = mediaStream.getVideoTracks()[0];
      const sender = callInstance.current.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
      
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setStream(screenStream);
        if (myVideoRef.current) myVideoRef.current.srcObject = screenStream;

        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = callInstance.current.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        videoTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Failed to share screen", err);
      }
    }
  };

  // specific useEffect to attach streams to refs whenever they change
  useEffect(() => {
    if (myVideoRef.current && stream) {
      myVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const hasVideo = remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0].enabled;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16161a 100%)', zIndex: 2000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Remote Video (Full Screen) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {/* Always render video for audio to work */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline
          style={{ 
            width: '100%', height: '100%', objectFit: 'cover',
            display: hasVideo ? 'block' : 'none' 
          }} 
        />
        
        {!hasVideo && (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#1a1a2e' }}>
            <div style={{ 
              width: '150px', height: '150px', borderRadius: '50%',
              background: callerUser?.photoURL ? `url(${callerUser.photoURL}) center/cover` : 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
              marginBottom: '20px',
              boxShadow: '0 0 50px rgba(44,182,125,0.2)'
            }} />
            <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '10px' }}>{callerUser?.displayName || 'Unknown'}</h2>
            <div style={{ color: '#2cb67d', fontSize: '1.2rem' }}>{remoteStream ? 'Connected' : 'Connecting...'}</div>
          </div>
        )}
      </div>

      {/* User Info Overlay */}
      <div style={{
        position: 'absolute', top: '40px', left: '40px',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        padding: '10px 20px', borderRadius: '50px',
        display: 'flex', alignItems: 'center', gap: '15px',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 15
      }}>
        <img 
          src={callerUser?.photoURL || 'https://via.placeholder.com/50'} 
          alt={callerUser?.displayName}
          style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2cb67d' }}
        />
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>{callerUser?.displayName || 'Unknown'}</div>
          <div style={{ color: '#2cb67d', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2cb67d' }}></div>
            {remoteStream ? 'Connected' : 'Calling...'}
          </div>
        </div>
      </div>

      {/* My Video (Floating PIP) */}
      {(callType === 'video' || isScreenSharing) && (
        <div style={{ 
          position: 'absolute', bottom: '100px', right: '30px', 
          width: '200px', height: '150px', 
          background: '#000', borderRadius: '12px', 
          overflow: 'hidden', zIndex: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          border: '2px solid rgba(255,255,255,0.1)'
        }}>
          <video ref={myVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ 
        position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '20px', padding: '15px 30px', 
        background: 'rgba(0,0,0,0.6)', borderRadius: '50px', 
        backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 20
      }}>
        <button 
          onClick={toggleMute} 
          style={{ 
            padding: '18px', borderRadius: '50%', border: 'none', 
            background: isMuted ? 'linear-gradient(135deg, #ef476f, #d13554)' : 'rgba(255,255,255,0.15)', 
            color: 'white', cursor: 'pointer',
            boxShadow: isMuted ? '0 5px 20px rgba(239,71,111,0.4)' : 'none',
            transition: 'all 0.3s ease',
            width: '60px', height: '60px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isMuted ? <FaMicrophoneSlash size={22} /> : <FaMicrophone size={22} />}
        </button>
        {callType === 'video' && (
          <button 
            onClick={toggleVideo} 
            style={{ 
              padding: '18px', borderRadius: '50%', border: 'none', 
              background: isVideoOff ? 'linear-gradient(135deg, #ef476f, #d13554)' : 'rgba(255,255,255,0.15)', 
              color: 'white', cursor: 'pointer',
              boxShadow: isVideoOff ? '0 5px 20px rgba(239,71,111,0.4)' : 'none',
              transition: 'all 0.3s ease',
              width: '60px', height: '60px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {isVideoOff ? <FaVideoSlash size={22} /> : <FaVideo size={22} />}
          </button>
        )}
        <button 
          onClick={toggleScreenShare} 
          style={{ 
            padding: '18px', borderRadius: '50%', border: 'none', 
            background: isScreenSharing ? 'linear-gradient(135deg, var(--secondary-color), #e06c9f)' : 'rgba(255,255,255,0.15)', 
            color: 'white', cursor: 'pointer',
            boxShadow: isScreenSharing ? '0 5px 20px rgba(255,128,191,0.4)' : 'none',
            transition: 'all 0.3s ease',
            width: '60px', height: '60px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }} 
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <FaDesktop size={22} />
        </button>
        <button 
          onClick={onEndCall} 
          style={{ 
            padding: '18px', borderRadius: '50%', border: 'none', 
            background: 'linear-gradient(135deg, #ef476f, #d13554)', 
            color: 'white', cursor: 'pointer',
            boxShadow: '0 5px 20px rgba(239,71,111,0.6)',
            transition: 'all 0.3s ease',
            width: '60px', height: '60px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <FaPhoneSlash size={22} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
