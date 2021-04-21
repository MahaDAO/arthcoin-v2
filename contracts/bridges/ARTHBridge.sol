// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTH} from "../interfaces/IARTH.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {AccessControl} from "../access/AccessControl.sol";

contract ARTHBridge is AccessControl {
    using SafeMath for uint256;

    /// @dev Bridge token.
    IARTH private _arth;

    address public owner;
    address public timelock;

    uint256 public cumulativeDeposits;
    uint256 public cumulativeWithdrawals;

    event receivedDeposit(uint256 chainId, string to, uint256 amountD18);

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == timelock || msg.sender == owner,
            "ARTHBridge: FORBIDDEN"
        );
        _;
    }

    constructor(
        IARTH arth,
        address owner_,
        address timelock_
    ) {
        _arth = arth;

        owner = owner_;
        timelock = timelock_;

        _setupRole(DEFAULT_ADMIN_ROLE, owner);
    }

    /// @notice Needed for compatibility to use poolMint()
    function getCollateralGMUBalance() public pure returns (uint256) {
        return 0;
    }

    function depositARTH(
        uint256 chainId,
        string memory to,
        uint256 amountD18
    ) external {
        _arth.transferFrom(msg.sender, address(this), amountD18);

        cumulativeDeposits = cumulativeDeposits.add(amountD18);

        _arth.poolBurnFrom(address(this), amountD18);
        emit receivedDeposit(chainId, to, amountD18);
    }

    function withdrawARTH(address _to, uint256 amountD18)
        external
        onlyByOwnerOrGovernance
    {
        cumulativeWithdrawals = cumulativeWithdrawals.add(amountD18);

        _arth.poolMint(_to, amountD18);
    }
}
