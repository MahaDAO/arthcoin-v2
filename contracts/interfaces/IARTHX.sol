// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTH} from "./IARTH.sol";
import {IERC20} from "./IERC20.sol";
import {IAnyswapV4ERC20} from "./IAnyswapV4ERC20.sol";
import {IARTHXTaxController} from "./IARTHXTaxController.sol";

/**
 * @title  ARTHShares.
 * @author MahaDAO.
 */
interface IARTHX is IERC20, IAnyswapV4ERC20 {
    function setOwner(address newOwner) external;

    function setOracle(address newOracle) external;

    function setTimelock(address newTimelock) external;

    function setARTH(IARTH arth) external;

    function poolMint(address account, uint256 amount) external;

    function poolBurnFrom(address account, uint256 amount) external;

    function setTaxController(IARTHXTaxController controller) external;

    function taxTransfer(
        address spender,
        address receiver,
        uint256 amount
    ) external;
}
