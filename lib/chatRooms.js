import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

class ChatRoomService {
  constructor() {
    this.roomsCollection = 'chatRooms';
    this.messagesCollection = 'messages';
    this.usersCollection = 'users';
  }

  // Create a new chat room
  async createRoom(roomData, creatorId) {
    try {
      // Generate a unique 6-character join code
      const joinCode = this.generateJoinCode();
      
      const room = {
        name: roomData.name,
        description: roomData.description || '',
        subject: roomData.subject || 'General',
        isPrivate: roomData.isPrivate || false,
        joinCode: joinCode,
        allowedEmails: roomData.allowedEmails || [], // Array of allowed email addresses
        maxMembers: roomData.maxMembers || 50,
        createdBy: creatorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [creatorId],
        memberDetails: {
          [creatorId]: {
            role: 'owner',
            joinedAt: serverTimestamp(),
            isActive: true
          }
        },
        moderators: [creatorId],
        bannedUsers: [],
        messageCount: 0,
        lastMessage: null,
        lastActivity: serverTimestamp(),
        rules: roomData.rules || [
          'Be respectful to all members',
          'Stay on topic',
          'No spam or excessive posting',
          'No harassment or bullying',
          'Keep content appropriate for educational use'
        ],
        settings: {
          allowFileUploads: roomData.allowFileUploads || false,
          moderationLevel: roomData.moderationLevel || 'medium', // low, medium, high
          autoDeleteInactive: roomData.autoDeleteInactive || false,
          requireApproval: roomData.requireApproval || false,
          requireJoinCode: roomData.requireJoinCode || false,
          emailRestricted: roomData.emailRestricted || false
        }
      };

      const docRef = await addDoc(collection(db, this.roomsCollection), room);
      return { id: docRef.id, ...room };
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  // Generate a unique 6-character join code
  generateJoinCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  // Join a room with join code
  async joinRoomWithCode(joinCode, userId, userEmail) {
    try {
      const q = query(
        collection(db, this.roomsCollection),
        where('joinCode', '==', joinCode.toUpperCase())
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('Invalid join code');
      }

      const roomDoc = snapshot.docs[0];
      const roomId = roomDoc.id;
      const room = roomDoc.data();
      
      // Check if email is restricted and verify email
      if (room.settings?.emailRestricted && room.allowedEmails) {
        const emailAllowed = room.allowedEmails.some(email => 
          email.toLowerCase() === userEmail.toLowerCase()
        );
        
        if (!emailAllowed) {
          throw new Error('Your email is not authorized to join this room');
        }
      }
      
      return await this.joinRoom(roomId, userId, userEmail);
    } catch (error) {
      console.error('Error joining room with code:', error);
      throw error;
    }
  }

  // Update allowed emails (owner only)
  async updateAllowedEmails(roomId, emails, ownerId) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      if (room.createdBy !== ownerId) {
        throw new Error('Only the room owner can update allowed emails');
      }

      await updateDoc(roomRef, {
        allowedEmails: emails,
        'settings.emailRestricted': emails.length > 0,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating allowed emails:', error);
      throw error;
    }
  }

  // Regenerate join code (owner only)
  async regenerateJoinCode(roomId, ownerId) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      if (room.createdBy !== ownerId) {
        throw new Error('Only the room owner can regenerate the join code');
      }

      const newJoinCode = this.generateJoinCode();

      await updateDoc(roomRef, {
        joinCode: newJoinCode,
        updatedAt: serverTimestamp()
      });

      return newJoinCode;
    } catch (error) {
      console.error('Error regenerating join code:', error);
      throw error;
    }
  }

  // Get all available rooms for a user
  async getUserRooms(userId) {
    try {
      const q = query(
        collection(db, this.roomsCollection),
        where('members', 'array-contains', userId),
        orderBy('lastActivity', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user rooms:', error);
      throw error;
    }
  }

  // Get public rooms that user can join
  async getPublicRooms(userId) {
    try {
      const q = query(
        collection(db, this.roomsCollection),
        where('isPrivate', '==', false),
        orderBy('messageCount', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(room => !room.members.includes(userId) && !room.bannedUsers.includes(userId));
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      throw error;
    }
  }

  // Join a room
  async joinRoom(roomId, userId, userEmail = null) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      if (room.bannedUsers.includes(userId)) {
        throw new Error('You are banned from this room');
      }

      if (room.members.length >= room.maxMembers) {
        throw new Error('Room is full');
      }

      if (room.members.includes(userId)) {
        throw new Error('You are already a member of this room');
      }

      // Check email restriction if enabled
      if (room.settings?.emailRestricted && room.allowedEmails && userEmail) {
        const emailAllowed = room.allowedEmails.some(email => 
          email.toLowerCase() === userEmail.toLowerCase()
        );
        
        if (!emailAllowed) {
          throw new Error('Your email is not authorized to join this room');
        }
      }

      const memberDetails = room.memberDetails || {};
      memberDetails[userId] = {
        role: 'member',
        joinedAt: serverTimestamp(),
        isActive: true
      };

      await updateDoc(roomRef, {
        members: arrayUnion(userId),
        memberDetails: memberDetails,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // Leave a room
  async leaveRoom(roomId, userId) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      await updateDoc(roomRef, {
        members: arrayRemove(userId),
        moderators: arrayRemove(userId), // Remove from moderators if they were one
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  // Kick a user from room (moderator only)
  async kickUser(roomId, targetUserId, moderatorId) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      if (!room.moderators.includes(moderatorId)) {
        throw new Error('You do not have permission to kick users');
      }

      if (!room.members.includes(targetUserId)) {
        throw new Error('User is not a member of this room');
      }

      if (room.createdBy === targetUserId) {
        throw new Error('Cannot kick the room creator');
      }

      await updateDoc(roomRef, {
        members: arrayRemove(targetUserId),
        moderators: arrayRemove(targetUserId),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error kicking user:', error);
      throw error;
    }
  }

  // Ban a user from room (moderator only)
  async banUser(roomId, targetUserId, moderatorId) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      if (!room.moderators.includes(moderatorId)) {
        throw new Error('You do not have permission to ban users');
      }

      if (room.createdBy === targetUserId) {
        throw new Error('Cannot ban the room creator');
      }

      await updateDoc(roomRef, {
        members: arrayRemove(targetUserId),
        moderators: arrayRemove(targetUserId),
        bannedUsers: arrayUnion(targetUserId),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  }

  // Add moderator (creator only)
  async addModerator(roomId, targetUserId, creatorId) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      if (room.createdBy !== creatorId) {
        throw new Error('Only the room creator can add moderators');
      }

      if (!room.members.includes(targetUserId)) {
        throw new Error('User must be a member of the room');
      }

      if (room.moderators.includes(targetUserId)) {
        throw new Error('User is already a moderator');
      }

      await updateDoc(roomRef, {
        moderators: arrayUnion(targetUserId),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error adding moderator:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(roomId, userId, content, messageType = 'text') {
    try {
      // First, check if content passes moderation
      const moderationResult = await this.moderateContent(content);
      
      if (!moderationResult.approved) {
        // Include the full moderation result in the error for the UI to parse
        const errorData = {
          approved: moderationResult.approved,
          reason: moderationResult.reason,
          confidence: moderationResult.confidence,
          sentiment: moderationResult.score,
          toxicityScore: moderationResult.toxicityScore,
          categories: moderationResult.categories,
          educationalValue: moderationResult.educationalValue,
          flags: moderationResult.flags || {},
          suggestions: moderationResult.suggestions || 'Please rephrase using respectful, educational language'
        };
        
        throw new Error(`Message blocked: ${moderationResult.reason} ${JSON.stringify(errorData)}`);
      }

      const message = {
        roomId,
        userId,
        content: moderationResult.cleanContent || content,
        messageType, // text, image, file, system
        timestamp: serverTimestamp(),
        edited: false,
        editedAt: null,
        reactions: {},
        replyTo: null,
        flagged: moderationResult.flagged || false,
        moderationScore: moderationResult.score || 0
      };

      const messagesRef = collection(db, this.messagesCollection);
      const docRef = await addDoc(messagesRef, message);

      // Update room's last message and activity
      const roomRef = doc(db, this.roomsCollection, roomId);
      await updateDoc(roomRef, {
        lastMessage: {
          id: docRef.id,
          content: content.substring(0, 100),
          userId,
          timestamp: serverTimestamp()
        },
        lastActivity: serverTimestamp(),
        messageCount: increment(1)
      });

      return { id: docRef.id, ...message };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get messages for a room
  async getRoomMessages(roomId, limitCount = 50) {
    try {
      const q = query(
        collection(db, this.messagesCollection),
        where('roomId', '==', roomId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // Listen to real-time messages
  subscribeToMessages(roomId, callback) {
    const q = query(
      collection(db, this.messagesCollection),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();
      callback(messages);
    });
  }

  // Listen to room updates
  subscribeToRoom(roomId, callback) {
    const roomRef = doc(db, this.roomsCollection, roomId);
    return onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }

  // Content moderation using AI and rule-based filtering
  async moderateContent(content) {
    try {
      // Rule-based filtering for obvious violations
      const ruleBasedResult = this.ruleBasedModeration(content);
      
      if (!ruleBasedResult.approved) {
        return {
          approved: false,
          reason: ruleBasedResult.reason,
          cleanContent: content,
          flagged: true,
          score: -0.8,
          confidence: 0.9,
          toxicityScore: 0.8,
          categories: ['rule-violation'],
          educationalValue: 0.1,
          flags: { ruleBasedBlock: true }
        };
      }

      // AI-based moderation for more complex cases
      const aiResult = await this.aiModeration(content);
      
      return {
        approved: ruleBasedResult.approved && aiResult.approved,
        reason: ruleBasedResult.reason || aiResult.reason,
        cleanContent: aiResult.cleanContent,
        flagged: aiResult.flagged || aiResult.toxicityScore > 0.5,
        score: aiResult.score,
        confidence: aiResult.confidence,
        toxicityScore: aiResult.toxicityScore,
        categories: aiResult.categories,
        educationalValue: aiResult.educationalValue,
        flags: aiResult.flags || {},
        suggestions: aiResult.suggestions
      };
    } catch (error) {
      console.error('Error in content moderation:', error);
      // Default to allowing content if moderation fails
      return { 
        approved: true, 
        content,
        confidence: 0,
        toxicityScore: 0,
        categories: [],
        educationalValue: 0.5,
        flags: {}
      };
    }
  }

  // Rule-based content filtering
  ruleBasedModeration(content) {
    const lowerContent = content.toLowerCase();
    
    // Enhanced prohibited words and patterns including common disguises
    const prohibitedPatterns = [
      // Direct words
      /\b(stupid|idiot|dumb|loser|hate|kill|die)\b/i,
      // Common l33t speak substitutions
      /\b(st[u0*@][p9][i1!][d]|[i1!][d][i1!][o0][t7]|d[u*@][m]b|l[o0][s5][e3]r)\b/i,
      // Spaced out words
      /\bs\s+t\s+u\s+p\s+i\s+d\b/i,
      /\bi\s+d\s+i\s+o\s+t\b/i,
      // Asterisk/symbol disguises
      /\b(st\*pid|stup\*d|id\*\*t|d\*mb|h\*te)\b/i,
      // Shut up variations
      /\bsh[u*@]t\s*[u*@]p\b/i,
      // Bullying phrases
      /\b(shut\s+up|go\s+away|nobody\s+cares|who\s+asked)\b/i
    ];

    // Gossip and drama patterns
    const gossipPatterns = [
      /\bdid\s+you\s+hear\b/i,
      /\beveryone\s+knows\b/i,
      /\bi\s+heard\s+that\b/i,
      /\bthey\s+said\s+that\b/i,
      /\brumor\s+has\s+it\b/i,
      /\btalking\s+behind\b/i,
      /\bbehind\s+.+\s+back\b/i,
      /\bdrama\b/i
    ];

    // Spam detection (enhanced)
    const spamPatterns = [
      /(.)\1{5,}/, // Repeated characters (5+ times)
      /^[A-Z\s!]{15,}$/, // All caps long messages
      /(https?:\/\/[^\s]+)/g, // URLs (can be customized)
      /(.{1,10})\1{3,}/, // Repeated phrases
    ];

    // Check for prohibited patterns
    for (const pattern of prohibitedPatterns) {
      if (pattern.test(content)) {
        return {
          approved: false,
          reason: 'Message contains inappropriate language or disguised profanity'
        };
      }
    }

    // Check for gossip patterns
    for (const pattern of gossipPatterns) {
      if (pattern.test(content)) {
        return {
          approved: false,
          reason: 'Message contains gossip or inappropriate social discussion'
        };
      }
    }

    // Check for spam patterns
    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        return {
          approved: false,
          reason: 'Message appears to be spam or excessive formatting'
        };
      }
    }

    // Check message length (too short might be spam, too long might be off-topic)
    if (content.trim().length < 2) {
      return {
        approved: false,
        reason: 'Message is too short to be meaningful'
      };
    }

    if (content.length > 1000) {
      return {
        approved: false,
        reason: 'Message is too long - please break it into smaller parts'
      };
    }

    return { approved: true };
  }

  // AI-based moderation using a simple sentiment analysis approach
  async aiModeration(content) {
    try {
      // Use our enhanced AI moderation API endpoint
      const response = await fetch('/api/moderate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('AI moderation service unavailable');
      }

      const result = await response.json();
      
      return {
        approved: result.approved,
        reason: result.reason,
        cleanContent: result.cleanContent,
        flagged: result.categories.length > 0 || result.toxicityScore > 0.4,
        score: result.sentiment,
        confidence: result.confidence || 0.5,
        toxicityScore: result.toxicityScore || 0,
        categories: result.categories || [],
        educationalValue: result.educationalValue || 0.5,
        flags: result.flags || {},
        suggestions: result.suggestions
      };
    } catch (error) {
      console.error('AI moderation error:', error);
      return { 
        approved: true, 
        content,
        confidence: 0,
        toxicityScore: 0,
        categories: [],
        educationalValue: 0.3,
        flags: {},
        suggestions: null
      };
    }
  }

  // Simple sentiment analysis (can be replaced with more sophisticated AI)
  analyzeSentiment(text) {
    const positiveWords = [
      'good', 'great', 'excellent', 'awesome', 'wonderful', 'fantastic',
      'help', 'thanks', 'please', 'support', 'encourage', 'positive',
      'happy', 'excited', 'love', 'amazing', 'brilliant', 'perfect'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'pathetic',
      'stupid', 'dumb', 'hate', 'angry', 'frustrated', 'annoying',
      'gossip', 'rumor', 'behind', 'talking about', 'said that', 'heard that'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) {
        positiveScore++;
      } else if (negativeWords.includes(word)) {
        negativeScore++;
      }
    }

    const totalWords = words.length;
    const score = (positiveScore - negativeScore) / Math.max(totalWords, 1);

    return { score };
  }

  // Delete a room (creator only)
  async deleteRoom(roomId, userId) {
    try {
      const roomRef = doc(db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      if (room.createdBy !== userId) {
        throw new Error('Only the room creator can delete the room');
      }

      // Delete all messages in the room
      const messagesQuery = query(
        collection(db, this.messagesCollection),
        where('roomId', '==', roomId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete the room
      await deleteDoc(roomRef);

      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }
}

export default new ChatRoomService();
