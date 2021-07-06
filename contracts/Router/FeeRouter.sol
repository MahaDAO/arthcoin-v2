// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC20} from "../ERC20/IERC20.sol";
import {Ownable} from "../access/Ownable.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {
    IUniswapV2Router02
} from "../Uniswap/Interfaces/IUniswapV2Router02.sol";
import {IBoardroom} from "../boardroom/core/IBoardroom.sol";

contract FeeRouter is Ownable {
    using SafeMath for uint256;

    IERC20 public immutable USDC;

    uint256 public totalSwapped = 0;

    constructor(
        IERC20 usdc
    ) {
        USDC = usdc;
    }

    function swap(
        IERC20 token,
        uint256 amount,
        IBoardroom boardroom,
        IUniswapV2Router02 router
    ) external payable onlyOwner returns (uint256) {
        // Swap intput tokens for output tokens.
        uint256 usdcRecievedAfterSwap = _swapForUSDC(
            token,
            amount,
            router
        );

        // Update the counter to keep track of swapped tokens.
        totalSwapped = totalSwapped.add(usdcRecievedAfterSwap);

        // Approve the boardroom to use these tokens.
        USDC.approve(address(boardroom), usdcRecievedAfterSwap);

        // NOTE: this router needs to be operator of boardroom.
        boardroom.allocateSeigniorage(usdcRecievedAfterSwap);

        return usdcRecievedAfterSwap;
    }

    function _swapForUSDC(
        IERC20 token,
        uint256 amountIn,
        IUniswapV2Router02 router
    ) internal returns (uint256) {
        // Get the amount from the owner.
        token.transferFrom(msg.sender, address(this), amountIn);
        token.approve(address(router), amountIn);

        // Setup the input and output tokens.
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = address(USDC);

        // Find the minimum out tokens exepcted and then swap tokens.
        uint256[] memory amountsOut = router.getAmountsOut(amountIn, path);
        uint256[] memory swapAmountsOut = router.swapExactTokensForTokens(
            amountIn,
            amountsOut[1],
            path,
            address(this),
            block.timestamp
        );

        // Make sure we have recieved atleast the minimum no. of tokens
        // we expected.
        require(
            swapAmountsOut[1] >= amountsOut[1],
            "FeeRouter: INSUFFICIENT_OUT_AMOUNT"
        );

        // Return the amount recieved.
        return swapAmountsOut[1];
    }
}
