// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IWETH} from '../ERC20/IWETH.sol';
import {IERC20} from '../ERC20/IERC20.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {TransferHelper} from '../Uniswap/TransferHelper.sol';
import {UniswapV2Library} from '../Uniswap/UniswapV2Library.sol';
import {IUniswapLiquidityRouter} from './IUniswapLiquidityRouter.sol';
import {IUniswapV2Pair} from '../Uniswap/Interfaces/IUniswapV2Pair.sol';
import {IUniswapV2Factory} from '../Uniswap/Interfaces/IUniswapV2Factory.sol';

/**
 * @title  A Uniswap Router for managing liquidity.
 * @author MahaDAO.
 */
contract UniswapLiquidityRouter is IUniswapLiquidityRouter {
    using SafeMath for uint256;

    /**
     * State variables.
     */

    IWETH public immutable WETH;
    IUniswapV2Factory public immutable FACTORY;

    address public arthxAddr;

    /**
     * Modifier.
     */

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'UniswapLiquidityRouter: EXPIRED');
        _;
    }

    /**
     * Constructor.
     */

    constructor(
        address arthxAddr_,
        IUniswapV2Factory factory,
        IWETH weth
    ) {
        arthxAddr = arthxAddr_;

        WETH = weth;
        FACTORY = factory;
    }

    /**
     * External.
     */

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        virtual
        override
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        address pair = UniswapV2Library.pairFor(
            address(FACTORY),
            tokenA,
            tokenB
        );

        TransferHelper.safeTransferFrom(
            tokenA,
            msg.sender,
            address(this),
            amountA
        );
        TransferHelper.safeTransferFrom(
            tokenB,
            msg.sender,
            address(this),
            amountB
        );

        TransferHelper.safeTransfer(tokenA, address(pair), amountA);
        TransferHelper.safeTransfer(tokenB, address(pair), amountB);

        liquidity = IUniswapV2Pair(pair).mint(to);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        virtual
        override
        ensure(deadline)
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        (amountToken, amountETH) = _addLiquidity(
            token,
            address(WETH),
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );

        address pair = UniswapV2Library.pairFor(
            address(FACTORY),
            token,
            address(WETH)
        );

        TransferHelper.safeTransferFrom(
            token,
            msg.sender,
            address(this),
            amountToken
        );
        WETH.deposit{value: amountETH}();

        TransferHelper.safeTransfer(token, address(pair), amountToken);
        assert(WETH.transfer(pair, amountETH));

        liquidity = IUniswapV2Pair(pair).mint(to);

        // Refund dust eth, if any.
        if (msg.value > amountETH)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        public
        virtual
        override
        ensure(deadline)
        returns (uint256 amountA, uint256 amountB)
    {
        address pair = UniswapV2Library.pairFor(
            address(FACTORY),
            tokenA,
            tokenB
        );

        IUniswapV2Pair(pair).transferFrom(msg.sender, pair, liquidity);

        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(pair).burn(
            address(this)
        );

        (address token0, ) = UniswapV2Library.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);

        require(
            amountA >= amountAMin,
            'UniswapV2Router: INSUFFICIENT_A_AMOUNT'
        );
        require(
            amountB >= amountBMin,
            'UniswapV2Router: INSUFFICIENT_B_AMOUNT'
        );

        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenA).transfer(to, amountB);
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        public
        virtual
        override
        ensure(deadline)
        returns (uint256 amountToken, uint256 amountETH)
    {
        (amountToken, amountETH) = removeLiquidity(
            token,
            address(WETH),
            liquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            deadline
        );

        TransferHelper.safeTransfer(token, to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        TransferHelper.safeTransferETH(to, amountETH);
    }

    function buyForETH(
        address buyToken,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable override ensure(deadline) returns (uint256 amountOut) {
        (uint256 reservesBuy, uint256 reservesSell) = _getReserves(
            buyToken,
            address(WETH)
        );

        amountOut = UniswapV2Library.getAmountOut(
            msg.value,
            reservesSell,
            reservesBuy
        );
        require(
            amountOut >= amountOutMin,
            'UniswapSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT'
        );

        IUniswapV2Pair pair = IUniswapV2Pair(
            FACTORY.getPair(address(WETH), buyToken)
        );
        require(address(pair) != address(0), 'UniswapSwapRouter: INVALID_PAIR');

        // Convert sent ETH to wrapped ETH and assert successful transfer to pair.
        WETH.deposit{value: msg.value}();
        assert(WETH.transfer(address(pair), msg.value));

        // Check buyToken balance of recipient before to compare against.
        uint256 buyTokenBalanceBefore = IERC20(buyToken).balanceOf(
            address(this)
        );

        // If weth is token0 which means we are selling token0(hence amountOut0 = 0)
        (uint256 amount0Out, uint256 amount1Out) = (
            address(WETH) == pair.token0()
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0))
        );

        pair.swap(amount0Out, amount1Out, address(this), new bytes(0));

        // Check that ARTH recipient got at least minReward on top of trade amount.
        uint256 buyTokenBalanceAfter = IERC20(buyToken).balanceOf(
            address(this)
        );
        uint256 boughtAmount = buyTokenBalanceAfter.sub(buyTokenBalanceBefore);

        require(
            boughtAmount >= amountOutMin,
            'UniswapSwapRouter: NOT_ENOUGHT_AMOUNT_OUT'
        );

        TransferHelper.safeTransfer(buyToken, to, boughtAmount);

        return boughtAmount;
    }

    function buyForERC20(
        address buyToken,
        address sellToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external override ensure(deadline) returns (uint256 amountOut) {
        require(sellToken != arthxAddr, 'Router: ONLY_BUY_POSSIBLE');

        (uint256 reservesBuy, uint256 reservesSell) = _getReserves(
            buyToken,
            sellToken
        );

        amountOut = UniswapV2Library.getAmountOut(
            amountIn,
            reservesSell,
            reservesBuy
        );
        require(
            amountOut >= amountOutMin,
            'UniswapSwapRouter: Insufficient output amount'
        );

        IUniswapV2Pair pair = IUniswapV2Pair(
            FACTORY.getPair(buyToken, sellToken)
        );
        require(address(pair) != address(0), 'UniswapSwapRouter: INVALID_PAIR');

        require(
            IERC20(sellToken).balanceOf(msg.sender) >= amountIn,
            'UniswapSwapRouter: amount < required'
        );
        TransferHelper.safeTransferFrom(
            sellToken,
            msg.sender,
            address(pair),
            amountIn
        );

        uint256 buyTokenBalanceBefore = IERC20(buyToken).balanceOf(
            address(this)
        );

        (uint256 amount0Out, uint256 amount1Out) = sellToken == pair.token0()
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));

        pair.swap(amount0Out, amount1Out, address(this), new bytes(0));

        // Check that ARTH recipient got at least minReward on top of trade amount.
        uint256 buyTokenBalanceAfter = IERC20(buyToken).balanceOf(
            address(this)
        );

        require(
            buyTokenBalanceAfter.sub(buyTokenBalanceBefore) >= amountOutMin,
            'UniswapSwapRouter: NOT_ENOUGHT_AMOUNT_OUT'
        );

        TransferHelper.safeTransfer(
            buyToken,
            to,
            buyTokenBalanceAfter.sub(buyTokenBalanceBefore)
        );

        return buyTokenBalanceAfter.sub(buyTokenBalanceBefore);
    }

    /**
     * Internal.
     */

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal virtual returns (uint256 amountA, uint256 amountB) {
        // Create the pair if it doesn't exist yet.
        if (IUniswapV2Factory(FACTORY).getPair(tokenA, tokenB) == address(0)) {
            IUniswapV2Factory(FACTORY).createPair(tokenA, tokenB);
        }

        (uint256 reserveA, uint256 reserveB) = UniswapV2Library.getReserves(
            address(FACTORY),
            tokenA,
            tokenB
        );

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = UniswapV2Library.quote(
                amountADesired,
                reserveA,
                reserveB
            );

            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    'UniswapLiquidityRouter: INSUFFICIENT AMOUNT B'
                );

                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = UniswapV2Library.quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );

                assert(amountAOptimal <= amountADesired);

                require(
                    amountAOptimal >= amountAMin,
                    'UniswapLiquidityRouter: INSUFFICIENT AMOUNT A'
                );

                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function _getReserves(address buyToken, address sellToken)
        internal
        view
        returns (uint256, uint256)
    {
        IUniswapV2Pair pair = IUniswapV2Pair(
            FACTORY.getPair(buyToken, sellToken)
        );
        require(address(pair) != address(0), 'UniswapSwapRouter: INVALID_PAIR');

        // Make sure that we only buy tokens.
        require(sellToken != arthxAddr, 'Router: ONLY_BUY_POSSIBLE');

        (uint256 reserves0, uint256 reserves1, ) = pair.getReserves();

        (uint256 buyTokenReserve, uint256 sellTokenReserve) = (
            buyToken == pair.token0()
                ? (reserves0, reserves1)
                : (reserves1, reserves0)
        );

        return (buyTokenReserve, sellTokenReserve);
    }
}
