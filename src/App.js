import React, { Component } from "react";
import * as RealmWeb from "realm-web";
import bcrypt from "bcryptjs";
import Dhc from "./Dhc";
import "./styles.css";

class Login extends Component {
  state = {
    email: "",
    password: "",
    isPasswordShown: false,
    isCheckboxChecked: false,
    isDropdownOpen: false,
    dhcCode: "",
    dhcVerified: false,
    errorMessage: "",
    isButtonEnabled: false,
    isLoading: false
  };

  handleEmailChange = (e) => {
    const email = e.target.value;

    this.setState({ email }, () => {
      // Check if the email field is filled and update the isEmailFilled state
      const isEmailFilled = email.trim() !== "";
      this.setState({ isEmailFilled });
    });
  };

  handlePasswordChange = (e) => {
    this.setState({ password: e.target.value });
  };

  togglePasswordVisibility = () => {
    this.setState((prevState) => ({
      isPasswordShown: !prevState.isPasswordShown
    }));
  };

  handleCheckboxChange = async () => {
    const { isCheckboxChecked, dhcCode } = this.state;

    if (!isCheckboxChecked) {
      // If the checkbox is checked, verify the DHC code
      await this.verifyDHCCode();
    }

    // Update the isButtonEnabled based on the checkbox status
    this.setState((prevState) => ({
      isCheckboxChecked: !prevState.isCheckboxChecked,
      isButtonEnabled: !prevState.isCheckboxChecked
    }));
  };

  toggleDropdown = () => {
    this.setState((prevState) => ({
      isDropdownOpen: !prevState.isDropdownOpen
    }));
  };

  hashPassword = async (password) => {
    try {
      // Generate a salt with 10 rounds
      const salt = await bcrypt.genSalt(10);

      // Hash the password with the generated salt
      const hashedPassword = await bcrypt.hash(password, salt);

      console.log("Hashed Password:", hashedPassword);
      return hashedPassword;
    } catch (error) {
      console.error("Error hashing password:", error);
    }
  };

  handleFormSubmit = async (e) => {
    e.preventDefault();

    // Set isLoading to true when the login process starts
    this.setState({ isLoading: true });

    const { isCheckboxChecked, dhcVerified, email, password } = this.state;

    if (!email) {
      this.setState({ errorMessage: "Please enter your email." });
      return;
    }

    if (!password) {
      this.setState({ errorMessage: "Please enter your password." });
      return;
    }

    if (!dhcVerified) {
      this.setState({ errorMessage: "Please verify the DHC code." });
      return;
    }

    if (!isCheckboxChecked) {
      this.setState({ errorMessage: "Please verify that you're not a robot." });
      return;
    }

    this.setState({ errorMessage: "" });

    try {
      // Verify DHC Code and Email
      const app = new RealmWeb.App({ id: "easy--serve-cveoi" });
      const credentials = RealmWeb.Credentials.anonymous();
      const user = await app.logIn(credentials);
      const payload = { dhcCode: this.state.dhcCode, email };
      const response = await user.functions.verifyDHCCode(payload);
      const { verified } = response;

      if (verified) {
        console.log("DHC Code and email are verified");
        this.setState({ dhcVerified: true, errorMessage: "" });

        // Fetch countryCode and stateCode based on the verified DHC code
        const { countryCode, stateCode } = await this.getCountryAndStateCode(
          this.state.dhcCode
        );

        // Search for the user in the appropriate collection
        const userDetails = await this.searchUserInCollection(
          countryCode,
          stateCode,
          email
        );

        if (userDetails) {
          // Compare the hashed password
          const hashedPassword = await this.hashPassword(password);
          const isPasswordMatch = await bcrypt.compare(
            password,
            userDetails.password
          );

          if (isPasswordMatch) {
            console.log("Login successful!");
            alert("Login successful!"); // Display popup message
            // Handle successful login here (e.g., redirect to dashboard)
          } else {
            console.log("Incorrect password");
            this.setState({ errorMessage: "Incorrect password." });
          }
        } else {
          console.log("User not found");
          this.setState({ errorMessage: "User not found." });
        }
      } else {
        console.log("DHC Code and email are not verified");
        this.setState({ dhcVerified: false });
      }
    } catch (err) {
      console.error("Login failed", err);
      this.setState({
        errorMessage: "Login failed. Please try again later."
      });
    } finally {
      // Reset isLoading to false after login process completes
      this.setState({ isLoading: false });
    }
  };

  getCountryAndStateCode = async (dhcCode) => {
    try {
      const app = new RealmWeb.App({ id: "easy--serve-cveoi" });
      const credentials = RealmWeb.Credentials.anonymous();
      const user = await app.logIn(credentials);

      const response = await user.functions.getCountryAndStateCode(dhcCode);

      console.log("Response from server:", response); // Add this log to see the response
      if (response && response.countryCode && response.stateCode) {
        return {
          countryCode: response.countryCode,
          stateCode: response.stateCode
        };
      } else {
        console.error("Failed to get countryCode and stateCode");
        return null;
      }
    } catch (err) {
      console.error("Failed to get countryCode and stateCode", err);
      return null;
    }
  };

  searchUserInCollection = async (countryCode, stateCode, email) => {
    try {
      const app = new RealmWeb.App({ id: "easy--serve-cveoi" });
      const credentials = RealmWeb.Credentials.anonymous();
      const user = await app.logIn(credentials);

      // Call the MongoDB Realm function with the required parameters
      const response = await user.functions.searchUserInCollection(
        countryCode,
        stateCode,
        email
      );
      const userDetails = response;

      return userDetails;
    } catch (err) {
      console.error("Failed to search for user in the collection", err);
      return null;
    }
  };

  verifyDHCCode = async () => {
    const { dhcCode } = this.state;
    try {
      await this.handleVerifyDHC();
    } catch (err) {
      console.error("Failed to verify DHC Code", err);
    }
  };

  handleDHCInputChange = (e) => {
    // Allow only 4 characters as input for DHC Code
    const dhcCodeValue = e.target.value.slice(0, 4).toUpperCase();
    this.setState({ dhcCode: dhcCodeValue });
  };

  handleVerifyDHC = async () => {
    const { email, dhcCode } = this.state;

    if (!email) {
      this.setState({ errorMessage: "Please enter your email." });
      return;
    }

    if (!dhcCode) {
      this.setState({ errorMessage: "Please enter the DHC code." });
      return;
    }

    this.setState({ errorMessage: "" });

    // Verify DHC Code and Email
    try {
      const app = new RealmWeb.App({ id: "easy--serve-cveoi" });
      const credentials = RealmWeb.Credentials.anonymous();
      const user = await app.logIn(credentials);
      const payload = { dhcCode, email };
      const response = await user.functions.verifyDHCCode(payload);
      const { verified } = response;

      if (verified) {
        console.log("DHC Code and email are verified");
        this.setState({ dhcVerified: true, errorMessage: "" });
      } else {
        console.log("DHC Code and email are not verified");
        this.setState({ dhcVerified: false });
      }
    } catch (err) {
      console.error("Failed to verify DHC Code and email", err);
    }
  };

  render() {
    const {
      email,
      isEmailFilled,
      password,
      isPasswordShown,
      isCheckboxChecked,
      isDropdownOpen,
      dhcCode,
      dhcVerified,
      errorMessage,
      isButtonEnabled,
      isLoading
    } = this.state;

    return (
      <div className="App">
        <div className="limiter">
          <div className="container-login100">
            <div className="wrap-login100">
              <form
                className="login100-form validate-form"
                onSubmit={this.handleFormSubmit}
              >
                <div className="logo">
                  <img src="/images/logo.png" alt="Logo" />
                </div>
                <span className="login100-form-title p-b-26">
                  Easy Serve
                  <br />
                  <br />
                </span>

                <div className="wrap-input100 validate-input">
                  <input
                    className="input100"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={this.handleEmailChange}
                    autoComplete="off"
                    tabIndex={0}
                  />
                </div>

                {/* DHC Component */}
                <div className="wrap-input100 validate-input">
                  <input
                    className="input100"
                    placeholder="DHC Code"
                    type="dhccode"
                    value={dhcCode}
                    onChange={this.handleDHCInputChange}
                    handleDHCVerify={this.handleVerifyDHC}
                    autoComplete="off"
                    tabIndex={0}
                    disabled={!isEmailFilled}
                  />
                </div>

                <div className="wrap-input100 validate-input">
                  <input
                    className="input100"
                    placeholder="Password"
                    type={isPasswordShown ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={this.handlePasswordChange}
                    disabled={!isEmailFilled}
                  />
                  <i
                    className="fa fa-eye password-icon"
                    onClick={this.togglePasswordVisibility}
                  />
                </div>

                <div className="checkbox-container">
                  <input
                    className="checkbox-input"
                    type="checkbox"
                    id="robot-checkbox"
                    checked={isCheckboxChecked}
                    onChange={this.handleCheckboxChange}
                    disabled={!isEmailFilled}
                  />
                  <label className="checkbox-label" htmlFor="robot-checkbox">
                    I'm not a robot
                  </label>
                </div>

                {errorMessage && (
                  <p className="error-message">{errorMessage}</p>
                )}

                <div className="container-login100-form-btn">
                  <div className="wrap-login100-form-btn">
                    <div className="login100-form-bgbtn" />
                    {/* Show buffering sign when isLoading is true */}
                    {isLoading ? (
                      <div className="buffering-sign">Loading...</div>
                    ) : (
                      <button
                        className={`login100-form-btn ${
                          isButtonEnabled ? "" : "disabled"
                        }`}
                        type="submit"
                        disabled={!isButtonEnabled || !isEmailFilled} // Disable the login button until the email field is filled
                      >
                        Login
                      </button>
                    )}
                  </div>
                </div>
              </form>
              <button
                className="link-btn"
                onClick={() => this.props.onFormSwitch("Forgot Password")}
              >
                Forgot Password?
              </button>
              <button
                className="link-btn"
                onClick={() => this.props.onFormSwitch("register")}
              >
                Don't have an account? Register here
              </button>
            </div>
            <div className={`dropdown-menu ${isDropdownOpen ? "open" : ""}`}>
              <ul>
                <li>
                  <a href="https://www.youtube.com/watch?v=SqcY0GlETPk&t=2s">
                    React Tutorial
                  </a>
                </li>
                <li>
                  <a href="https://www.youtube.com/watch?v=W6NZfCO5SIk">
                    JavaScript Tutorial
                  </a>
                </li>
                <li>
                  <a href="https://www.youtube.com/watch?v=qz0aGYrrlhU">
                    HTML&CSS Tutorial
                  </a>
                </li>
              </ul>
            </div>
            <div
              className={`dropdown-toggle ${isDropdownOpen ? "open" : ""}`}
              onClick={this.toggleDropdown}
            >
              <div className="dropdown-icon"></div>
              <div className="dropdown-icon"></div>
              <div className="dropdown-icon"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;
