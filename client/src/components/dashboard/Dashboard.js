import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { logoutUser } from "../../actions/authActions";
import { Link } from "react-router-dom";
import { SHA3 } from 'sha3';
import crypto from "crypto";
import { uploadFileIPFS } from "../../actions/ipfsActions";

class Dashboard extends Component {
  /**
     * The maximum file size we want to accept.
     */
  static BYTES_PER_MEGABYTE = 1048576;

  constructor(props) {
    super(props);

    // this._configuration = ServiceFactory.get<ConfigurationService<IConfiguration>>("configuration").get();
    // this._apiClient = new ApiClient(this._configuration.apiEndpoint);
    // this._ipfsService = ServiceFactory.get<IpfsService>("ipfs");
    // this._tangleExplorerService = ServiceFactory.get<TangleExplorerService>("tangleExplorer");

    const maxSize = Dashboard.BYTES_PER_MEGABYTE / 2;

    const maxSizeString = maxSize >= Dashboard.BYTES_PER_MEGABYTE
             ? `${(maxSize / Dashboard.BYTES_PER_MEGABYTE).toFixed(1)} Mb`
             : `${(maxSize / 1024)} Kb`;

    this.state = {
        isBusy: false,
        isValid: false,
        isErrored: false,
        status: "",
        fileName: "",
        fileDescription: "",
        fileSize: undefined,
        fileModified: undefined,
        fileAlgorithm: "sha3",
        fileHash: "",
        fileBuffer: undefined,
        messageId: "",
        ipfsHash: "",
        maxSize: 1048576
    };
  }

  onLogoutClick = e => {
    e.preventDefault();
    this.props.logoutUser();
  };

  /**
     * Validate the data in the form.
     * @returns True if the data is valid.
     */
  validateData() {
    const isValid =
        this.state.fileName.length > 0 &&
        this.state.fileDescription.trim().length > 0 &&
        this.state.fileSize !== undefined &&
        this.state.fileSize > 0 &&
        this.state.fileSize < Dashboard.BYTES_PER_MEGABYTE;
    this.setState({ isValid, status: "" });
    return isValid;
  }

  /**
  * Open a document and get its details.
  */
  chooseFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "";
    input.onchange = () => {
        if (input.files && input.files.length > 0) {
            const inputFile = input.files[0];
            try {
                const fileReader = new FileReader();
                fileReader.onloadend = () => {
                    if (fileReader.result) {
                        const buffer = Buffer.from(fileReader.result);

                        this.setState(
                            {
                                fileName: inputFile.name,
                                fileSize: inputFile.size,
                                fileModified: new Date(inputFile.lastModified),
                                fileBuffer: buffer
                            },
                            () => {
                                this.setAlgorithm(this.state.fileAlgorithm || "sha256");
                                this.validateData();
                            }
                            );
                    }
                };
                fileReader.readAsArrayBuffer(input.files[0]);
            } catch (err) {
            }
        } else {
        }
    };
    input.click();
  }

  /**
     * Set the hash algorithm
     * @param algo The algorithm
     */
  setAlgorithm(algo) {
    if (this.state.fileBuffer) {
        let finalHash;

        if (algo === "sha256") {
            const hashAlgo = crypto.createHash(algo);
            hashAlgo.update(this.state.fileBuffer);
            finalHash = hashAlgo.digest("hex");
        } else {
            const hashAlgo = new SHA3(256);
            hashAlgo.update(this.state.fileBuffer);
            finalHash = hashAlgo.digest("hex");
        }

        this.setState({
            fileAlgorithm: algo,
            fileHash: finalHash
        });
    }
  }

  /**
     * Upload the file to the API.
     */
  async uploadFile() {
    this.setState(
        {
            isBusy: true,
            status: "Uploading file, please wait...",
            isErrored: false
        },
        async () => {
            const response = await this.props.uploadFileIPFS({
                name: this.state.fileName || "",
                description: this.state.fileDescription || "",
                size: this.state.fileSize || 0,
                modified: (this.state.fileModified || new Date()).toISOString(),
                algorithm: this.state.fileAlgorithm,
                hash: this.state.fileHash || "",
                data: (this.state.fileBuffer || Buffer.from("")).toString("base64")
            });

            if (response.success) {
                this.setState({
                    isBusy: false,
                    status: "",
                    isErrored: false,
                    messageId: response.messageId,
                    ipfsHash: response.ipfs
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
            fileHash: "",
            fileBuffer: undefined,
            messageId: "",
            ipfsHash: ""
        },
        () => {
            this.validateData();
            // ScrollHelper.scrollRoot();
        });
  }

  /**
  * Open a hash in the explorer.
  * @param fileHash The file hash.
  */
  exploreFile(fileHash) {
    if (fileHash) {
      const ipfsPath = "https://ipfs.io/ipfs/:hash".replace(":hash", fileHash); 
      window.open(ipfsPath, "_blank");
    }
  }

/**
  * Open a message in the explorer.
  * @param messageId The id of the message.
  */
  message(messageId) {
  if (messageId) {
      const tanglePath = {
                            "messages": "https://explorer.iota.org/testnet/message/:messageId"
                          };
      const tangleMessage = tanglePath.messages.replace(":messageId", messageId);
      window.open(tangleMessage, "_blank");
  }
}

  render() {
    const { user } = this.props.auth;

    return (
      <div>
      {!this.state.messageId && (
      <div>
        <nav className="white">
          <div className="nav-wrapper">
            <ul id="nav-mobile" className="left hide-on-med-and-down">
              <li><Link className="link grey-text" to="/">Upload File</Link></li>
              <li><Link className="link grey-text" to="/retrieve">Retrieve File</Link></li>
            </ul>
          </div>
        </nav>
        <div style={{ height: "75vh" }} className="container">
          <div className="row">
            <div className="col s12">
              <h4 className="flow-text grey-text text-darken-1">Upload File</h4>
              <p className="grey-text text-darken-1">Please select the file you want to upload to the Tangle and IPFS.<br />
              The file must be greater than 0 bytes and less than 2 MB in size.<br />
              This limit is imposed by this demonstration, IPFS has no real limits in this respect.</p>
              <tr className="link grey-text">
                <td>File: </td>
                <td></td>
                <td style={{width: "800px"}}><input className="link grey-text" type="text" placeholder="Please choose a file to upload" value={this.state.fileName} readOnly={true}/></td>
                <td><button style={{width: "180px", borderRadius: "3px", letterSpacing: "1.5px", marginTop: "1rem"}}
                  type="submit" onClick={this.chooseFile} className="btn btn-large waves-effect waves-light hoverable blue accent-3">
                  Choose File
                  </button>
                </td>
                </tr>
                {this.state.fileName &&  
                  <tr className="link grey-text">
                    <td>Size: </td>
                    <td></td>
                    <td>{this.state.fileSize} bytes</td>
                    </tr>
                }
                {this.state.fileName &&  
                  <tr className="link grey-text">
                    <td>Modified Date: </td>
                    <td></td>
                    <td>{this.state.fileModified && this.state.fileModified.toISOString()}</td>
                    </tr>
                }
                {this.state.fileName &&  
                  <tr className="link grey-text">
                    <td>Algorithm: </td>
                    <td></td>
                    <td>
                      <span>
                        <button
                          // className="btn btn-large waves-effect waves-light hoverable blue accent-3"
                          size="small"
                          disabled={this.state.isBusy}
                          color={this.state.fileAlgorithm === "sha3" ? "primary" : "secondary"}
                          onClick={() => this.setAlgorithm("sha3")}>
                          SHA3
                          </button>
                          &nbsp;&nbsp;&nbsp;      
                        <button
                          // className="btn btn-large waves-effect waves-light hoverable blue accent-3"
                          size="small"
                          disabled={this.state.isBusy}
                          color={this.state.fileAlgorithm === "sha256" ? "primary" : "secondary"}
                          onClick={() => this.setAlgorithm("sha256")}>
                          SHA256
                          </button>
                        </span>
                      </td>
                      </tr>
                }
                {this.state.fileName &&  
                  <tr className="link grey-text">
                    <td>Hash: </td>
                    <td></td>
                    <td>
                      <span>{this.state.fileHash}</span>
                      </td>
                    </tr>
                }
              <tr className="link grey-text">
                <td>Description: </td>
                <td></td>
                <td style={{width: "800px"}}><input className="link grey-text" type="text" onChange={e => this.setState(
                                        { fileDescription: e.target.value }, () => this.validateData())} placeholder="Please describe the file"/></td>
                <td></td>
                </tr>
              <tr className="link grey-text">
                <td></td>
                <td></td>
                <td><button style={{width: "180px", borderRadius: "3px", letterSpacing: "1.5px", marginTop: "1rem"}}
                  type="submit" onClick={async () => this.uploadFile()} className="btn btn-large waves-effect waves-light hoverable blue accent-3">
                  Upload
                  </button>     
                </td>
                <td></td>
                </tr> 
            </div>
          </div>
        </div>
      </div>
      )}
      {this.state.messageId && (
        <div>
        <nav className="white">
          <div className="nav-wrapper">
            <ul id="nav-mobile" className="left hide-on-med-and-down">
              <li><Link className="link grey-text" to="/">Upload File</Link></li>
              <li><Link className="link grey-text" to="/retrieve">Retrieve File</Link></li>
            </ul>
          </div>
        </nav>
        <div style={{ height: "75vh" }} className="container">
          <div className="row">
            <div className="col s12">
              <h4 className="flow-text grey-text text-darken-1">File Uploaded</h4>
                <p>The file has successfully been added to the Tangle and IPFS.</p>
                <p>You can view the message on the Tangle here.</p>
                <div>
                    <button
                        color="secondary"
                        long={true}
                        onClick={() => this.message(this.state.messageId)}
                    >
                        {this.state.messageId}
                    </button>
                    &nbsp;&nbsp;&nbsp;      
                    <button
                        color="secondary"
                        // onClick={() => ClipboardHelper.copy(this.state.messageId)}
                    >
                        Copy Tangle Hash
                    </button>
                </div>
                <p>A public gateway for the file is linked below, the file may not be available immediately
                    as it takes time to propogate through the IPFS network.</p>
                <div>
                    <button
                        color="secondary"
                        long={true}
                        disableCaseStyle={true}
                        onClick={() => this.exploreFile(this.state.ipfsHash)}
                    >
                        {this.state.ipfsHash}
                    </button>
                    &nbsp;&nbsp;&nbsp;      
                    <button
                        color="secondary"
                        // onClick={() => ClipboardHelper.copy(this.state.ipfsHash)}
                    >
                        Copy IPFS Hash
                    </button>
                </div>
                <br />
                <button color="primary" onClick={() => this.resetState()}>Upload Another File</button>
          </div>
        </div>
        </div>
        </div>
      )}
      </div>
    );
  }
}

Dashboard.propTypes = {
  logoutUser: PropTypes.func.isRequired,
  uploadFileIPFS: PropTypes.func.isRequired, 
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(
  mapStateToProps,
  { logoutUser, uploadFileIPFS }
)(Dashboard);