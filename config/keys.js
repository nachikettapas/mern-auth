module.exports = {
    mongoURI: "mongodb+srv://nachikettapas:abcd@1234@cluster0.gj3vs.mongodb.net/mern-auth?retryWrites=true&w=majority",
    secretOrKey: "abcd1234",
    algorithms: ["HS256"],
    node: {
        "provider": "https://api.lb-0.testnet.chrysalis2.com",
        "depth": 3, 
        "mwm": 9
    },
    ipfs: {
        "provider": "https://ipfs.infura.io:5001/api/v0/",
        "token": ""
    },
    allowedDomains: [
        "http://localhost:3000"
    ],
    maxBytes: 1048576
};
