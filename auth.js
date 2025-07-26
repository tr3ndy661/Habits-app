import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, auth } from './firebase.js';

// Show/hide auth modal
export const showAuthModal = () => {
    const authModal = document.getElementById('authModal');
    authModal.style.display = 'flex';
};

export const hideAuthModal = () => {
    const authModal = document.getElementById('authModal');
    authModal.style.display = 'none';
};

// Handle auth state changes
auth.onAuthStateChanged((user) => {
    const authModal = document.getElementById('authModal');
    const mainContent = document.getElementById('mainContent');
    const userDisplayName = document.getElementById('userDisplayName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarLarge = document.getElementById('userAvatarLarge');
    const welcomeUser = document.getElementById('welcomeUser');
    const userProfile = document.getElementById('userProfile');

    if (user) {
        // User is signed in
        authModal.style.display = 'none';
        mainContent.style.display = 'block';
        
        // Check if user is signed in with OAuth
        const isOAuthUser = user.providerData[0].providerId !== 'password';
        
        if (isOAuthUser) {
            userProfile.parentElement.classList.add('oauth-user');
            userDisplayName.contentEditable = 'false';
        } else {
            userProfile.parentElement.classList.remove('oauth-user');
            userDisplayName.contentEditable = 'true';
        }
        
        // Set user information
        const displayName = user.displayName || user.email.split('@')[0];
        userDisplayName.textContent = displayName;
        welcomeUser.textContent = displayName;
        userEmail.textContent = user.email;
        
        // Set profile picture
        if (user.photoURL) {
            userAvatar.src = user.photoURL;
            userAvatarLarge.src = user.photoURL;
        } else {
            const initials = displayName.substring(0, 2).toUpperCase();
            userAvatar.src = `https://api.dicebear.com/6.x/initials/svg?seed=${initials}`;
            userAvatarLarge.src = `https://api.dicebear.com/6.x/initials/svg?seed=${initials}`;
        }
    } else {
        // No user is signed in
        mainContent.style.display = 'none';
        showAuthModal();
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleSignInBtn = document.getElementById('googleSignIn');
    const signOutBtn = document.getElementById('signOutBtn');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await signInWithEmail(email, password);
            hideAuthModal();
        } catch (error) {
            alert(error.message);
        }
    });

    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        try {
            await signUpWithEmail(email, password);
            hideAuthModal();
        } catch (error) {
            alert(error.message);
        }
    });

    googleSignInBtn?.addEventListener('click', async () => {
        try {
            await signInWithGoogle();
            hideAuthModal();
        } catch (error) {
            alert(error.message);
        }
    });

    signOutBtn?.addEventListener('click', async () => {
        try {
            await signOutUser();
            showAuthModal();
        } catch (error) {
            alert(error.message);
        }
    });

    switchToSignup?.addEventListener('click', () => {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('signupContainer').style.display = 'block';
    });

    switchToLogin?.addEventListener('click', () => {
        document.getElementById('signupContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'block';
    });
});
