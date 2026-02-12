import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
}

/**
 * Save assessment data to Firestore
 * @param {Object} assessmentData - Complete assessment data
 * @returns {Promise<string>} - Document ID for the saved assessment
 */
export async function saveAssessment(assessmentData) {
  try {
    if (!db) {
      throw new Error('Firebase not initialized. Check your environment variables.');
    }

    const assessmentsRef = collection(db, 'assessments');

    const docData = {
      ...assessmentData,
      createdAt: serverTimestamp(),
      version: '1.0', // Schema version for future migrations
    };

    const docRef = await addDoc(assessmentsRef, docData);
    console.log('Assessment saved with ID:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('Error saving assessment:', error);
    throw error;
  }
}

/**
 * Load assessment data from Firestore by ID
 * @param {string} assessmentId - Document ID
 * @returns {Promise<Object>} - Assessment data
 */
export async function loadAssessment(assessmentId) {
  try {
    if (!db) {
      throw new Error('Firebase not initialized. Check your environment variables.');
    }

    const docRef = doc(db, 'assessments', assessmentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('Assessment loaded:', assessmentId);
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error('Assessment not found');
    }
  } catch (error) {
    console.error('Error loading assessment:', error);
    throw error;
  }
}

/**
 * Check if Firebase is properly configured
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    db
  );
}
