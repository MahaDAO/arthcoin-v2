// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from "../access/Ownable.sol";
import {IARTH} from "../interfaces/IARTH.sol";
import {IARTHX} from "../interfaces/IARTHX.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {Comp} from "../assets/variants/Comp.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {IARTHPool} from "../interfaces/IARTHPool.sol";
import {AccessControl} from "../access/AccessControl.sol";
import {IARTHController} from "../interfaces/IARTHController.sol";
import {IcUSDCPartial} from "../interfaces/compound/IcUSDCPartial.sol";
import {IUniswapPairOracle} from "../interfaces/IUniswapPairOracle.sol";
import {IyUSDCV2Partial} from "../interfaces/yearn/IyUSDCV2Partial.sol";
import {IAAVEaUSDCPartial} from "../interfaces/aave/IAAVEaUSDCPartial.sol";
import {
    IAAVELendingPoolPartial
} from "../interfaces/aave/IAAVELendingPoolPartial.sol";
import {
    ICompComptrollerPartial
} from "../interfaces/compound/ICompComptrollerPartial.sol";

/**
 * Original code written by:
 * - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *
 * Lower APY: yearn, AAVE, Compound
 * Higher APY: KeeperDAO, BZX, Harvest
 */
contract ARTHPoolInvestorForV2 is AccessControl, Ownable {
    using SafeMath for uint256;

    IARTH private _arth;
    IARTHX private _arthx;
    IARTHPool private _pool;
    IERC20 private _collateral;
    IARTHController private _controller;

    IyUSDCV2Partial private _yUSDCV2 =
        IyUSDCV2Partial(0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9);
    IAAVELendingPoolPartial private _aaveUSDCPool =
        IAAVELendingPoolPartial(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);
    IAAVEaUSDCPartial private _aaveUSDCToken =
        IAAVEaUSDCPartial(0xBcca60bB61934080951369a648Fb03DF4F96263C);
    IcUSDCPartial private _cUSDC =
        IcUSDCPartial(0x39AA39c021dfbaE8faC545936693aC917d5E7563);

    Comp private _comp = Comp(0xc00e94Cb662C3520282E6f5717214004A7f26888);
    ICompComptrollerPartial private _compController =
        ICompComptrollerPartial(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);

    address public timelock;
    address public custodian;
    address public weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    uint256 public borrowCap = uint256(20000e6);

    uint256 public borrowedBalance = 0;
    uint256 public borrowedHistorical = 0;
    uint256 public paidBackHistorical = 0;

    bool public allowAave = true;
    bool public allowYearn = true;
    bool public allowCompound = true;

    uint256 private constant _PRICE_PRECISION = 1e6;
    uint256 public immutable COLLATERAL_MISSING_DECIMALS;

    event Recovered(address token, uint256 amount);

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == timelock || msg.sender == owner(),
            "ARTHPoolInvestorForV2: You are not the owner or the governance timelock"
        );
        _;
    }

    modifier onlyCustodian() {
        require(
            msg.sender == custodian,
            "ARTHPoolInvestorForV2: You are not the rewards custodian"
        );
        _;
    }

    constructor(
        IARTH arth,
        IARTHX arthx,
        IARTHPool pool,
        IERC20 collateral,
        address custodian_,
        address timelock_
    ) {
        _arth = arth;
        _arthx = arthx;
        _pool = pool;
        _collateral = collateral;

        timelock = timelock_;
        custodian = custodian_;
        COLLATERAL_MISSING_DECIMALS = uint256(18).sub(_collateral.decimals());

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function showAllocations()
        external
        view
        returns (uint256[5] memory allocations)
    {
        // IMPORTANT: Should ONLY be used externally,
        // because it may fail if any one of the functions below fail.

        // All numbers given are assuming xyzUSDC, etc. is converted back to actual USDC
        allocations[0] = _collateral.balanceOf(address(this)); // Unallocated

        allocations[1] = (_yUSDCV2.balanceOf(address(this)))
            .mul(_yUSDCV2.pricePerShare())
            .div(1e6); // yearn

        allocations[2] = _aaveUSDCToken.balanceOf(address(this)); // AAVE
        allocations[3] = (
            _cUSDC
                .balanceOf(address(this))
                .mul(_cUSDC.exchangeRateStored())
                .div(1e18)
        ); // Compound. Note that cUSDC is E8

        uint256 sumTally = 0;
        for (uint256 i = 1; i < 5; i++) {
            if (allocations[i] > 0) {
                sumTally = sumTally.add(allocations[i]);
            }
        }

        allocations[4] = sumTally; // Total Staked
    }

    function showRewards() external view returns (uint256[1] memory rewards) {
        // IMPORTANT
        // Should ONLY be used externally, because it may fail if COMP.balanceOf() fails
        rewards[0] = _comp.balanceOf(address(this)); // COMP
    }

    // Needed for the Arth contract to function
    function getCollateralGMUBalance() external view returns (uint256) {
        // Needs to mimic the ArthPool value and return in E18
        // Only thing different should be borrowedBalance vs balanceOf()
        if (_pool.collateralPricePaused() == true) {
            return
                borrowedBalance
                    .mul(10**COLLATERAL_MISSING_DECIMALS)
                    .mul(_pool.pausedPrice())
                    .div(_PRICE_PRECISION);
        } else {
            uint256 ethGMUPrice = _controller.getETHGMUPrice();
            uint256 ethCollateralPrice =
                IUniswapPairOracle(_pool.collateralETHOracleAddress()).consult(
                    weth,
                    (_PRICE_PRECISION * (10**COLLATERAL_MISSING_DECIMALS))
                );
            uint256 collateralGMUPrice =
                ethGMUPrice.mul(_PRICE_PRECISION).div(ethCollateralPrice);

            return
                borrowedBalance
                    .mul(10**COLLATERAL_MISSING_DECIMALS)
                    .mul(collateralGMUPrice)
                    .div(_PRICE_PRECISION); //.mul(getCollateralPrice()).div(1e6);
        }
    }

    // This is basically a workaround to transfer USDC from the ArthPool to this investor contract
    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like poolMint and poolBurnFrom
    // on the main ARTH contract
    // It mints ARTH from nothing, and redeems it on the target pool for collateral and ARTHX.
    // The burn can be called separately later on
    function mintRedeemPart1(uint256 arthAmount)
        public
        onlyByOwnerOrGovernance
    {
        require(
            allowYearn || allowAave || allowCompound,
            "ARTHPoolInvestorForV2: All strategies are currently off"
        );

        uint256 redemptionFee = _pool.redemptionFee();
        uint256 collateralPriceGMU = _pool.getCollateralPrice();
        uint256 globalCollateralRatio = _controller.getGlobalCollateralRatio();

        uint256 redeemAmountE6 =
            (arthAmount.mul(uint256(1e6).sub(redemptionFee))).div(1e6).div(
                10**COLLATERAL_MISSING_DECIMALS
            );
        uint256 expectedCollateralAmount =
            redeemAmountE6.mul(globalCollateralRatio).div(1e6);

        expectedCollateralAmount = expectedCollateralAmount.mul(1e6).div(
            collateralPriceGMU
        );

        require(
            borrowedBalance.add(expectedCollateralAmount) <= borrowCap,
            "Borrow cap reached"
        );

        borrowedBalance = borrowedBalance.add(expectedCollateralAmount);
        borrowedHistorical = borrowedHistorical.add(expectedCollateralAmount);

        // Mint the arth
        _arth.poolMint(address(this), arthAmount);

        // Redeem the arth
        _arth.approve(address(_pool), arthAmount);
        _pool.redeemFractionalARTH(arthAmount, 0, 0);
    }

    function mintRedeemPart2() public onlyByOwnerOrGovernance {
        _pool.collectRedemption();
    }

    function giveCollatBack(uint256 amount) public onlyByOwnerOrGovernance {
        // Still paying back principal
        if (amount <= borrowedBalance) {
            borrowedBalance = borrowedBalance.sub(amount);
        }
        // Pure profits
        else {
            borrowedBalance = 0;
        }

        paidBackHistorical = paidBackHistorical.add(amount);
        _collateral.transfer(address(_pool), amount);
    }

    function burnARTHX(uint256 amount) public onlyByOwnerOrGovernance {
        _arthx.approve(address(this), amount);
        _arthx.poolBurnFrom(address(this), amount);
    }

    function yDepositUSDC(uint256 usdcAmount) public onlyByOwnerOrGovernance {
        require(
            allowYearn,
            "ARTHPoolInvestorForV2: yearn strategy is currently off"
        );

        _collateral.approve(address(_yUSDCV2), usdcAmount);
        _yUSDCV2.deposit(usdcAmount);
    }

    // E6
    function yWithdrawUSDC(uint256 yusdcAmount) public onlyByOwnerOrGovernance {
        _yUSDCV2.withdraw(yusdcAmount);
    }

    function aaveDepositUSDC(uint256 usdcAmount)
        public
        onlyByOwnerOrGovernance
    {
        require(
            allowAave,
            "ARTHPoolInvestorForV2: AAVE strategy is currently off"
        );

        _collateral.approve(address(_aaveUSDCPool), usdcAmount);
        _aaveUSDCPool.deposit(
            address(_collateral),
            usdcAmount,
            address(this),
            0
        );
    }

    // E6
    function aaveWithdrawUSDC(uint256 ausdcAmount)
        public
        onlyByOwnerOrGovernance
    {
        _aaveUSDCPool.withdraw(
            address(_collateral),
            ausdcAmount,
            address(this)
        );
    }

    function compoundMintcUSDC(uint256 usdcAmount)
        public
        onlyByOwnerOrGovernance
    {
        require(
            allowCompound,
            "ARTHPoolInvestorForV2: Compound strategy is currently off"
        );

        _collateral.approve(address(_cUSDC), usdcAmount);
        _cUSDC.mint(usdcAmount);
    }

    // E8
    function compoundRedeem_cUSDC(uint256 cusdcAmount)
        public
        onlyByOwnerOrGovernance
    {
        // NOTE that cUSDC is E8, NOT E6
        _cUSDC.redeem(cusdcAmount);
    }

    function compoundCollectCOMP() public onlyByOwnerOrGovernance {
        address[] memory cTokens = new address[](1);
        cTokens[0] = address(_cUSDC);
        _compController.claimComp(address(this), cTokens);

        // CompController.claimComp(address(this), );
    }

    function withdrawRewards() public onlyCustodian {
        _comp.transfer(custodian, _comp.balanceOf(address(this)));
    }

    function setTimelock(address newTimelock) external onlyByOwnerOrGovernance {
        timelock = newTimelock;
    }

    function setWETH(address newWETH) external onlyByOwnerOrGovernance {
        weth = newWETH;
    }

    function setMiscRewardsCustodian(address newCustodian)
        external
        onlyByOwnerOrGovernance
    {
        custodian = newCustodian;
    }

    function setPool(IARTHPool pool) external onlyByOwnerOrGovernance {
        _pool = pool;
    }

    function setBorrowCap(uint256 cap) external onlyByOwnerOrGovernance {
        borrowCap = cap;
    }

    function setAllowedStrategies(
        bool yearnFlag,
        bool aaveFlag,
        bool compoundFlag
    ) external onlyByOwnerOrGovernance {
        allowYearn = yearnFlag;
        allowAave = aaveFlag;
        allowCompound = compoundFlag;
    }

    function emergencyRecoverERC20(address token, uint256 amount)
        external
        onlyByOwnerOrGovernance
    {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard

        IERC20(token).transfer(custodian, amount);
        emit Recovered(token, amount);
    }
}
