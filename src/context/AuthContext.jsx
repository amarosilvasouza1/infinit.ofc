import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUsernameUnique = async (username) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", "==", username));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  const signup = async (email, password, username) => {
    const isUnique = await checkUsernameUnique(username);
    if (!isUnique) {
      throw new Error("Username already taken");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with username
    await updateProfile(user, { displayName: username });
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: username,
      email: email,
      photoURL: user.photoURL || "",
      photoURL: user.photoURL || "",
      status: "online",
      isOnline: true,
      createdAt: new Date()
    });
    
    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (currentUser) {
      await updateDoc(doc(db, "users", currentUser.uid), {
        isOnline: false,
        lastSeen: new Date()
      });
    }
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Real-time listener for user document
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            // Merge Auth user with Firestore data
            setCurrentUser({ ...user, ...userData });
          } else {
            setCurrentUser(user);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setCurrentUser(user);
          setCurrentUser(user);
          setLoading(false);
        });

        // Set online status
        updateDoc(userDocRef, {
          isOnline: true
        });

        // Handle window close/refresh
        const handleTabClose = () => {
          updateDoc(userDocRef, {
            isOnline: false,
            lastSeen: new Date()
          });
        };

        window.addEventListener('beforeunload', handleTabClose);

        // Cleanup snapshot listener when auth state changes or component unmounts
        return () => {
          unsubscribeSnapshot();
          window.removeEventListener('beforeunload', handleTabClose);
        };
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const updateUserProfile = async (data) => {
    if (!currentUser) return;

    if (data.displayName && data.displayName !== currentUser.displayName) {
      const isUnique = await checkUsernameUnique(data.displayName);
      if (!isUnique) {
        throw new Error("Username already taken");
      }
    }
    
    // Separate Auth profile updates (limited size) from Firestore updates
    const authUpdates = {};
    if (data.displayName) authUpdates.displayName = data.displayName;
    // Only update Auth photoURL if it's a short URL (not Base64)
    if (data.photoURL && data.photoURL.length < 2000) {
      authUpdates.photoURL = data.photoURL;
    }

    if (Object.keys(authUpdates).length > 0 && auth.currentUser) {
      await updateProfile(auth.currentUser, authUpdates);
    }
    
    // Force update local state to reflect changes immediately
    setCurrentUser(prev => ({ ...prev, ...data }));
    
    return currentUser;
  };

  const value = {
    currentUser,
    signup,
    login,
    logout,
    updateUserProfile,
    checkUsernameUnique
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
