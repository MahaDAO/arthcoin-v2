// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IIncentiveController} from './IIncentive.sol';

interface IARTH {
    function addPool(address pool) external;

    function removePool(address pool) external;

    function setGovernance(address _governance) external;

    function poolMint(address who, uint256 amount) external;

    function poolBurnFrom(address who, uint256 amount) external;

    function setIncentiveController(IIncentiveController _incentiveController)
        external;

    function genesisSupply() external view returns (uint256);
}
