// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from "./IERC20.sol";
import {IIncentiveController} from "./IIncentive.sol";
import {IAnyswapV4ERC20} from "./IAnyswapV4ERC20.sol";

interface IARTH is IERC20, IAnyswapV4ERC20 {
    function addPool(address pool) external;

    function removePool(address pool) external;

    function setGovernance(address newGovernance) external;

    function poolMint(address who, uint256 amount) external;

    function poolBurnFrom(address who, uint256 amount) external;

    function setIncentiveController(IIncentiveController controller) external;

    function getGenesisSupply() external pure returns (uint256);

    function pools(address pool) external view returns (bool);

    function getPool(uint256 index) external view returns (address);

    function getAllPoolsCount() external view returns (uint256);
}
