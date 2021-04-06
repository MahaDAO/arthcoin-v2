// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';

import './IUniswapSwapRouter.sol';
import '../Uniswap/UniswapV2Library.sol';
import '../Uniswap/Interfaces/IUniswapV2Pair.sol';

/**
 * @title  A Uniswap Router for tokens involving ARTH.
 * @author Original code written by FEI Protocol. Modified by MahaDAO.
 */
contract UniswapSwapRouter is IUniswapSwapRouter {
    using SafeMath for uint256;

    // solhint-disable-next-line var-name-mixedcase
    IWETH public immutable WETH;
    // solhint-disable-next-line var-name-mixedcase
    IUniswapV2Pair public immutable PAIR;

    address public arthAddr;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'UniswapSwapRouter: Expired');
        _;
    }

    constructor(
        IUniswapV2Pair pair_,
        IWETH weth_,
        address arthAddr_
    ) {
        WETH = weth_;
        PAIR = pair_;

        arthAddr = arthAddr_;
    }

    receive() external payable {
        // Only accept ETH via fallback from the WETH contract.
        assert(msg.sender == address(WETH));
    }

    /**
     * @notice             Buy ARTH for ETH with some protections.
     * @param minReward    Minimum mint reward for purchasing.
     * @param amountOutMin Minimum ARTH received.
     * @param to           Address to send ARTH.
     * @param deadline     Block timestamp after which trade is invalid.
     */
    function buyARTHForETH(
        uint256 minReward,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable override ensure(deadline) returns (uint256 amountOut) {
        (uint256 reservesETH, uint256 reservesOther, bool isWETHPairToken0) =
            _getReserves();

        uint256 amountIn = msg.value;
        amountOut = UniswapV2Library.getAmountOut(
            amountIn,
            reservesETH,
            reservesOther
        );

        require(
            amountOut >= amountOutMin,
            'UniswapSwapRouter: Insufficient output amount'
        );

        // Convert sent ETH to wrapped ETH and assert successful transfer to pair.
        IWETH(WETH).deposit{value: amountIn}();
        assert(IWETH(WETH).transfer(address(PAIR), amountIn));

        address arth = isWETHPairToken0 ? PAIR.token1() : PAIR.token0();

        // Check ARTH balance of recipient before to compare against.
        uint256 arthBalanceBefore = IERC20(arth).balanceOf(to);

        (uint256 amount0Out, uint256 amount1Out) =
            isWETHPairToken0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));

        PAIR.swap(amount0Out, amount1Out, to, new bytes(0));

        // Check that ARTH recipient got at least minReward on top of trade amount.
        uint256 arthBalanceAfter = IERC20(arth).balanceOf(to);
        uint256 reward = arthBalanceAfter.sub(arthBalanceBefore).sub(amountOut);
        require(reward >= minReward, 'UniswapSwapRouter: Not enough reward');

        return amountOut;
    }

    /**
     * @notice             Sell ARTH for ETH with some protections.
     * @param maxPenalty   Maximum ARTH burn for purchasing.
     * @param amountIn     Amount of ARTH to sell.
     * @param amountOutMin Minimum ETH received.
     * @param to           Address to send ETH.
     * @param deadline     Block timestamp after which trade is invalid.
     */
    function sellARTHForETH(
        uint256 maxPenalty,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external override ensure(deadline) returns (uint256 amountOut) {
        (uint256 reservesETH, uint256 reservesOther, bool isWETHPairToken0) =
            _getReserves();

        address arth = isWETHPairToken0 ? PAIR.token1() : PAIR.token0();

        IERC20(arth).transferFrom(msg.sender, address(PAIR), amountIn);

        // Figure out how much the PAIR actually received net of ARTH burn.
        uint256 effectiveAmountIn =
            IERC20(arth).balanceOf(address(PAIR)).sub(reservesOther);

        // Check that burned fee-on-transfer is not more than the maxPenalty
        if (effectiveAmountIn < amountIn) {
            uint256 penalty = amountIn - effectiveAmountIn;
            require(
                penalty <= maxPenalty,
                'UniswapSwapRouter: Penalty too high'
            );
        }

        amountOut = UniswapV2Library.getAmountOut(
            effectiveAmountIn,
            reservesOther,
            reservesETH
        );
        require(
            amountOut >= amountOutMin,
            'UniswapSwapRouter: Insufficient output amount'
        );

        (uint256 amount0Out, uint256 amount1Out) =
            isWETHPairToken0
                ? (amountOut, uint256(0))
                : (uint256(0), amountOut);

        PAIR.swap(amount0Out, amount1Out, address(this), new bytes(0));

        IWETH(WETH).withdraw(amountOut);

        TransferHelper.safeTransferETH(to, amountOut);
        return amountOut;
    }

    function _getReserves()
        internal
        view
        returns (
            uint256 reservesETH,
            uint256 reservesOther,
            bool isWETHPairToken0
        )
    {
        (uint256 reserves0, uint256 reserves1, ) = PAIR.getReserves();
        isWETHPairToken0 = PAIR.token0() == address(WETH);

        return
            isWETHPairToken0
                ? (reserves0, reserves1, isWETHPairToken0)
                : (reserves1, reserves0, isWETHPairToken0);
    }
}
