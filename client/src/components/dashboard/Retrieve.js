import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { logoutUser } from "../../actions/authActions";
import { Link } from "react-router-dom";
import { SHA3 } from 'sha3';
import crypto from "crypto";
import { uploadFileIPFS, retrieveFileIOTA } from "../../actions/ipfsActions";
import axios from "axios";

class Retrieve extends Component {
  constructor(props) {
    super(props);

    //this._configuration = ServiceFactory.get<ConfigurationService<IConfiguration>>("configuration").get();
    //this._apiClient = new ApiClient(this._configuration.apiEndpoint);
    //this._ipfsService = ServiceFactory.get<IpfsService>("ipfs");

    this.state = {
        isBusy: false,
        isValid: false,
        isErrored: false,
        status: "",
        fileName: "",
        fileDescription: "",
        fileSize: undefined,
        fileModified: undefined,
        fileAlgorithm: undefined,
        fileHash: "",
        fileBuffer: undefined,
        messageId: this.props.match.params &&
            this.props.match.params.messageId === undefined ? "" : this.props.match.params.messageId,
        ipfsHash: ""
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
        await this.retrieveFile();
    }
  }

  /**
  * Validate the data in the form.
  * @returns True if the data is valid.
  */
  validateData() {
    const isValid = /^[\da-z]{64}/.test(this.state.messageId) && this.state.messageId.length === 64;
    this.setState({ isValid, status: "" });
    return isValid;
  }  

  /**
  * Validate the file using the API.
  */
  async retrieveFile() {
    this.setState(
        {
            isBusy: true,
            status: "Loading file data from the Tangle, please wait...",
            isErrored: false
        },
        async () => {
            const response = await this.props.retrieveFileIOTA({
                messageId: this.state.messageId || ""
            });
            console.log("Response from Retrieve: " + JSON.stringify(response));
            if (response.success) {
                this.setState(
                    {
                        isBusy: true,
                        status: "Loading file from IPFS, please wait...",
                        isErrored: false,
                        fileName: response.name,
                        fileSize: response.size,
                        fileModified: response.modified ? new Date(response.modified) : new Date(0),
                        fileDescription: response.description,
                        fileAlgorithm: response.algorithm,
                        fileHash: response.hash,
                        ipfsHash: response.ipfs
                    },
                    async () => {
                        let ipfsFileHash;
                        try {
                            if (response.ipfs) {
                                const buffer = await this.retrieveFileIPFS(response.ipfs);

                                if (buffer && response.algorithm) {
                                    if (response.algorithm === "sha256") {
                                        const hashAlgo = crypto.createHash(response.algorithm);
                                        hashAlgo.update(buffer);
                                        ipfsFileHash = hashAlgo.digest("hex");
                                    } else {
                                        const hashAlgo = new SHA3(256);
                                        hashAlgo.update(buffer);
                                        ipfsFileHash = hashAlgo.digest("hex");
                                    }

                                    if (ipfsFileHash === response.hash) {
                                        this.setState({
                                            isBusy: false,
                                            status: "",
                                            isErrored: false,
                                            fileBuffer: buffer,
                                            ipfsFileHash: ipfsFileHash
                                        });
                                    } else {
                                        throw new Error(
                                            `The hash of the file loaded from IPFS does not match`
                                            + `the data stored on the Tangle`
                                        );
                                    }
                                } else {
                                    throw new Error("Could not load file from IPFS");
                                }
                            } else {
                                throw new Error("IPFS hash is missing from response");
                            }
                        } catch (err) {
                            this.setState({
                                isBusy: false,
                                status: err.message,
                                isErrored: true,
                                ipfsFileHash: ipfsFileHash
                            });
                        }
                    });
            } else {
                this.setState({
                    isBusy: false,
                    status: response.message,
                    isErrored: true
                });
            }
        });
  }

  /**
  * Reset the state of the component.
  */
  resetState() {
    this.setState(
        {
            isBusy: false,
            isValid: false,
            isErrored: false,
            status: "",
            fileName: "",
            fileDescription: "",
            fileSize: undefined,
            fileModified: undefined,
            fileAlgorithm: undefined,
            fileHash: "",
            fileBuffer: undefined,
            messageId: "",
            ipfsHash: ""
        },
        () => {
            this.validateData();
            //ScrollHelper.scrollRoot();
        });
  }

  //Retrieve file data
  async retrieveFileIPFS(fileHash) {
    const ipfsPath = "https://ipfs.io/ipfs/:hash".replace(":hash", fileHash); 
    try {
      const axiosResponse = await axios.get(ipfsPath, {
           responseType: "arraybuffer"
      });
      return Buffer.from(axiosResponse.data);
    } catch (err) {
      
    }      
  }

  render() {
    const { user } = this.props.auth;

    return (
        <div>
        {!this.state.fileName && (
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
                <h4 className="flow-text grey-text text-darken-1">Retrieve File</h4>
                <p className="grey-text text-darken-1">Please enter the message id of the file to retrieve from the Tangle and IPFS.</p>
                <tr className="link grey-text">
                  <td>Message ID: </td>
                  <td></td>
                  <td style={{width: "800px"}}><input className="link grey-text" type="text" placeholder="Please enter the message id" value={this.state.messageId}
                    onChange={e => this.setState({ messageId: e.target.value }, () => this.validateData())} readOnly={this.state.isBusy}/></td>
                  <td><button style={{width: "180px", borderRadius: "3px", letterSpacing: "1.5px", marginTop: "1rem"}}
                    disabled={!this.state.isValid || this.state.isBusy} onClick={async () => this.retrieveFile()} className="btn btn-large waves-effect waves-light hoverable blue accent-3">
                    Retrieve
                    </button>
                  </td>
                  </tr>
              </div>
            </div>
          </div>
        </div>
        )}
        {this.state.fileName && (
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
                <h4 className="flow-text grey-text text-darken-1">File Validated</h4>
                  <p>The file data has successfully been retrieved from the Tangle.</p>
                  <tr className="link grey-text">
                    <td>Name: </td>
                    <td></td>
                    <td>{this.state.fileName}</td>
                    </tr>
                  <tr className="link grey-text">
                    <td>Description: </td>
                    <td></td>
                    <td>{this.state.fileDescription}</td>
                    </tr>
                  <tr className="link grey-text">
                    <td>Size: </td>
                    <td></td>
                    <td>{this.state.fileSize} bytes</td>
                    </tr>
                  {this.state.fileModified && (
                    <tr className="link grey-text">
                      <td>Modified Date: </td>
                      <td></td>
                      <td>{this.state.fileName}</td>
                      </tr>
                  )}
                  <tr className="link grey-text">
                    <td>Algorithm: </td>
                    <td></td>
                    <td>{this.state.fileAlgorithm}</td>
                    </tr>
                  <tr className="link grey-text">
                    <td>Hash: </td>
                    <td></td>
                    <td>{this.state.fileHash}</td>
                    </tr>
                  {this.state.ipfsHash && (
                    <tr className="link grey-text">
                      <td>IPFS Hash: </td>
                      <td></td>
                      <td>{this.state.ipfsHash}</td>
                      </tr>
                  )}
                  {this.state.ipfsFileHash && (
                    <tr className="link grey-text">
                      <td>IPFS File Hash: </td>
                      <td></td>
                      <td>{this.state.ipfsFileHash}</td>
                      </tr>
                  )}
                  {this.state.fileBuffer && (
                    <div>
                        <button
                            color="secondary"
                            long={true}
                            disableCaseStyle={true}
                            onClick={() => this._ipfsService.exploreFile(this.state.ipfsHash)}
                        >
                        {this.state.ipfsHash}
                        </button>
                        &nbsp;&nbsp;&nbsp;
                        <button
                            color="secondary"
                            //onClick={() => ClipboardHelper.copy(this.state.ipfsHash)}
                        >
                        Copy IPFS Hash
                        </button>
                  </div>
                  )}
                  <button color="primary" onClick={() => this.resetState()}>Retrieve Another File</button>
            </div>
          </div>
          </div>
          </div>
        )}
        </div>
    );
  }
}

Retrieve.propTypes = {
  logoutUser: PropTypes.func.isRequired,
  uploadFileIPFS: PropTypes.func.isRequired, 
  retrieveFileIOTA: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(
  mapStateToProps,
  { logoutUser, uploadFileIPFS, retrieveFileIOTA }
)(Retrieve);