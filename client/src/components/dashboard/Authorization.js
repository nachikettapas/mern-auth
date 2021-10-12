import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { assignRole, removeRole } from "../../actions/userActions";
import { logoutUser } from "../../actions/authActions";
import { Link } from "react-router-dom";
import { SHA3 } from 'sha3';
import crypto from "crypto";
import axios from "axios";
import {Redirect} from "react-router-dom";
const adminAddress = "0xccf20e63B3cFe990B997D9AeEABf5f2222BaC9Ff";

class Authorization extends Component {
  constructor(props) {
    super(props);

    this.state = {
        isBusy: false,
        isValid: false,
        isErrored: false,
        status: "",
        address: ""
    };
  }

  onLogoutClick = e => {
    e.preventDefault();
    this.props.logoutUser();
  };
  
  /**
  * The component mounted.
  */
  async componentDidMount() {
    if (this.validateData()) {
        await this.authorizeUser();
    }
  }

  /**
  * Validate the data in the form.
  * @returns True if the data is valid.
  */
  validateData() {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(this.state.address);
    this.setState({ isValid, status: "" });
    return isValid;
  }  

  /**
  * Authorize the user
  */
  async authorizeUser() {
    this.setState({
        isBusy: true,
        status: "Authorizing user...",
        isErrored: false
    },
    async () => {
        const result = await this.props.assignRole({ address: this.state.address || "" });
        if(result.code == 1) {
            alert(result.message);
            this.setState({
                isBusy: false,
                status: "User authorized.",
                isErrored: false,
                address: this.state.address
            })
        } else {
            alert(result.message);
            this.setState({
                isBusy: false,
                status: result.message,
                isErrored: false
            })
        }
    });
  }

  /**
  * Remove the authorization from the user.
  */
   unauthorizeUser = async (address) => {
        if(address.toLowerCase() === adminAddress.toLowerCase()) {
            this.setState({
                isBusy: true,
                status: "Un-authorizing user...",
                isErrored: false
            },
            async () => {
                const result = await this.props.removeRole({ address: this.state.address || "" });
                if(result.code == 1) {
                    alert(result.message);
                    this.setState({
                        isBusy: false,
                        status: "User un-authorized.",
                        isErrored: false,
                        address: this.state.address
                    })
                } else {
                    alert(result.message);
                    this.setState({
                        isBusy: false,
                        status: result.message,
                        isErrored: false
                    })
                }
            })
        } else {
            alert("Only administrator can demote a user.");
            this.setState({
                isBusy: false,
                status: "Only administrator can demote a user.",
                isErrored: false,
                address: this.state.address
            });
        }
  }

  render() {
    const { user } = this.props.auth;
    const role = user.role;

    if(role === "user") {
      return <Redirect to={"/retrieve"}/>
    }

    return (
        <div>
          <nav className="white">
            <div className="nav-wrapper">
              <ul id="nav-mobile" className="left hide-on-med-and-down">
                <li><Link className="link grey-text" to="/">Upload File</Link></li>
                <li><Link className="link grey-text" to="/retrieve">Retrieve File</Link></li>
                <li><Link className="link grey-text" onClick={this.onLogoutClick}>Logout</Link></li>
              </ul>
            </div>
          </nav>
          <div style={{ height: "75vh" }} className="container">
            <div className="row">
              <div className="col s12">
                <h4 className="flow-text grey-text text-darken-1">Authorize User</h4>
                <p className="grey-text text-darken-1">Please enter the address of the user to whom the admin role needs to be assigned.</p>
                <tr className="link grey-text">
                  <td>Address: </td>
                  <td></td>
                  <td style={{width: "800px"}}><input className="link grey-text" type="text" placeholder="Please enter the message id" value={this.state.address}
                    onChange={e => this.setState({ address: e.target.value }, () => this.validateData())} readOnly={this.state.isBusy}/></td>
                  <td><button style={{width: "180px", borderRadius: "3px", letterSpacing: "1.5px", marginTop: "1rem"}}
                    disabled={!this.state.isValid || this.state.isBusy} onClick={async () => this.authorizeUser()} className="btn btn-large waves-effect waves-light hoverable blue accent-3">
                    Authorize
                    </button>
                  </td>
                  <td><button style={{width: "180px", borderRadius: "3px", letterSpacing: "1.5px", marginTop: "1rem"}}
                    disabled={!this.state.isValid || this.state.isBusy} onClick={async () => this.unauthorizeUser(user.address)} className="btn btn-large waves-effect waves-light hoverable blue accent-3">
                    Un-authorize
                    </button>
                  </td>
                  </tr>
              </div>
            </div>
          </div>
        </div>
    );
  }
}

Authorization.propTypes = {
  logoutUser: PropTypes.func.isRequired,
  assignRole: PropTypes.func.isRequired,
  removeRole: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(
  mapStateToProps,
  { logoutUser, assignRole, removeRole }
)(Authorization);