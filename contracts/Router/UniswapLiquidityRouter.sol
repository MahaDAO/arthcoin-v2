// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';

import '../Uniswap/UniswapV2Library.sol';
import '../Uniswap/Interfaces/IUniswapV2Pair.sol';
import '../Uniswap/Interfaces/IUniswapV2Factory.sol';

/**
 * @title A Uniswap Router for managing liquidity.
 * @author MahaDAO.
 */
contract UniswapLiquidityRouter {
    using SafeMath for uint256;

    IWETH public immutable WETH;
    IUniswapV2Factory public immutable FACTORY;

    address public arthAddr;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'UniswapLiquidityRouter: EXPIRED');
        _;
    }

    modifier ensureOneIsArth(address tokenA, address tokenB) {
        require(
            tokenA == arthAddr || tokenB == arthAddr,
            'UniswapLiquidityRouter: TOKEN != ARTH'
        );
        _;
    }

    constructor(
        address arthAddr_,
        IUniswapV2Factory factory,
        IWETH weth
    ) {
        WETH = weth;
        FACTORY = factory;
        arthAddr = arthAddr_;
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    )
        internal
        virtual
        ensureOneIsArth(tokenA, tokenB)
        returns (uint256 amountA, uint256 amountB)
    {
        // Create the pair if it doesn't exist yet.
        if (IUniswapV2Factory(FACTORY).getPair(tokenA, tokenB) == address(0)) {
            IUniswapV2Factory(FACTORY).createPair(tokenA, tokenB);
        }

        (uint256 reserveA, uint256 reserveB) =
            UniswapV2Library.getReserves(address(FACTORY), tokenA, tokenB);

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal =
                UniswapV2Library.quote(amountADesired, reserveA, reserveB);

            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    'UniswapLiquidityRouter: INSUFFICIENT AMOUNT B'
                );

                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal =
                    UniswapV2Library.quote(amountBDesired, reserveB, reserveA);

                assert(amountAOptimal <= amountADesired);

                require(
                    amountAOptimal >= amountAMin,
                    'UniswapLiquidityRouter: INSUFFICIENT AMOUNT A'
                );

                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

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
        public
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

        address pair =
            UniswapV2Library.pairFor(address(FACTORY), tokenA, tokenB);

        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);

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
        public
        payable
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

        address pair =
            UniswapV2Library.pairFor(address(FACTORY), token, address(WETH));

        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
        WETH.deposit{value: amountETH}();

        assert(WETH.transfer(pair, amountETH));

        liquidity = IUniswapV2Pair(pair).mint(to);

        // Refund dust eth, if any.
        if (msg.value > amountETH)
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
    }
}
