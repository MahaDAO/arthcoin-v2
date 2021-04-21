// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./IERC20.sol";

// Original at https://etherscan.io/address/0xb092b4601850E23903A42EaCBc9D8A0EeC26A4d5
// Some functions were omitted for brevity. See the contract for details

interface ICREAMcrARTH is IERC20 {
    function getAccountSnapshot(address account)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        );

    function borrowRatePerBlock() external view returns (uint256);

    function supplyRatePerBlock() external view returns (uint256);

    function totalBorrowsCurrent() external view returns (uint256);

    function borrowBalanceCurrent(address account)
        external
        view
        returns (uint256);

    function borrowBalanceStored(address account)
        external
        view
        returns (uint256);

    function exchangeRateCurrent() external view returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function getCash() external view returns (uint256);

    function accrueInterest() external returns (uint256);

    function seize(
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) external returns (uint256);

    function mint(uint256 mintAmount) external returns (uint256);

    function redeem(uint256 redeemTokens) external returns (uint256);

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
}
