import {combineReducers} from 'redux';
import userSlice from './reducers/userSlice';
import followingSlice from './reducers/followingSlice';
import likeSlice from './reducers/likeSlice';
import CommentSlice from './reducers/commentSlice';
import themeSlice from './reducers/themeSlice';

const rootReducer = combineReducers({
  user: userSlice,
  following: followingSlice,
  like: likeSlice,
  comment: CommentSlice,
  theme: themeSlice,
});

export default rootReducer;
