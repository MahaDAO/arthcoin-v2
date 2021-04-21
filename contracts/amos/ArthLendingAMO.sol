// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Ownable} from "../access/Ownable.sol";
import {IARTH} from "../interfaces/IARTH.sol";
import {IARTHX} from "../interfaces/IARTHX.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {SafeMath} from "../utils/math/SafeMath.sol";
import {IARTHPool} from "../interfaces/IARTHPool.sol";
import {AccessControl} from "../access/AccessControl.sol";
import {ICREAMcrARTH} from "../interfaces/ICREAMcrARTH.sol";
import {IFNXCFNX} from "../interfaces/finnexus/IFNXCFNX.sol";
import {IFNXFPTB} from "../interfaces/finnexus/IFNXFPTB.sol";
import {IFNXOracle} from "../interfaces/finnexus/IFNXOracle.sol";
import {IARTHController} from "../interfaces/IARTHController.sol";
import {IFNXFPTARTH} from "../interfaces/finnexus/IFNXFPTARTH.sol";
import {IFNXMinePool} from "../interfaces/finnexus/IFNXMinePool.sol";
import {IFNXManagerProxy} from "../interfaces/finnexus/IFNXManagerProxy.sol";
import {
    IFNXTokenConverter
} from "../interfaces/finnexus/IFNXTokenConverter.sol";
import {
    IFNXIntegratedStake
} from "../interfaces/finnexus/IFNXIntegratedStake.sol";

contract ARTHLendingAMO is AccessControl, Ownable {
    using SafeMath for uint256;

    IARTH private _arth;
    IARTHX private _arthx;
    IARTHPool private _pool;
    IERC20 private _collateral;
    IARTHController private _controller;

    ICREAMcrARTH private _crARTH =
        ICREAMcrARTH(0xb092b4601850E23903A42EaCBc9D8A0EeC26A4d5);
    IFNXFPTB private _fnxFPTB =
        IFNXFPTB(0x7E605Fb638983A448096D82fFD2958ba012F30Cd);
    IFNXFPTARTH private _fnxFPTARTH =
        IFNXFPTARTH(0x39ad661bA8a7C9D3A7E4808fb9f9D5223E22F763);
    IFNXIntegratedStake private _fnxIntegratedStake =
        IFNXIntegratedStake(0x23e54F9bBe26eD55F93F19541bC30AAc2D5569b2);
    IFNXMinePool private _fnxMinePool =
        IFNXMinePool(0x4e6005396F80a737cE80d50B2162C0a7296c9620);
    IFNXTokenConverter private _fnxTokenConverter =
        IFNXTokenConverter(0x955282b82440F8F69E901380BeF2b603Fba96F3b);
    IFNXManagerProxy private _fnxManagerProxy =
        IFNXManagerProxy(0xa2904Fd151C9d9D634dFA8ECd856E6B9517F9785);
    IFNXOracle private _fnxOracle =
        IFNXOracle(0x43BD92bF3Bb25EBB3BdC2524CBd6156E3Fdd41F3);
    IFNXCFNX private _cfnx =
        IFNXCFNX(0x9d7beb4265817a4923FAD9Ca9EF8af138499615d);
    IERC20 private _fnx = IERC20(0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B);

    address public timelock;
    address public custodian;

    bool public allowCream = true;
    bool public allowFinnexus = true;

    uint256 public minCR = 850000;
    uint256 public mintCap = uint256(100000e18);

    uint256 public mintedSumHistorical = 0;
    uint256 public burnedSumHistorical = 0;

    uint256 private constant _PRICE_PRECISION = 1e6;
    uint256 public immutable COLLATERAL_MISSING_DECIMALS;

    event Recovered(address token, uint256 amount);

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == timelock || msg.sender == owner(),
            "ARTHLendingAMO: You are not the owner or the governance timelock"
        );
        _;
    }

    modifier onlyCustodian() {
        require(
            msg.sender == custodian,
            "ARTHLendingAMO: You are not the rewards custodian"
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
        returns (uint256[9] memory allocations)
    {
        // IMPORTANT: Should ONLY be used externally,
        // because it may fail if any one of the functions below fail.

        // All numbers given are in ARTH unless otherwise stated.
        allocations[0] = _arth.balanceOf(address(this)); // Unallocated ARTH

        allocations[1] = (
            _crARTH
                .balanceOf(address(this))
                .mul(_crARTH.exchangeRateStored())
                .div(1e18)
        ); // Cream.

        allocations[2] = (_fnxMinePool.getUserFPTABalance(address(this)))
            .mul(1e8)
            .div(_fnxManagerProxy.getTokenNetworth()); // Staked FPT-ARTH.

        allocations[3] = (_fnxFPTARTH.balanceOf(address(this))).mul(1e8).div(
            _fnxManagerProxy.getTokenNetworth()
        ); // Free FPT-ARTH.

        allocations[4] = _fnxTokenConverter.lockedBalanceOf(address(this)); // Unwinding CFNX.
        allocations[5] = _fnxTokenConverter.getClaimAbleBalance(address(this)); // Claimable Unwound FNX.
        allocations[6] = _fnx.balanceOf(address(this)); // Free FNX.

        uint256 sumFNX = allocations[4];
        sumFNX = sumFNX.add(allocations[5]);
        sumFNX = sumFNX.add(allocations[6]);
        allocations[7] = sumFNX; // Total FNX possessed in various forms.

        uint256 sumARTH = allocations[0];
        sumARTH = sumARTH.add(allocations[1]);
        sumARTH = sumARTH.add(allocations[2]);
        sumARTH = sumARTH.add(allocations[3]);
        allocations[8] = sumARTH; // Total ARTH possessed in various forms
    }

    function showRewards() external view returns (uint256[1] memory rewards) {
        // IMPORTANT: Should ONLY be used externally,
        // because it may fail if FNX.balanceOf() fails.
        rewards[0] = _fnx.balanceOf(address(this));
    }

    // In ARTH
    function mintedBalance() public view returns (uint256) {
        if (mintedSumHistorical >= burnedSumHistorical)
            return mintedSumHistorical.sub(burnedSumHistorical);
        else return 0;
    }

    // Needed for the Arth contract to not brick.
    function getCollateralGMUBalance() external pure returns (uint256) {
        return 1e18; // 1 USDC.
    }

    // This contract is essentially marked as a 'pool' so it can call OnlyPools functions like poolMint and poolBurnFrom
    // on the main ARTH contract.
    function mintARTHForInvestments(uint256 arthAmount)
        public
        onlyByOwnerOrGovernance
    {
        // Make sure you aren't minting more than the mint cap.
        require(
            mintedBalance().add(arthAmount) <= mintCap,
            "ARTHLendingAMO: Borrow cap reached"
        );

        mintedSumHistorical = mintedSumHistorical.add(arthAmount);

        // Make sure the current CR isn't already too low.
        require(
            _controller.getGlobalCollateralRatio() > minCR,
            "ARTHLendingAMO: Collateral ratio is already too low"
        );

        // Make sure the ARTH minting wouldn't push the CR down too much
        uint256 currentCollateralE18 =
            (_controller.getGlobalCollateralValue()).mul(
                10**COLLATERAL_MISSING_DECIMALS
            );

        uint256 currentARTHSupply = _arth.totalSupply();
        uint256 newARTHSupply = currentARTHSupply.add(arthAmount);
        uint256 newCR =
            (currentCollateralE18.mul(_PRICE_PRECISION)).div(newARTHSupply);

        require(
            newCR > minCR,
            "ARTHLendingAMO: Minting would cause collateral ratio to be too low"
        );

        // Mint the arth
        _arth.poolMint(address(this), arthAmount);
    }

    // Give USDC profits back
    function giveCollatBack(uint256 amount) public onlyByOwnerOrGovernance {
        _collateral.transfer(address(_pool), amount);
    }

    // Burn unneeded or excess ARTH
    function burnARTH(uint256 arthAmount) public onlyByOwnerOrGovernance {
        // ARTH.burn(arthAmount);
        burnedSumHistorical = burnedSumHistorical.add(arthAmount);
    }

    // Burn unneeded ARTHX
    function burnARTHX(uint256 amount) public onlyByOwnerOrGovernance {
        _arthx.approve(address(this), amount);
        _arthx.poolBurnFrom(address(this), amount);
    }

    // E18
    function creamDepositARTH(uint256 arthAmount)
        public
        onlyByOwnerOrGovernance
    {
        require(allowCream, "ARTHLendingAMO: Cream strategy is disabled");
        _arth.approve(address(_crARTH), arthAmount);
        require(_crARTH.mint(arthAmount) == 0, "ARTHLendingAMO: Mint failed");
    }

    // E18
    function creamWithdrawARTH(uint256 arthAmount)
        public
        onlyByOwnerOrGovernance
    {
        require(
            _crARTH.redeemUnderlying(arthAmount) == 0,
            "ARTHLendingAMO: RedeemUnderlying failed"
        );
    }

    // E8
    function creamWithdrawcrARTH(uint256 crarthAmount)
        public
        onlyByOwnerOrGovernance
    {
        require(
            _crARTH.redeem(crarthAmount) == 0,
            "ARTHLendingAMO: Redeem failed"
        );
    }

    function fnxIntegratedStakeFPTsARTHFNX(
        uint256 arthAmount,
        uint256 fnxAmount,
        uint256 lockPeriod
    ) public onlyByOwnerOrGovernance {
        require(allowFinnexus, "ARTHLendingAMO: FinNexus strategy is disabled");

        _arth.approve(address(_fnxIntegratedStake), arthAmount);
        _fnx.approve(address(_fnxIntegratedStake), fnxAmount);

        address[] memory fptaTokens = new address[](1);
        uint256[] memory fptaAmounts = new uint256[](1);
        address[] memory fptbTokens = new address[](1);
        uint256[] memory fptbAmounts = new uint256[](1);

        fptaTokens[0] = address(_arth);
        fptaAmounts[0] = arthAmount;
        fptbTokens[0] = address(_fnx);
        fptbAmounts[0] = fnxAmount;

        _fnxIntegratedStake.stake(
            fptaTokens,
            fptaAmounts,
            fptbTokens,
            fptbAmounts,
            lockPeriod
        );
    }

    // FPT-ARTH : FPT-B = 10:1 is the best ratio for staking. You can get it using the prices.
    function fnxStakeARTHForFPTARTH(uint256 arthAmount, uint256 lockPeriod)
        public
        onlyByOwnerOrGovernance
    {
        require(allowFinnexus, "ARTHLendingAMO: FinNexus strategy is disabled");

        _arth.approve(address(_fnxIntegratedStake), arthAmount);

        address[] memory fptaTokens = new address[](1);
        uint256[] memory fptaAmounts = new uint256[](1);
        address[] memory fptbTokens = new address[](0);
        uint256[] memory fptbAmounts = new uint256[](0);

        fptaTokens[0] = address(_arth);
        fptaAmounts[0] = arthAmount;

        _fnxIntegratedStake.stake(
            fptaTokens,
            fptaAmounts,
            fptbTokens,
            fptbAmounts,
            lockPeriod
        );
    }

    function fnxCollectCFNX() public onlyByOwnerOrGovernance {
        uint256 claimablecFNX =
            _fnxMinePool.getMinerBalance(address(this), address(_cfnx));
        _fnxMinePool.redeemMinerCoin(address(_cfnx), claimablecFNX);
    }

    function fnxUnStakeFPTARTH(uint256 fptARTHAmount)
        public
        onlyByOwnerOrGovernance
    {
        _fnxMinePool.unstakeFPTA(fptARTHAmount);
    }

    // FPT-B = Staked FNX
    function fnxUnStakeFPTB(uint256 fptBAmount) public onlyByOwnerOrGovernance {
        _fnxMinePool.unstakeFPTB(fptBAmount);
    }

    /* --== Unwrapping LP Tokens ==-- */

    // FPT-ARTH = Staked ARTH
    function fnxUnRedeemFPTARTHForARTH(uint256 fptARTHAmount)
        public
        onlyByOwnerOrGovernance
    {
        _fnxFPTARTH.approve(address(_fnxManagerProxy), fptARTHAmount);
        _fnxManagerProxy.redeemCollateral(fptARTHAmount, address(_arth));
    }

    // FPT-B = Staked FNX
    function fnxUnStakeFPTBForFNX(uint256 fptBAmount)
        public
        onlyByOwnerOrGovernance
    {
        _fnxFPTB.approve(address(_fnxManagerProxy), fptBAmount);
        _fnxManagerProxy.redeemCollateral(fptBAmount, address(_fnx));
    }

    /* --== Convert CFNX to FNX ==-- */

    // Has to be done in batches, since it unlocks over several months
    function fnxInputCFNXForUnwinding() public onlyByOwnerOrGovernance {
        uint256 cfnxAmount = _cfnx.balanceOf(address(this));
        _cfnx.approve(address(_fnxTokenConverter), cfnxAmount);
        _fnxTokenConverter.inputCfnxForInstallmentPay(cfnxAmount);
    }

    function fnxClaimFNXFromCFNX() public onlyByOwnerOrGovernance {
        _fnxTokenConverter.claimFnxExpiredReward();
    }

    /* --== Combination Functions ==-- */

    function fnxCFNXCollectConvertUnwind() public onlyByOwnerOrGovernance {
        fnxCollectCFNX();
        fnxInputCFNXForUnwinding();
        fnxClaimFNXFromCFNX();
    }

    /* ========== Custodian ========== */

    function withdrawRewards() public onlyCustodian {
        _fnx.transfer(custodian, _fnx.balanceOf(address(this)));
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address newTimelock) external onlyByOwnerOrGovernance {
        timelock = newTimelock;
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

    function setMintCap(uint256 cap) external onlyByOwnerOrGovernance {
        mintCap = cap;
    }

    function setMinimumCollateralRatio(uint256 cr)
        external
        onlyByOwnerOrGovernance
    {
        minCR = cr;
    }

    function setAllowedStrategies(bool creamFlag, bool finnexusFlag)
        external
        onlyByOwnerOrGovernance
    {
        allowCream = creamFlag;
        allowFinnexus = finnexusFlag;
    }

    function recoverERC20(address token, uint256 amount)
        external
        onlyByOwnerOrGovernance
    {
        // Can only be triggered by owner or governance, not custodian
        // Tokens are sent to the custodian, as a sort of safeguard

        IERC20(token).transfer(custodian, amount);
        emit Recovered(token, amount);
    }
}
