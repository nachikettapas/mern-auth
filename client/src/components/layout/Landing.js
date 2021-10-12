import React, { Component } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { oneClickLoginUser, setUserLoading, checkUser } from "../../actions/userActions";
import Web3 from 'web3';

var web3 = undefined;

class Landing extends Component {

  constructor() {
    super();
    this.state = {
      errors: {}
    };
  }

  componentDidMount() {
    // If logged in and user navigates to Register page, should redirect them to dashboard
    if (this.props.auth.isAuthenticated) {
      this.props.history.push("/dashboard");
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.auth.isAuthenticated) {
      this.props.history.push("/dashboard"); // push user to dashboard when they login
    }
    if (nextProps.errors) {
      this.setState({
        errors: nextProps.errors
      });
    }
  }

  onSubmit = async (e) => {
    e.preventDefault();
    // Check if MetaMask is installed
		if (!(window).ethereum) {
			window.alert('Please install MetaMask first.');
			return;
		}

		if (!web3) {
			try {
				// Request account access if needed
				await (window).ethereum.enable();

				// We don't know window.web3 version, so we use our own instance of Web3
				// with the injected provider given by MetaMask
				web3 = new Web3((window).ethereum);
			} catch (error) {
				window.alert('You need to allow MetaMask.');
				return;
			}
		}

		const coinbase = await web3.eth.getCoinbase();
		if (!coinbase) {
			window.alert('Please activate MetaMask first.');
			return;
		}

		const publicAddress = coinbase.toLowerCase();
    this.props.setUserLoading();

		var nonce = Math.floor( Math.random() * 10000);

    const user = {
      publicAddress: publicAddress,
      nonce: nonce
    };

    const verifiedUser = await this.props.checkUser(user);
        
    var signature = undefined;
    try {
			signature = await web3.eth.personal.sign(
				`I am signing my one-time nonce: ${verifiedUser.nonce}`,
				publicAddress,
				'' // MetaMask will ignore the password argument here
			);
		} catch (err) {
			throw new Error(
				'You need to sign the message to be able to log in.'
			);
		}

    const userData = {
      publicAddress: publicAddress,
      signature: signature
    };

    this.props.oneClickLoginUser(userData); // since we handle the redirect within our component, we don't need to pass in this.props.history as a parameter
  };


  render() {
    const { errors } = this.state;
    return (
      <div style={{ height: "75vh" }} className="container valign-wrapper">
        <div className="row">
          <div className="col s12 center-align">
            <h4>
              <b>Build</b> a login/auth app with the{" "}
              <span style={{ fontFamily: "monospace" }}>MERN</span> stack from
              scratch
            </h4>
            <p className="flow-text grey-text text-darken-1">
              Create a (minimal) full-stack app with user authentication via
              passport and JWTs
            </p>
            <br />
            {/* <div className="col s4">
              <Link
                to="/register"
                style={{
                  width: "140px",
                  borderRadius: "3px",
                  letterSpacing: "1.5px"
                }}
                className="btn btn-large waves-effect waves-light hoverable blue accent-3"
              >
                Register
              </Link>
            </div> */}
            <div class="col s4 offset-s4">
              <Link
                to="/loginoneclick"
                style={{
                  width: "220px",
                  borderRadius: "3px",
                  letterSpacing: "1.5px"
                }}
                className="btn btn-large waves-effect waves-light hoverable blue accent-3"
                onClick={this.onSubmit}
              >
                Log In One-Click
              </Link>
            </div>
            {/* <div className="col s4">
              <Link
                to="/login"
                style={{
                  width: "140px",
                  borderRadius: "3px",
                  letterSpacing: "1.5px"
                }}
                className="btn btn-large waves-effect waves-light hoverable blue accent-3"
              >
                Log In
              </Link>
            </div> */}
          </div>
        </div>
      </div>
    );
  }
}

Landing.propTypes = {
  oneClickLoginUser: PropTypes.func.isRequired,
  setUserLoading: PropTypes.func.isRequired,
  checkUser: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth,
  errors: state.errors
});

export default connect(
  mapStateToProps,
  { oneClickLoginUser, setUserLoading, checkUser }
)(Landing);