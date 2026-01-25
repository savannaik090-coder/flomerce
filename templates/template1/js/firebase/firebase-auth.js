/**
 * Simplified Firebase Authentication
 * Handles user login, signup, and profile management
 * 
 * This module uses Firebase Compat API which is loaded via script tags in the HTML
 */

// Create a global FirebaseAuth object
window.FirebaseAuth = (function() {
  // Access the already initialized Firebase (or initialize it if not already done)
  let auth, db, googleProvider;

  function init() {
    // First, make sure Firebase is initialized
    if (window.FirebaseInit && !FirebaseInit.isInitialized()) {
      FirebaseInit.initFirebase();
    }

    if (!window.firebase) {
      console.error('Firebase SDK not found');
      return false;
    }

    try {
      // Try to get existing Firebase app
      try {
        firebase.app();
      } catch (appError) {
        // If no app exists, this will fail and we need to initialize
        if (appError.code === 'app-compat/no-app') {
          console.error('Firebase app not initialized before auth module');
          // If FirebaseInit exists, try using it
          if (window.FirebaseInit) {
            const initSuccess = FirebaseInit.initFirebase(true); // Force new initialization
            if (!initSuccess) {
              console.error('Failed to initialize Firebase through FirebaseInit');
              return false;
            }
          } else {
            console.error('FirebaseInit module not found');
            return false;
          }
        } else {
          throw appError; // Rethrow unexpected errors
        }
      }

      // Now initialize auth components
      auth = firebase.auth();
      db = firebase.firestore();
      googleProvider = new firebase.auth.GoogleAuthProvider();

      console.log('Firebase Auth initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Firebase Auth:', error);
      return false;
    }
  }

  // Session Management
  /**
   * Save user session to localStorage
   * @param {Object} userData - User data to save
   */
  function saveSession(userData) {
    localStorage.setItem('userSession', JSON.stringify({
      ...userData,
      timestamp: Date.now()
    }));
  }

  /**
   * Get current user session from localStorage
   * @returns {Object|null} - User session or null if not logged in
   */
  function getSession() {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  }

  /**
   * Clear user session from localStorage
   */
  function clearSession() {
    localStorage.removeItem('userSession');
  }

  /**
   * Check if user is logged in AND email verified
   * @returns {Boolean} - True if user is logged in and email verified
   */
  function isLoggedIn() {
    try {
      const session = getSession();
      // Check both login status and email verification
      return !!session && session.loggedIn === true && session.emailVerified === true;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  // Authentication Functions
  /**
   * Register a new user with email and password (with email verification)
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {Object} userData - Additional user data like displayName
   * @returns {Promise<Object>} Success status and user data or error information
   */
  async function registerWithEmail(email, password, userData) {
    // Validate inputs first
    if (!email || !password) {
      return { 
        success: false, 
        error: 'Email and password are required',
        code: 'auth/invalid-input' 
      };
    }

    // Initialize Firebase
    if (!init()) {
      return { 
        success: false, 
        error: 'Firebase not initialized. Please check your internet connection and try again.',
        code: 'auth/initialization-failed'
      };
    }

    try {
      console.log("Attempting to register user with email:", email);

      // First check if email already exists to provide a better error message
      try {
        const emailCheck = await firebase.auth().fetchSignInMethodsForEmail(email);
        if (emailCheck && emailCheck.length > 0) {
          console.log("Email already in use:", email, "Sign in methods:", emailCheck);
          return {
            success: false,
            error: 'This email address is already registered. Please try logging in instead.',
            code: 'auth/email-already-in-use'
          };
        }
      } catch (emailCheckError) {
        // If we can't check the email, just continue with registration
        console.warn("Could not check if email exists:", emailCheckError);
      }

      // Create Firebase Auth user
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      console.log("User registered successfully, sending verification email");

      // Generate verification token and store in Firestore
      const verificationToken = generateVerificationToken();

      // Create user profile in Firestore but mark as unverified
      const nameFromEmail = user.email ? user.email.split('@')[0] : '';
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName || userData.name || nameFromEmail || 'User',
        emailVerified: false, // EXPLICITLY mark as unverified initially
        verificationToken: verificationToken,
        verificationTokenExpiry: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
        createdAt: firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.Timestamp.now(),
        // Additional fields to prevent inconsistent states
        needsVerification: true,
        registrationMethod: 'email_password',
        // Ensure these fields don't exist initially
        verifiedAt: null,
        verificationMethod: null
      };

      console.log('📝 Creating user profile in Firestore:', {
        uid: user.uid,
        email: user.email,
        emailVerified: userProfile.emailVerified,
        hasVerificationToken: !!userProfile.verificationToken,
        tokenExpiry: userProfile.verificationTokenExpiry.toDate().toISOString()
      });

      // Store user data at "users/{user.uid}" path in Firestore
      await db.collection("users").doc(user.uid).set(userProfile);

      // Send custom verification email using your working email service
      console.log("📧 Attempting to send verification email...");
      const emailResult = await sendCustomVerificationEmail(user.email, userData.displayName || userData.firstName || 'User', verificationToken);

      if (!emailResult.success) {
        console.error("❌ Failed to send verification email:", emailResult.error);

        // Clean up the user account if email failed
        try {
          await user.delete();
          console.log("🗑️ Cleaned up user account due to email failure");
        } catch (deleteError) {
          console.error("Failed to clean up user account:", deleteError);
        }

        return {
          success: false,
          error: `Account creation failed: ${emailResult.error || 'Could not send verification email'}. Please try again.`,
          code: 'auth/verification-email-failed'
        };
      }

      console.log("✅ Verification email sent successfully");

      // IMPORTANT: Sign out the user immediately so they can't access the account until verified
      await auth.signOut();
      clearSession(); // Also clear any local session data

      console.log("User registration complete, verification email sent, user signed out");

      return { 
        success: true, 
        needsVerification: true,
        user: userProfile,
        message: 'Account created! IMPORTANT: You must verify your email before you can log in. Check your email inbox (and spam folder) for the verification link.'
      };
    } catch (error) {
      console.error("Registration error:", error);

      // Enhanced error handling with more specific messages
      let errorMessage = error.message || 'An error occurred during registration';
      let errorCode = error.code || 'auth/unknown-error';

      // Handle specific Firebase errors with more user-friendly messages
      switch(errorCode) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already registered. Please try logging in instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid. Please enter a valid email.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/unauthorized-continue-uri':
          errorMessage = 'Email verification is currently being set up. Your account has been created, but you may need to verify your email manually. Please contact support if you have issues.';
          break;
      }

      return { 
        success: false, 
        error: errorMessage,
        code: errorCode,
        originalError: error // Include original error for debugging
      };
    }
  }

  /**
   * Sign in with email and password
   * @param {String} email - User email
   * @param {String} password - User password
   * @returns {Promise<Object>} - User data
   */
  async function loginWithEmail(email, password) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      // Sign in with Firebase Auth
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      console.log('Login attempt for user:', user.uid, 'email:', user.email);
      console.log('Firebase Auth emailVerified (before reload):', user.emailVerified);

      // CRITICAL FIX: Reload the user to get the latest emailVerified status from Firebase Auth
      // This is necessary because the verification process updates Firebase Auth on the server side
      await user.reload();
      console.log('Firebase Auth emailVerified (after reload):', user.emailVerified);

      // Get Firestore data to check verification status
      let userDataFromFirestore = null;
      let isActuallyVerified = false;

      try {
        const userRef = db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          userDataFromFirestore = userDoc.data();

          console.log('Firestore user data:', {
            emailVerified: userDataFromFirestore.emailVerified,
            hasVerificationToken: !!userDataFromFirestore.verificationToken,
            hasTokenExpiry: !!userDataFromFirestore.verificationTokenExpiry
          });

          // COMPREHENSIVE verification status check (matching resend logic)
          const emailVerifiedValue = userDataFromFirestore.emailVerified;
          const isEmailVerifiedTrue = emailVerifiedValue === true;
          const hasVerificationToken = !!userDataFromFirestore.verificationToken;
          const hasTokenExpiry = !!userDataFromFirestore.verificationTokenExpiry;

          // User is COMPLETELY verified if:
          // 1. Firestore shows emailVerified: true AND no pending tokens (PRIMARY CHECK)
          // 2. OR Firebase Auth shows emailVerified: true (SECONDARY CHECK)
          const firebaseAuthVerified = user.emailVerified;
          const firestoreFullyVerified = isEmailVerifiedTrue && !hasVerificationToken && !hasTokenExpiry;

          // FIXED LOGIC: Prioritize Firestore as authoritative source, Firebase Auth as backup
          isActuallyVerified = firestoreFullyVerified || firebaseAuthVerified;

          console.log('🔍 VERIFICATION DECISION LOGIC:', {
            firestoreEmailVerified: isEmailVerifiedTrue,
            firestoreHasToken: hasVerificationToken,
            firestoreHasExpiry: hasTokenExpiry,
            firestoreFullyVerified: firestoreFullyVerified,
            firebaseAuthVerified: firebaseAuthVerified,
            finalDecision: isActuallyVerified ? 'ALLOW_LOGIN' : 'REQUIRE_VERIFICATION'
          });

          // User NEEDS verification if NOT completely verified in EITHER system
          const needsVerification = (!isEmailVerifiedTrue || hasVerificationToken || hasTokenExpiry) && !firebaseAuthVerified;

          console.log('LOGIN verification status check:', {
            emailVerifiedValue: emailVerifiedValue,
            emailVerifiedType: typeof emailVerifiedValue,
            isEmailVerifiedTrue: isEmailVerifiedTrue,
            hasVerificationToken: hasVerificationToken,
            hasTokenExpiry: hasTokenExpiry,
            firebaseAuthVerified: user.emailVerified,
            firestoreCheck: isEmailVerifiedTrue && !hasVerificationToken && !hasTokenExpiry,
            firebaseAuthCheck: user.emailVerified,
            isActuallyVerified: isActuallyVerified,
            needsVerification: needsVerification,
            decision: isActuallyVerified ? 'ALLOW_LOGIN' : 'REQUIRE_VERIFICATION'
          });
        } else {
          // No Firestore record - this shouldn't happen for registered users
          console.warn('No Firestore record found for user:', user.uid);
          isActuallyVerified = user.emailVerified;
        }
      } catch (firestoreError) {
        console.warn('Could not check Firestore verification status:', firestoreError);
        isActuallyVerified = user.emailVerified;
      }

      // If user is not verified, sign them out and show verification dialog
      if (!isActuallyVerified) {
        console.log('🚫 User email not verified, signing out and showing verification dialog');
        console.log('📧 User verification status:', {
          firebaseAuthVerified: user.emailVerified,
          firestoreEmailVerified: userDataFromFirestore?.emailVerified,
          hasPendingToken: !!userDataFromFirestore?.verificationToken,
          hasTokenExpiry: !!userDataFromFirestore?.verificationTokenExpiry,
          decision: 'BLOCK_LOGIN_REQUIRE_VERIFICATION'
        });

        // CRITICAL: Do NOT modify user's verification status here - just sign out
        await auth.signOut();
        clearSession(); // Also clear any local session data to prevent inconsistencies

        return { 
          success: false, 
          error: 'Please verify your email before logging in. Check your email for the verification link.',
          code: 'auth/email-not-verified',
          needsVerification: true
        };
      }

      // ADDITIONAL VERIFICATION: Double-check that we really should allow login
      console.log('✅ VERIFICATION PASSED - User is allowing to login:', {
        uid: user.uid,
        email: user.email,
        firebaseAuthVerified: user.emailVerified,
        firestoreEmailVerified: userDataFromFirestore?.emailVerified,
        hasPendingToken: !!userDataFromFirestore?.verificationToken,
        hasTokenExpiry: !!userDataFromFirestore?.verificationTokenExpiry,
        isActuallyVerified: isActuallyVerified,
        decision: 'PROCEED_WITH_LOGIN'
      });

      // If we reach here, user is verified - proceed with login
      console.log('User is verified, proceeding with login');

      // Get or create user profile in Firestore
      let userProfile;
      const userRef = db.collection("users").doc(user.uid);

      if (userDataFromFirestore) {
        // Update existing user with login info
        userProfile = userDataFromFirestore;

        // CRITICAL FIX: Only update login info, DO NOT modify emailVerified status
        // The emailVerified status was already properly verified above and should not be changed
        await userRef.update({ 
          lastLogin: firebase.firestore.Timestamp.now(),
          updatedAt: firebase.firestore.Timestamp.now()
          // REMOVED: emailVerified: true - this was the bug causing false verification
        });

        // Keep the verified status from Firestore, don't override it
        // userProfile.emailVerified = true; // REMOVED - this was also part of the bug
      } else {
        // Create new user profile (shouldn't happen but handle gracefully)
        const nameFromEmail = user.email ? user.email.split('@')[0] : '';
        userProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || nameFromEmail || 'User',
          emailVerified: true,
          createdAt: firebase.firestore.Timestamp.now(),
          updatedAt: firebase.firestore.Timestamp.now(),
          lastLogin: firebase.firestore.Timestamp.now()
        };
        await userRef.set(userProfile);
      }

      // CRITICAL FIX: Save session with the VERIFIED status that allowed login
      // Don't use userProfile.emailVerified as it might be stale/incorrect
      // Use the fact that we reached this point means user is verified
      saveSession({
        uid: user.uid,
        email: user.email,
        displayName: userProfile.displayName,
        emailVerified: true, // ALWAYS true since verification logic passed to reach this point
        loggedIn: true
      });

      console.log('Session saved with verified status for user:', user.uid);

      console.log('Login successful for user:', user.uid);
      return { success: true, user: userProfile };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message, code: error.code };
    }
  }

  /**
   * Sign in with Google
   * @returns {Promise<Object>} - User data
   */
  async function loginWithGoogle() {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      const userCredential = await auth.signInWithPopup(googleProvider);
      const user = userCredential.user;

      // Get or create user profile
      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      let userProfile;
      if (userDoc.exists) {
        // Update existing user
        userProfile = userDoc.data();
        await userRef.update({
          lastLogin: firebase.firestore.Timestamp.now(),
          updatedAt: firebase.firestore.Timestamp.now()
        });
      } else {
        // Create new user profile
        // Get name from email (part before @) if no display name provided
        const nameFromEmail = user.email ? user.email.split('@')[0] : '';
        userProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || nameFromEmail || 'User',
          photoURL: user.photoURL,
          createdAt: firebase.firestore.Timestamp.now(),
          updatedAt: firebase.firestore.Timestamp.now(),
          lastLogin: firebase.firestore.Timestamp.now()
        };
        await userRef.set(userProfile);
      }

      // Save session
      saveSession({
        uid: user.uid,
        email: user.email,
        displayName: userProfile.displayName,
        photoURL: user.photoURL,
        loggedIn: true
      });

      return { success: true, user: userProfile };
    } catch (error) {
      console.error("Google login error:", error);
      return { success: false, error: error.message, code: error.code };
    }
  }

  /**
   * Log the user out with confirmation
   * @param {Boolean} skipConfirmation - Skip the confirmation dialog
   * @returns {Promise<Boolean>} - Success status
   */
  async function logoutUser(skipConfirmation = false) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    // Show confirmation dialog unless explicitly skipped
    if (!skipConfirmation) {
      const confirmed = confirm('Are you sure you want to log out?');
      if (!confirmed) {
        return { success: false, cancelled: true };
      }
    }

    try {
      await auth.signOut();
      clearSession();
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user profile from Firestore
   * Retrieves user data from the path: users/{userId}
   * 
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - User profile
   */
  async function getUserProfile(userId) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      // Access the user document at path: users/{userId}
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return { success: false, error: "User profile not found" };
      }

      return { success: true, profile: userDoc.data() };
    } catch (error) {
      console.error("Error getting user profile:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   * @param {String} email - User email
   * @returns {Promise<Object>} - Success status
   */
  async function sendPasswordResetEmail(email) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      console.log('🔐 Attempting to send custom password reset email to:', email);

      // Validate email format first
      if (!email || !email.includes('@')) {
        console.error('❌ Invalid email format:', email);
        return { success: false, error: 'Please enter a valid email address.' };
      }

      // Check if user exists in Firestore first
      const usersQuery = await db.collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        console.log('❌ No user found in Firestore with email:', email);
        return { success: false, error: 'No account found with this email address.' };
      }

      const userData = usersQuery.docs[0].data();
      console.log('✅ User found in Firestore:', {
        uid: userData.uid,
        email: userData.email,
        emailVerified: userData.emailVerified
      });

      // Generate password reset token and store it
      const resetToken = generateVerificationToken();
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      console.log('Generated password reset token:', resetToken.substring(0, 8) + '...');
      console.log('Token expiry time:', expiryTime.toISOString());

      // Update Firestore with reset token
      const userDoc = await db.collection("users").doc(userData.uid);
      await userDoc.update({
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: firebase.firestore.Timestamp.fromDate(expiryTime),
        passwordResetRequestedAt: firebase.firestore.Timestamp.now()
      });

      console.log('✅ Firestore updated with password reset token');

      // Send custom password reset email
      const result = await sendCustomPasswordResetEmail(email, userData.displayName || userData.firstName || 'User', resetToken);

      if (result.success) {
        console.log('✅ Custom password reset email sent successfully');
        return {
          success: true,
          message: 'Password reset email sent! Please check your email for instructions to reset your password.'
        };
      } else {
        console.error('❌ Failed to send custom password reset email:', result.error);
        return { success: false, error: 'Failed to send password reset email. Please try again.' };
      }
    } catch (error) {
      console.error("❌ Password reset error:", {
        code: error.code,
        message: error.message,
        email: email,
        fullError: error
      });

      return { 
        success: false, 
        error: `Failed to send password reset email: ${error.message}`
      };
    }
  }

  /**
   * Check if user's email is verified (checks both Firebase Auth and Firestore)
   * @param {Object} user - Firebase Auth user object
   * @returns {Promise<Boolean>} - True if email is verified
   */
  async function isEmailVerified(user) {
    if (!user) return false;

    // Check Firebase Auth first
    if (user.emailVerified) return true;

    // Check Firestore as backup
    try {
      const userRef = db.collection("users").doc(user.uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        return userData.emailVerified === true;
      }
    } catch (error) {
      console.warn('Could not check Firestore verification status:', error);
    }

    return false;
  }

  /**
   * Resend email verification
   * @param {String} email - Optional email address (used when no current user)
   * @returns {Promise<Object>} - Success status
   */
  async function resendEmailVerification(email = null) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      const user = auth.currentUser;

      // If no current user but email provided, find user in Firestore and send custom verification
      if (!user && email) {
        console.log('Resend verification requested for email:', email);

        // Check if user exists in Firestore
        const usersQuery = await db.collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (usersQuery.empty) {
          console.log('No user found with email:', email);
          return { success: false, error: 'No account found with this email address.' };
        }

        const userDoc = usersQuery.docs[0];
        const userData = userDoc.data();

        console.log('Found user data for resend verification:', {
          uid: userData.uid,
          email: userData.email,
          emailVerified: userData.emailVerified,
          emailVerifiedType: typeof userData.emailVerified,
          hasVerificationToken: !!userData.verificationToken,
          hasTokenExpiry: !!userData.verificationTokenExpiry
        });

        // COMPREHENSIVE verification status analysis
        const emailVerifiedValue = userData.emailVerified;
        const isEmailVerifiedTrue = emailVerifiedValue === true;
        const hasVerificationToken = !!userData.verificationToken;
        const hasTokenExpiry = !!userData.verificationTokenExpiry;

        console.log('🔍 DETAILED verification status analysis:', {
          emailVerifiedValue: emailVerifiedValue,
          emailVerifiedType: typeof emailVerifiedValue,
          isEmailVerifiedTrue: isEmailVerifiedTrue,
          hasVerificationToken: hasVerificationToken,
          hasTokenExpiry: hasTokenExpiry,
          verificationToken: userData.verificationToken ? userData.verificationToken.substring(0, 8) + '...' : 'none',
          tokenExpiry: userData.verificationTokenExpiry ? userData.verificationTokenExpiry.toDate().toISOString() : 'none',
          userCreatedAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : 'unknown',
          lastUpdated: userData.updatedAt ? userData.updatedAt.toDate().toISOString() : 'unknown'
        });

        // FIXED LOGIC: User is FULLY verified if:
        // 1. emailVerified is explicitly true AND
        // 2. NO verification token exists AND 
        // 3. NO token expiry exists
        // REMOVED: recentlyVerified check that was causing race conditions
        const isCompletelyVerified = isEmailVerifiedTrue && !hasVerificationToken && !hasTokenExpiry;

        console.log('🚨 FIXED verification logic:', {
          isEmailVerifiedTrue: isEmailVerifiedTrue,
          hasVerificationToken: hasVerificationToken,
          hasTokenExpiry: hasTokenExpiry,
          isCompletelyVerified: isCompletelyVerified,
          decision: isCompletelyVerified ? 'ALREADY_VERIFIED' : 'SEND_VERIFICATION'
        });

        // FIXED LOGIC: Only return "already verified" if user is COMPLETELY verified  
        if (isCompletelyVerified) {
          console.log('✅ User is completely verified - no verification needed');
          return { success: false, error: 'Email is already verified.' };
        }

        console.log('🔄 Proceeding with resend verification email - user needs verification', {
          emailVerified: emailVerifiedValue,
          hasToken: hasVerificationToken,
          hasExpiry: hasTokenExpiry,
          willGenerateNewToken: true
        });

        // Generate new verification token and ensure unverified state
        const verificationToken = generateVerificationToken();
        const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        console.log('Generated new verification token:', verificationToken.substring(0, 8) + '...');
        console.log('Token expiry time:', expiryTime.toISOString());

        // Update Firestore with new verification data and explicitly unverified state
        const updatePayload = {
          verificationToken: verificationToken,
          verificationTokenExpiry: firebase.firestore.Timestamp.fromDate(expiryTime),
          emailVerified: false, // EXPLICITLY set to false
          updatedAt: firebase.firestore.Timestamp.now(),
          // Clear any conflicting verification data
          verifiedAt: firebase.firestore.FieldValue.delete(),
          verificationMethod: firebase.firestore.FieldValue.delete(),
          lastVerificationResend: firebase.firestore.Timestamp.now(),
          resendCount: firebase.firestore.FieldValue.increment(1)
        };

        console.log('About to update Firestore with payload:', {
          uid: userData.uid,
          email: email,
          updatePayload: {
            ...updatePayload,
            verificationToken: verificationToken.substring(0, 8) + '...',
            verificationTokenExpiry: expiryTime.toISOString()
          }
        });

        await userDoc.ref.update(updatePayload);

        console.log('✅ Firestore successfully updated - user set to unverified state with new token');

        // Send custom verification email
        const result = await sendCustomVerificationEmail(email, userData.displayName || userData.firstName || 'User', verificationToken);

        if (result.success) {
          console.log('Verification email sent successfully');
          return {
            success: true,
            message: 'New verification email sent! Please check your email inbox (and spam folder) for the verification link.'
          };
        } else {
          console.error('Failed to send verification email:', result.error);
          return result;
        }
      }

      // Normal flow with current user (signed in user requesting resend)
      // FIXED: Instead of using simple isEmailVerified check, use the same comprehensive
      // verification logic as the email-provided branch above for consistency
      if (!user) {
        return { success: false, error: 'No user is currently signed in.' };
      }

      console.log('🔄 Signed-in user requesting resend verification - using comprehensive check');

      // Get user's current Firestore data for comprehensive verification check
      try {
        const userRef = db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          console.log('No Firestore user data found for signed-in user');
          return { success: false, error: 'User data not found. Please try signing up again.' };
        }

        const userData = userDoc.data();

        console.log('Found signed-in user data for resend verification:', {
          uid: userData.uid,
          email: userData.email,
          emailVerified: userData.emailVerified,
          emailVerifiedType: typeof userData.emailVerified,
          hasVerificationToken: !!userData.verificationToken,
          hasTokenExpiry: !!userData.verificationTokenExpiry
        });

        // Use the SAME comprehensive verification logic as the email-provided branch
        const emailVerifiedValue = userData.emailVerified;
        const isEmailVerifiedTrue = emailVerifiedValue === true;
        const hasVerificationToken = !!userData.verificationToken;
        const hasTokenExpiry = !!userData.verificationTokenExpiry;

        // FIXED: Same logic as email-provided branch - no recentlyVerified check
        const isCompletelyVerified = isEmailVerifiedTrue && !hasVerificationToken && !hasTokenExpiry;

        console.log('🔍 CONSISTENT verification status analysis for signed-in user:', {
          emailVerifiedValue: emailVerifiedValue,
          emailVerifiedType: typeof emailVerifiedValue,
          isEmailVerifiedTrue: isEmailVerifiedTrue,
          hasVerificationToken: hasVerificationToken,
          hasTokenExpiry: hasTokenExpiry,
          isCompletelyVerified: isCompletelyVerified,
          verificationToken: userData.verificationToken ? userData.verificationToken.substring(0, 8) + '...' : 'none',
          tokenExpiry: userData.verificationTokenExpiry ? userData.verificationTokenExpiry.toDate().toISOString() : 'none',
          decision: isCompletelyVerified ? 'ALREADY_VERIFIED' : 'SEND_VERIFICATION'
        });

        // FIXED: Apply the same consistent logic  
        if (isCompletelyVerified) {
          console.log('✅ Signed-in user is completely verified - no verification needed');
          return { success: false, error: 'Email is already verified.' };
        }

        console.log('🔄 Proceeding with resend verification email for signed-in user - user needs verification');

        // Generate new verification token and ensure unverified state (same as email branch)
        const verificationToken = generateVerificationToken();
        const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update Firestore with new verification data and explicitly unverified state
        const updatePayload = {
          verificationToken: verificationToken,
          verificationTokenExpiry: firebase.firestore.Timestamp.fromDate(expiryTime),
          emailVerified: false, // EXPLICITLY set to false
          updatedAt: firebase.firestore.Timestamp.now(),
          // Clear any conflicting verification data
          verifiedAt: firebase.firestore.FieldValue.delete(),
          verificationMethod: firebase.firestore.FieldValue.delete(),
          lastVerificationResend: firebase.firestore.Timestamp.now(),
          resendCount: firebase.firestore.FieldValue.increment(1)
        };

        await userRef.update(updatePayload);
        console.log('✅ Firestore successfully updated for signed-in user - set to unverified state with new token');

        // Send custom verification email (same as email branch)
        const result = await sendCustomVerificationEmail(user.email, userData.displayName || userData.firstName || 'User', verificationToken);

        if (result.success) {
          console.log('Verification email sent successfully for signed-in user');

          // IMPORTANT: Sign out the user so they can't access the account until verified
          await auth.signOut();
          clearSession(); // Also clear any local session data
          console.log('User signed out after resend verification to enforce verification requirement');

          return {
            success: true,
            message: 'New verification email sent! Please check your email inbox (and spam folder) for the verification link. You have been signed out and must verify your email before logging in again.'
          };
        } else {
          console.error('Failed to send verification email for signed-in user:', result.error);
          return result;
        }

      } catch (error) {
        console.error('Error during comprehensive verification check for signed-in user:', error);
        // Fallback to simple verification send if comprehensive check fails
        console.log('🔄 Falling back to simple verification email send...');

        await user.sendEmailVerification({
          url: window.location.origin + '/login.html',
          handleCodeInApp: false
        });

        return { 
          success: true, 
          message: 'Verification email sent! Please check your email.'
        };
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      return { success: false, error: error.message, code: error.code };
    }
  }

  /**
   * Set up auth state observer
   * @param {Function} callback - Function to call when auth state changes
   * @returns {Function} - Unsubscribe function
   */
  function observeAuthState(callback) {
    try {
      if (!auth || !init()) {
        console.error('Cannot observe auth state - Firebase not initialized');
        return () => {};
      }
      return auth.onAuthStateChanged(callback);
    } catch (error) {
      console.error('Error setting up auth state observer:', error);
      return () => {};
    }
  }

  /**
   * Generate a secure verification token
   * @returns {String} - Random verification token
   */
  function generateVerificationToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
  }

  /**
   * Send custom verification email using your working email service
   * @param {String} email - User email
   * @param {String} displayName - User display name
   * @param {String} token - Verification token
   * @returns {Promise<Object>} - Success status
   */
  async function sendCustomVerificationEmail(email, displayName, token) {
    try {
      const verificationUrl = `${window.location.origin}/verify-email.html?token=${token}&email=${encodeURIComponent(email)}`;

      const emailData = {
        type: 'verification',
        customer: {
          email: email,
          firstName: displayName || 'User'
        },
        verificationUrl: verificationUrl,
        siteName: 'Nazakat'
      };

      // Use your existing email service endpoint
      const response = await fetch('/.netlify/functions/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Failed to send verification email');
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending custom verification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send custom password reset email using your working email service
   * @param {String} email - User email
   * @param {String} displayName - User display name
   * @param {String} token - Reset token
   * @returns {Promise<Object>} - Success status
   */
  async function sendCustomPasswordResetEmail(email, displayName, token) {
    try {
      const resetUrl = `${window.location.origin}/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;

      const emailData = {
        type: 'password-reset',
        customer: {
          email: email,
          firstName: displayName || 'User'
        },
        resetUrl: resetUrl,
        siteName: 'Nazakat'
      };

      console.log('📧 Sending custom password reset email via Netlify function');

      // Use custom password reset email service endpoint
      const response = await fetch('/.netlify/functions/send-password-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Password reset email service error:', errorText);
        throw new Error('Failed to send password reset email');
      }

      const result = await response.json();
      console.log('📧 Password reset email service response:', result);

      return result;
    } catch (error) {
      console.error('Error sending custom password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate password reset token
   * @param {String} email - User email
   * @param {String} token - Reset token
   * @returns {Promise<Object>} - Validation result
   */
  async function validatePasswordResetToken(email, token) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      console.log('🔐 Validating password reset token for:', email);

      // Find user by email
      const usersQuery = await db.collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        console.log('❌ No user found with email:', email);
        return { success: false, error: 'Invalid reset link.' };
      }

      const userData = usersQuery.docs[0].data();

      // Check if token exists and matches
      if (!userData.passwordResetToken || userData.passwordResetToken !== token) {
        console.log('❌ Invalid or missing reset token');
        return { success: false, error: 'Invalid or expired reset link.' };
      }

      // Check if token is expired
      const now = new Date();
      const expiry = userData.passwordResetTokenExpiry?.toDate();

      if (!expiry || now > expiry) {
        console.log('❌ Reset token has expired');
        return { success: false, error: 'Reset link has expired. Please request a new one.' };
      }

      console.log('✅ Password reset token is valid');
      return { success: true };
    } catch (error) {
      console.error('❌ Error validating password reset token:', error);
      return { success: false, error: 'Unable to validate reset link.' };
    }
  }

  /**
   * Reset user password with token using server-side function
   * @param {String} email - User email
   * @param {String} token - Reset token
   * @param {String} newPassword - New password
   * @returns {Promise<Object>} - Reset result
   */
  async function resetPassword(email, token, newPassword) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      console.log('🔐 Attempting to reset password via server function for:', email);

      // Call server-side function to handle password reset
      const response = await fetch('/.netlify/functions/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          token: token,
          newPassword: newPassword
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server-side password reset error:', errorText);
        throw new Error('Failed to reset password');
      }

      const result = await response.json();
      console.log('🔐 Server-side password reset result:', result);

      return result;

    } catch (error) {
      console.error('❌ Error during password reset:', error);
      return { 
        success: false, 
        error: 'Failed to reset password. Please try again.' 
      };
    }
  }

  /**
   * Verify email with custom token
   * @param {String} token - Verification token
   * @param {String} email - User email
   * @returns {Promise<Object>} - Verification result
   */
  async function verifyEmailWithToken(token, email) {
    if (!init()) return { success: false, error: 'Firebase not initialized' };

    try {
      console.log('Email verification attempt:', {
        token: token.substring(0, 8) + '...',
        email: email
      });

      // FIXED LOGIC: First find user by email only
      const usersQuery = await db.collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        console.log('No user found with email:', email);
        return { success: false, error: 'No account found with this email address.' };
      }

      const userDoc = usersQuery.docs[0];
      const userData = userDoc.data();

      console.log('Found user for verification:', {
        uid: userData.uid,
        email: userData.email,
        currentEmailVerified: userData.emailVerified,
        hasToken: !!userData.verificationToken,
        providedToken: token.substring(0, 8) + '...',
        storedToken: userData.verificationToken ? userData.verificationToken.substring(0, 8) + '...' : 'none',
        tokenExpiry: userData.verificationTokenExpiry ? userData.verificationTokenExpiry.toDate() : null
      });

      // Check if user is already completely verified
      const isAlreadyVerified = userData.emailVerified === true && !userData.verificationToken && !userData.verificationTokenExpiry;
      if (isAlreadyVerified) {
        console.log('User is already completely verified');
        return { 
          success: true, 
          message: 'Email is already verified! You can now log in to your account.',
          userUid: userData.uid,
          userEmail: email
        };
      }

      // Check if verification token exists and matches
      if (!userData.verificationToken || userData.verificationToken !== token) {
        console.log('Token mismatch or missing:', {
          hasStoredToken: !!userData.verificationToken,
          tokensMatch: userData.verificationToken === token,
          providedToken: token.substring(0, 8) + '...',
          storedToken: userData.verificationToken ? userData.verificationToken.substring(0, 8) + '...' : 'none'
        });
        return { success: false, error: 'Invalid verification link. The link may be expired or already used.' };
      }

      // Check if token is expired
      if (userData.verificationTokenExpiry && userData.verificationTokenExpiry.toDate() < new Date()) {
        console.log('Verification token expired:', {
          expiry: userData.verificationTokenExpiry.toDate(),
          now: new Date()
        });
        return { success: false, error: 'Verification link has expired. Please request a new one.' };
      }

      console.log('✅ Processing email verification for user:', userData.uid);
      console.log('🔐 Verification token validation passed - proceeding to verify user');

      // Step 1: COMPLETELY clear verification state and set verified
      const updateData = {
        emailVerified: true, // Set to verified
        updatedAt: firebase.firestore.Timestamp.now(),
        verifiedAt: firebase.firestore.Timestamp.now(),
        verificationMethod: 'email_link',
        // COMPLETELY remove ALL verification-related fields
        verificationToken: firebase.firestore.FieldValue.delete(),
        verificationTokenExpiry: firebase.firestore.FieldValue.delete(),
        needsVerification: firebase.firestore.FieldValue.delete(),
        pendingVerification: firebase.firestore.FieldValue.delete(),
        resendAttempt: firebase.firestore.FieldValue.delete(),
        lastVerificationResend: firebase.firestore.FieldValue.delete(),
        resendCount: firebase.firestore.FieldValue.delete()
      };

      console.log('📊 About to update user verification status:', {
        uid: userData.uid,
        email: email,
        currentlyVerified: userData.emailVerified,
        willSetVerifiedTo: true,
        willDeleteToken: true,
        verificationTime: new Date().toISOString()
      });

      await userDoc.ref.update(updateData);

      console.log('✅ Firestore updated - user verified and all verification tokens cleared');
      console.log('🎉 Email verification completed successfully for:', email);

      // Step 2: Update Firebase Auth verification status
      let firebaseAuthUpdateSuccess = false;
      try {
        console.log('🔄 Updating Firebase Auth verification status via server function...');
        console.log('Sending request to server function with data:', {
          uid: userData.uid,
          email: email,
          emailVerified: true
        });

        const response = await fetch('/.netlify/functions/verify-user-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uid: userData.uid,
            email: email,
            emailVerified: true
          })
        });

        console.log('Server function response status:', response.status);

        const result = await response.json();
        console.log('Server function response body:', result);

        if (response.ok && result.success) {
          console.log('✅ Firebase Auth updated successfully:', result.message);
          firebaseAuthUpdateSuccess = true;
        } else {
          console.error('❌ Server function failed:', {
            status: response.status,
            error: result.error || 'Unknown error',
            details: result.details
          });
        }
      } catch (authUpdateError) {
        console.error('❌ Error calling Firebase Auth update server function:', authUpdateError);
      }

      // IMPORTANT: If server function fails, we need to handle this gracefully
      if (!firebaseAuthUpdateSuccess) {
        console.warn('🚨 WARNING: Firebase Auth verification update failed! User may experience login issues.');
        console.warn('This could be due to missing Firebase Admin credentials or server function issues.');

        // For now, let's make Firestore the authoritative source and add a note for the user
        return { 
          success: true, 
          message: 'Email verified successfully in Firestore! If you experience login issues, please try refreshing the page or logging in again in a few minutes.',
          userUid: userData.uid,
          userEmail: email,
          warning: 'Firebase Auth sync pending'
        };
      }

      console.log('Email verification completed successfully for user:', userData.uid);

      return { 
        success: true, 
        message: 'Email verified successfully! You can now log in to your account.',
        userUid: userData.uid,
        userEmail: email
      };
    } catch (error) {
      console.error('Error in email verification process:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize when this script loads
  const initSuccess = init();

  // Return the public API with initialization status
  return {
    init,
    saveSession,
    getSession,
    clearSession,
    isLoggedIn,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logoutUser,
    getUserProfile,
    sendPasswordResetEmail,
    resendEmailVerification,
    validatePasswordResetToken,  // Add password reset token validation
    resetPassword,               // Add password reset function
    verifyEmailWithToken,
    observeAuthState,
    isEmailVerified,  // Add the new helper function
    isInitialized: () => initSuccess
  };
})();