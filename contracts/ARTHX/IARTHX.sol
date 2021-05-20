// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC20} from '../ERC20/IERC20.sol';
import {ITaxCurve} from '../Curves/ITaxCurve.sol';
import {IAnyswapV4Token} from '../ERC20/IAnyswapV4Token.sol';


/**
 * @title  ARTHShares.
 * @author MahaDAO.
 */
interface IARTHX is IERC20, IAnyswapV4Token {
    function addToTaxWhiteList(address entity) external;

    function removeFromTaxWhitelist(address entity) external;

    function setTaxCurve(ITaxCurve curve) external;

    function setOwner(address _ownerAddress) external;

    function setOracle(address newOracle) external;

    function setArthController(address _controller) external;

    function setTimelock(address newTimelock) external;

    function setARTHAddress(address arthContractAddress) external;

    function poolMint(address account, uint256 amount) external;

    function poolBurnFrom(address account, uint256 amount) external;

    function setTaxDestination(address _taxDestination) external;

    function getTaxPercent() external view returns (uint256);

    function getTaxAmount(uint256 amount) external view returns (uint256);

    function isTxWhiteListed(address sender, address receiver)
        external
        view
        returns (bool);
}
