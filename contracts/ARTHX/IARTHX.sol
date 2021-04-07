// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

/**
 * @title  ARTHShares.
 * @author MahaDAO.
 */
interface IARTHX {
    function setOwner(address _ownerAddress) external;

    function setOracle(address newOracle) external;

    function setTimelock(address newTimelock) external;

    function setARTHAddress(address arthContractAddress) external;

    function poolMint(address account, uint256 amount) external;

    function poolBurnFrom(address account, uint256 amount) external;
}
