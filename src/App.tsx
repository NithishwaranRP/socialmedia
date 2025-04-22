import { checkAdminStatus } from './redux/actions/userAction';

useEffect(() => {
  const checkAuthStatus = async () => {
    try {
      const accessToken = await token_storage.get('accessToken');
      if (accessToken) {
        await dispatch(setupFcmToken());
        await dispatch(refetchUser());
        
        // Check if user is admin
        dispatch(checkAdminStatus());
        
        resetAndNavigate('BottomTab');
      } else {
        resetAndNavigate('LoginScreen');
      }
    } catch (error) {
      resetAndNavigate('LoginScreen');
      console.log('Error refreshing token', error);
    }
  };

  checkAuthStatus();
}, [dispatch]); 