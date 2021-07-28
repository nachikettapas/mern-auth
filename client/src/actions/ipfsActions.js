import axios from "axios";

//Upload file
export const uploadFileIPFS = (request) => dispatch => {
  return axios
          .post("/api/ipfs", request)
          .then(res => { return res.data; })
          .catch (err =>
            dispatch({
              success: false,
              message: `There was a problem communicating with the API.\n${err}`
            }));
}

//Retrieve file details from IOTA
export const retrieveFileIOTA = (request) => dispatch => {
  return axios
          .get(`/api/ipfs?messageId=${request.messageId}`)
          .then(res => { return res.data; })
          .catch (err =>
            dispatch({
              success: false,
              message: `There was a problem communicating with the API.\n${err}`
            }));
}



