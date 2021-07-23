const ethsigutil = require('eth-sig-util');
const ethjsutil = require('ethereumjs-util');
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const jwt_decode = require("jwt-decode");
  
// Load input validation
const validateRegisterInput = require("../validation/register");
const validateLoginInput = require("../validation/login");

// Load User and UserOneClick models
const UserOneClick = require("../models/UserOneClick");

// @route GET api/users
// @desc Find users
// @access Public
router.get("/", (req, res) => {
  // If a query string ?publicAddress=... is given, then filter results
  // const whereClause = req.query && req.query.publicAddress ? { where: { address: req.query.publicAddress }, } : undefined;
  const whereClause = req.query && req.query.publicAddress ? { address: req.query.publicAddress } : undefined;

  return UserOneClick.find(whereClause)
    .then((users) => res.json(users))
    .catch(err => console.log(err));
});

// @route POST api/users
// @desc Create user
// @access Public
router.post("/", (req, res) => {
  UserOneClick.create(req.body)
    .then((user) => res.json(user))
    .catch(err => console.log(err));
});

// @route GET api/users/:userid
// @desc Find user id
// @access Public
router.get("/:userid", (req, res) => {
    const decoded = jwt_decode(req.headers.authorization);
	if (decoded.payload.id !== req.params.userid) {
    	return res
			.status(401)
			.send({ error: 'You can can only access yourself' });
	}
	return UserOneClick.findById(req.params.userid)
		.then((user) => res.json(user))
		.catch(err => console.log(err));
});
  
  // @route PATCH api/users/:userid
  // @desc Update user
  // @access Public
  router.patch("/:userid", (req, res) => {
    const decoded = jwt_decode(req.headers.authorization);
    // Only allow to fetch current user
	if (decoded.payload.id !== req.params.userid) {
		return res
			.status(401)
			.send({ error: 'You can can only access yourself' });
	}
	return UserOneClick.findById(req.params.userid)
		.then((user) => {
			if (!user) {
				return user;
			}

			Object.assign(user, req.body);
			return user.save();
		})
		.then((user) => {
			return user
				? res.json(user)
				: res.status(401).send({
						error: `User with publicAddress ${req.params.userId} is not found in database`,
				  });
		})
		.catch(err => console.log(err));
  });

module.exports = router;