const admin = require('firebase-admin');
const env = require('./env');

if (env.firebaseProjectId && env.firebasePrivateKey && env.firebaseClientEmail) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId,
        privateKey: env.firebasePrivateKey,
        clientEmail: env.firebaseClientEmail,
      }),
      storageBucket: `${env.firebaseProjectId}.appspot.com`
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  console.warn('Firebase configuration missing. Running without Firebase Admin.');
}

const db = admin.apps.length ? admin.firestore() : null;
const bucket = admin.apps.length ? admin.storage().bucket() : null;

module.exports = { admin, db, bucket };
