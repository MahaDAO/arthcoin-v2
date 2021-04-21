// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../IERC20.sol";

// Some functions were omitted for brevity. See the contract for details

interface IFNXIntegratedStake {
    function stake(
        address[] memory fpta_tokens,
        uint256[] memory fpta_amounts,
        address[] memory fptb_tokens,
        uint256[] memory fptb_amounts,
        uint256 lockedPeriod
    ) external;
}
