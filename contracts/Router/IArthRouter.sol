// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../Arth/IIncentive.sol';

/// @title FeiRouter interface
/// @author Fei Protocol
interface IArthRouter {
    // ----------- state changing api -----------

    function buyArth(
        uint256 minReward,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountOut);

    function sellArth(
        uint256 maxPenalty,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut);
}
