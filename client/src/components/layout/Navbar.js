import React, { Component } from "react";
import { Link } from "react-router-dom";

class Navbar extends Component {
  render() {
    return (
      <div className="navbar-fixed">
        <nav className="navbar navbar-expand navbar-dark bg-dark">
          <div className="nav-wrapper blue">
            <Link to="/" style={{ fontFamily: "monospace" }} className="col s5 brand-logo center black-text">
              <i className="material-icons">dashboard_customize</i> Multi-Blockchain
            </Link>
          </div>
        </nav>
      </div>
    );
  }
}

export default Navbar;