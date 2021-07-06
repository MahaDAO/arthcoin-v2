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
    IUniswapV2Router02 public immutable ROUTER;

    uint256 public totalSwapped = 0;

    constructor(
        IERC20 usdc,
        IUniswapV2Router02 router
    ) {
        USDC = usdc;
        ROUTER = router;
    }

    function swap(
        address token,
        uint256 amount,
        address boardroom
    ) external payable onlyOwner returns (uint256) {
        // Swap intput tokens for output tokens.
        uint256 usdcRecievedAfterSwap = _swapForUSDC(
            token,
            amount
        );

        // Update the counter to keep track of swapped tokens.
        totalSwapped = totalSwapped.add(usdcRecievedAfterSwap);

        // Approve the boardroom to use these tokens.
        USDC.approve(boardroom, usdcRecievedAfterSwap);

        // NOTE: this router needs to be operator of boardroom.
        IBoardroom(boardroom).allocateSeigniorage(usdcRecievedAfterSwap);

        return usdcRecievedAfterSwap;
    }

    function _swapForUSDC(
        address token,
        uint256 amountIn
    ) internal returns (uint256) {
        // Get the amount from the owner.
        IERC20(token).transferFrom(msg.sender, address(this), amountIn);
        IERC20(token).approve(address(ROUTER), amountIn);

        // Setup the input and output tokens.
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = address(USDC);

        // Find the minimum out tokens exepcted and then swap tokens.
        uint256[] memory amountsOut = ROUTER.getAmountsOut(amountIn, path);
        uint256[] memory swapAmountsOut = ROUTER.swapExactTokensForTokens(
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
