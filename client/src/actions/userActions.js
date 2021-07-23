import axios from "axios";
import setAuthToken from "../utils/setAuthToken";
import jwt_decode from "jwt-decode";
import {
  GET_ERRORS,
  SET_CURRENT_USER,
  USER_LOADING
} from "./types";

//Create user
export const createUser = (publicAddress, nonce) => {
  return axios
          .post("/api/users", { address: publicAddress, nonce: nonce, username: 'User' });
}

// Check if User exists or else create it
export const checkUser = user => dispatch => {
  return axios
          .get(`/api/users?publicAddress=${user.publicAddress}`)
          .then(res => res.data.length ? res.data[0] : createUser(user.publicAddress, user.nonce).data[0])
          .then(user => { return user; })
          .catch(err =>
            dispatch({
              type: GET_ERRORS,
              payload: err
            })
          );
}

// Login - get user token
export const oneClickLoginUser = userData => dispatch => {
  axios
    .post("/api/auth/loginoneclick", userData)
    .then(res => {
      // Save to localStorage
      // Set token to localStorage
      const { token } = res.data;
      localStorage.setItem("jwtToken", token);
      // Set token to Auth header
      setAuthToken(token);
      // Decode token to get user data
      const decoded = jwt_decode(token);
      // Set current user
      dispatch(setCurrentUser(decoded));
    })
    .catch(err =>
      dispatch({
        type: GET_ERRORS,
        payload: err.response.data
      })
    );
};

// Set logged in user
export const setCurrentUser = decoded => {
  return {
    type: SET_CURRENT_USER,
    payload: decoded
  };
};

// User loading
export const setUserLoading = () => {
  return {
    type: USER_LOADING
  };
};