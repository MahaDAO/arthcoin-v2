// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../Math/SafeMath.sol';
import '../Governance/AccessControl.sol';
import '../Oracle/ChainlinkETHUSDPriceConsumer.sol';
import '../Oracle/UniswapPairOracle.sol';

//import '../'

contract IncentiveController is AccessControl {
    using SafeMath for uint256;

    ChainlinkETHUSDPriceConsumer private ethUsdPricer;
    UniswapPairOracle private arthEthOracle;
    address public arthAddress;
    address public uniswapPair;

    uint256 private constant PRICE_PRECISION = 1e6;
    uint8 private ethUsdPricerDecimals;

    mapping(address => bool) private _exempt;

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'You are not the owner or the governance timelock'
        );
        _;
    }

    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    // Note: The incentivizing function is only implemented for ARTH/ETH Pair
    function getCurrentArthPrice() internal view returns (uint256) {
        // Get the ETH / USD price first, and cut it down to 1e6 precision
        uint256 ethToUsdPrice =
            uint256(ethUsdPricer.getLatestPrice()).mul(PRICE_PRECISION).div(
                uint256(10)**ethUsdPricerDecimals
            );

        uint256 arthEthPrice =
            uint256(arthEthOracle.consult(arthAddress, PRICE_PRECISION));

        return ethToUsdPrice.mul(arthEthPrice).div(PRICE_PRECISION);
    }

    function isExemptAddress(address account) public view returns (bool) {
        return _exempt[account];
    }

    function updateOracle() public {
        try arthEthOracle.update() {} catch {}
    }

    function _isPair(address account) internal view returns (bool) {
        return address(uniswapPair) == account;
    }

    function setExemptAddress(address account, bool isExempt)
        external
        onlyAdmin
    {
        _exempt[account] = isExempt;
    }

    function incentivize(
        address sender,
        address receiver,
        address,
        uint256 amountIn
    ) public {
        require(sender != receiver, 'UniswapIncentive: cannot send self');
        updateOracle();

        if (_isPair(sender)) {
            _incentivizeBuy(receiver, amountIn);
        }

        if (_isPair(receiver)) {
            _incentivizeSell(sender, amountIn);
        }
    }

    function _incentivizeBuy(address target, uint256 amountIn)
        internal
    // ifMinterSelf
    {
        if (isExemptAddress(target)) {
            return;
        }

        (
            uint256 incentive,
            uint32 weight,
            Decimal.D256 memory initialDeviation,
            Decimal.D256 memory finalDeviation
        ) = getBuyIncentive(amountIn);

        _updateTimeWeight(initialDeviation, finalDeviation, weight);
        if (incentive != 0) {
            fei().mint(target, incentive);
        }
    }
}
