import { useState, useEffect } from 'react';
import { useAppSelector } from '../redux/reduxHook';
import { selectUser, selectIsAdmin } from '../redux/reducers/userSlice';

/**
 * Custom hook to check if a user is an admin using multiple methods
 * @returns Object containing admin status information
 */
export const useAdminStatus = () => {
  const reduxIsAdmin = useAppSelector(selectIsAdmin);
  const currentUser = useAppSelector(selectUser);
  const [isAdmin, setIsAdmin] = useState(false);

  // List of known admin user IDs
  const adminUserIds = ['67f8cff4e06283e516e56b12'];
  
  // List of known admin emails
  const adminEmails = ['nithishnt2002@gmail.com', 'nithishwaran@adsreverb.com'];

  useEffect(() => {
    // Check if the user is an admin through multiple means
    const checkAdminStatus = () => {
      // Check if Redux already says we're an admin
      const isReduxAdmin = reduxIsAdmin === true;
      
      // Check if user ID is in the admin list
      const isAdminById = currentUser?.id && adminUserIds.includes(currentUser.id);
      
      // Check if user email is in the admin list
      const isAdminByEmail = currentUser?.email && adminEmails.includes(currentUser.email);
      
      console.log('Admin checks:', {
        reduxAdmin: isReduxAdmin,
        adminById: isAdminById,
        adminByEmail: isAdminByEmail,
        userId: currentUser?.id,
        email: currentUser?.email
      });
      
      // Set admin status if any check passes
      setIsAdmin(isReduxAdmin || isAdminById || isAdminByEmail);
    };
    
    checkAdminStatus();
  }, [reduxIsAdmin, currentUser]);

  return {
    isAdmin,
    isAdminFromRedux: reduxIsAdmin,
    isAdminByUserId: currentUser?.id && adminUserIds.includes(currentUser.id),
    isAdminByEmail: currentUser?.email && adminEmails.includes(currentUser.email),
    currentUserId: currentUser?.id,
    currentUserEmail: currentUser?.email
  };
}; 