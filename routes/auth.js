const ethsigutil = require('eth-sig-util');
const ethjsutil = require('ethereumjs-util');
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");

// Load input validation
const validateRegisterInput = require("../validation/register");
const validateLoginInput = require("../validation/login");

// Load User and UserOneClick model
const User = require("../models/User");
const UserOneClick = require("../models/UserOneClick");

//For smart contrat
const Web3 = require("web3");
if (typeof web3 !== 'undefined') {
    var web3 = new Web3(web3.currentProvider)
  } else {
    var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'))
}
const contractCode = require('../contracts/RBAC.json');
const baseAddress = "0x042Ed7DDdEE15E85d4C8a310e4BA47503F31b3c5";
const contract = new web3.eth.Contract(contractCode.abi, baseAddress);
const adminAddress = "0xccf20e63B3cFe990B997D9AeEABf5f2222BaC9Ff";

// @route POST api/users/register
// @desc Register user
// @access Public
router.post("/register", (req, res) => {

  // Form validation
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
      });

      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => res.json(user))
            .catch(err => console.log(err));
        });
      });
    }
  });
});

// @route POST api/users/login
// @desc Login user and return JWT token
// @access Public
router.post("/login", (req, res) => {
  // Form validation
  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  const email = req.body.email;
  const password = req.body.password;

  // Find user by email
  User.findOne({ email }).then(user => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ emailnotfound: "Email not found" });
    }
    
    // Check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name
        };

        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 31556926 // 1 year in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res
          .status(400)
          .json({ passwordincorrect: "Password incorrect" });
      }
    });
  });
});

// @route POST api/users/loginoneclick
// @desc Login user and return JWT token
// @access Public
router.post("/loginoneclick", (req, res) => {
    const { signature, publicAddress } = req.body;
	if (!signature || !publicAddress)
		return res
			.status(400)
			.send({ error: 'Request should have signature and publicAddress' });

	return (
		UserOneClick.findOne({ address: publicAddress })
			////////////////////////////////////////////////////
			// Step 1: Get the user with the given publicAddress
			////////////////////////////////////////////////////
			.then((user) => {
				if (!user) {
					res.status(401).send({
						error: `Loginoneclick: User with publicAddress ${publicAddress} is not found in database`,
					});

					return null;
				}

				return user;
			})
			////////////////////////////////////////////////////
			// Step 2: Verify digital signature
			////////////////////////////////////////////////////
			.then((user) => {
				if (!(user instanceof UserOneClick)) {
					// Should not happen, we should have already sent the response
					throw new Error(
						'User is not defined in "Verify digital signature".'
					);
				}

				const msg = `I am signing my one-time nonce: ${user.nonce}`;

				// We now are in possession of msg, publicAddress and signature. We
				// will use a helper from eth-sig-util to extract the address from the signature
				const msgBufferHex = ethjsutil.bufferToHex(Buffer.from(msg, 'utf8'));
				const address = ethsigutil.recoverPersonalSignature({
					data: msgBufferHex,
					sig: signature,
				});

				// The signature verification is successful if the address found with
				// sigUtil.recoverPersonalSignature matches the initial publicAddress
				if (address.toLowerCase() === publicAddress.toLowerCase()) {
					return user;
				} else {
					res.status(401).send({
						error: 'Signature verification failed',
					});

					return null;
				}
			})
			////////////////////////////////////////////////////
			// Step 3: Generate a new nonce for the user
			////////////////////////////////////////////////////
			.then((user) => {
				if (!(user instanceof UserOneClick)) {
					// Should not happen, we should have already sent the response

					throw new Error(
						'User is not defined in "Generate a new nonce for the user".'
					);
				}

				user.nonce = Math.floor(Math.random() * 10000);
				return user.save();
			})
			////////////////////////////////////////////////////
			// Step 4: Create JWT
			////////////////////////////////////////////////////
			.then( async (user) => {
				const isAdmin = await contract.methods.hasRole(publicAddress, web3.utils.fromAscii("admin")).call();
				const usrRole = isAdmin ? "admin" : "user";

				jwt.sign(
				{
					id: user._id,
					name: user.username,
					address: publicAddress,
					role: usrRole
				},
				keys.secretOrKey,
				{
					algorithm: keys.algorithms[0],
					expiresIn: 31556926
				},
				(err, token) => {
					if (err) {
						res.status(401).send({
							error: err,
						});
					}
					if (!token) {
						res.status(401).send({
							error: 'Empty token',
						});
					}
					res.json({
						success: true,
						token: "Bearer " + token
					});
				})
			})
	);
});

module.exports = router;