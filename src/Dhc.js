import React from "react";

const Dhc = ({
  dhcCode,
  dhcVerified,
  handleDHCInputChange,
  isCheckboxChecked
}) => {
  return (
    <div>
      <div className="wrap-input100 validate-input">
        <input
          className="input100"
          placeholder="DHC Code"
          type="text"
          value={dhcCode}
          onChange={handleDHCInputChange}
          autoComplete="off"
        />
      </div>
      {isCheckboxChecked && dhcVerified && <p>DHC Code is verified</p>}
      {isCheckboxChecked && !dhcVerified && dhcCode && (
        <p>DHC Code is not verified</p>
      )}
    </div>
  );
};

export default Dhc;
