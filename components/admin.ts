
import { db } from './firebase';
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";

// This is a placeholder for a secure way to check for admin privileges.
// In a real app, this would involve checking a custom claim on the user's token.
const isAdmin = (userId: string) => {
    // For now, let's assume a hardcoded admin UID for demonstration purposes.
    // Replace this with your actual admin user's UID.
    return userId === "YOUR_ADMIN_UID";
}

export const admin = {
    deleteUser: async (currentUserId: string, targetUserId: string) => {
        if (!isAdmin(currentUserId)) {
            throw new Error("You don't have permission to do that.");
        }
        if (currentUserId === targetUserId) {
            throw new Error("You can't delete yourself.");
        }
        const userRef = doc(db, 'users', targetUserId);
        await deleteDoc(userRef);
    },

    getAllUsers: async (currentUserId: string) => {
        if (!isAdmin(currentUserId)) {
            throw new Error("You don't have permission to do that.");
        }
        const usersCollection = collection(db, 'users');
        const snapshot = await getDocs(usersCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}
