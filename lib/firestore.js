import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';

// User operations
export const createUser = async (userId, userData) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUser = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...userData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Chat operations
export const sendChatMessage = async (senderId, receiverId, message) => {
  try {
    const chatData = {
      senderId,
      receiverId,
      message,
      timestamp: new Date(),
      isStudyBuddy: false
    };
    
    await addDoc(collection(db, 'chats'), chatData);
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

export const getChatMessages = (senderId, receiverId, callback) => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('senderId', 'in', [senderId, receiverId]),
      where('receiverId', 'in', [senderId, receiverId]),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, callback);
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
};

export const getAllContacts = async (userId) => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('senderId', '==', userId)
    );
    
    const q2 = query(
      collection(db, 'chats'),
      where('receiverId', '==', userId)
    );
    
    const [senderDocs, receiverDocs] = await Promise.all([
      getDocs(q),
      getDocs(q2)
    ]);
    
    const contacts = new Set();
    
    senderDocs.forEach((doc) => {
      const data = doc.data();
      contacts.add(data.receiverId);
    });
    
    receiverDocs.forEach((doc) => {
      const data = doc.data();
      contacts.add(data.senderId);
    });
    
    return Array.from(contacts);
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
};

// Study buddy operations
export const setStudyBuddy = async (user1, user2) => {
  try {
    const studyBuddyData = {
      user1,
      user2,
      createdAt: new Date(),
      active: true
    };
    
    await addDoc(collection(db, 'studyBuddies'), studyBuddyData);
    
    // Also mark their chat as study buddy chat
    const chatQuery = query(
      collection(db, 'chats'),
      where('senderId', 'in', [user1, user2]),
      where('receiverId', 'in', [user1, user2])
    );
    
    const chatDocs = await getDocs(chatQuery);
    const updatePromises = chatDocs.docs.map(doc => 
      updateDoc(doc.ref, { isStudyBuddy: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error setting study buddy:', error);
    throw error;
  }
};

export const getStudyBuddies = async (userId) => {
  try {
    const q1 = query(
      collection(db, 'studyBuddies'),
      where('user1', '==', userId),
      where('active', '==', true)
    );
    
    const q2 = query(
      collection(db, 'studyBuddies'),
      where('user2', '==', userId),
      where('active', '==', true)
    );
    
    const [docs1, docs2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const buddies = [];
    
    docs1.forEach((doc) => {
      const data = doc.data();
      buddies.push(data.user2);
    });
    
    docs2.forEach((doc) => {
      const data = doc.data();
      buddies.push(data.user1);
    });
    
    return buddies;
  } catch (error) {
    console.error('Error getting study buddies:', error);
    throw error;
  }
};

// Course operations
export const saveCourseData = async (userId, courseData) => {
  try {
    await setDoc(doc(db, 'userCourses', userId), {
      courses: courseData,
      lastUpdated: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving course data:', error);
    throw error;
  }
};

export const getCourseData = async (userId) => {
  try {
    const courseDoc = await getDoc(doc(db, 'userCourses', userId));
    return courseDoc.exists() ? courseDoc.data() : null;
  } catch (error) {
    console.error('Error getting course data:', error);
    throw error;
  }
};

// Contact form
export const submitContactMessage = async (messageData) => {
  try {
    await addDoc(collection(db, 'contactMessages'), {
      ...messageData,
      timestamp: new Date(),
      status: 'new'
    });
  } catch (error) {
    console.error('Error submitting contact message:', error);
    throw error;
  }
};
