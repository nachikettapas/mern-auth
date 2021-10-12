const ethsigutil = require('eth-sig-util');
const ethjsutil = require('ethereumjs-util');
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const jwt_decode = require("jwt-decode");
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
router.post("/", async (req, res) => {
  //Code to assign default role ("user") to the user. A user with admin access would be 
  //required to promote the privileges of a normal user.
  const memAddr = req.body.address;
  const isUser = await contract.methods.hasRole(memAddr, web3.utils.fromAscii("user")).call();

  if(!isUser)
  	contract.methods.addMember(memAddr, web3.utils.fromAscii("user")).send({ from: adminAddress });

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

  router.post("/authorizeuser", async (req, res) => {
	//Code to assign default role ("user") to the user. A user with admin access would be 
	//required to promote the privileges of a normal user.
	const memAddr = req.body.address.address;
	const isUser = await contract.methods.hasRole(memAddr, web3.utils.fromAscii("user")).call();
	const isAdmin = await contract.methods.hasRole(memAddr, web3.utils.fromAscii("admin")).call();
	
	if(isUser && !isAdmin) {
		await contract.methods.addMember(memAddr, web3.utils.fromAscii("admin")).send({ from: adminAddress });

		res.json({
			message: "Admin priviledge granted."
		})
	} else if(isAdmin) {
		res.json({
			message: "User already an admin."
		})
	} else {
		res.json({
			message: "User does not exist."
		})
	}
  });

  router.post("/unauthorizeuser", async (req, res) => {
	//Code to assign default role ("user") to the user. A user with admin access would be 
	//required to promote the privileges of a normal user.
	const memAddr = req.body.address.address;
	const isAdmin = await contract.methods.hasRole(memAddr, web3.utils.fromAscii("admin")).call();
	
	if(isAdmin) {
		await contract.methods.removeMember(memAddr, web3.utils.fromAscii("admin")).send({ from: adminAddress });

		res.json({
			message: "Admin priviledge removed.",
			code: 1
		})
	} else {
		res.json({
			message: "User does not have admin priviledges.",
			code: 0
		})
	}
  });
  
module.exports = router;