// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../../Arth/Arth.sol';
import '../../Arth/ArthController.sol';
import '../../ARTHX/ARTHX.sol';
import '../../ERC20/ERC20.sol';
import './ArthPoolLibrary.sol';
import '../../Math/SafeMath.sol';
import '../../Oracle/ISimpleOracle.sol';
import '../../Oracle/UniswapPairOracle.sol';
import '../../Governance/AccessControl.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
contract ArthPool is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateralToken;
    ERC20 private stabilityFeeToken;

    // TODO: replace this oracle with chainlink oracle.
    ISimpleOracle public arth_stability_token_oracle;

    address private ownerAddress;
    address private collateralAddress;

    ArthController private controller;
    ARTHShares private ARTHX;
    ARTHStablecoin private ARTH;

    address private timelock_address;
    address private arthx_contract_address;
    address private arth_contract_address;

    address private weth_address;
    address public collat_eth_oracle_address;
    UniswapPairOracle private collatEthOracle;

    uint256 public buybackFee;
    uint256 public mintingFee;
    uint256 public recollatFee;
    uint256 public redemptionFee;
    uint256 public stabilityFee = 1; // In %.

    uint256 public unclaimedPoolARTHX;
    uint256 public unclaimedPoolCollateral;
    mapping(address => uint256) public lastRedeemed;
    mapping(address => uint256) public redeemARTHXBalances;
    mapping(address => uint256) public borrowedCollateral;
    mapping(address => uint256) public redeemCollateralBalances;

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_MAX = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;

    // Stores price of the collateral, if price is paused
    uint256 public pausedPrice = 0;

    // Pool_ceiling is the total units of collateral that a pool contract can hold
    uint256 public pool_ceiling = 0;

    // Number of decimals needed to get to 18
    uint256 private immutable missing_decimals;

    // Bonus rate on ARTHX minted during recollateralizeARTH(); 6 decimals of precision, set to 0.75% on genesis
    uint256 public bonus_rate = 7500;

    // Number of blocks to wait before being able to collectRedemption()
    uint256 public redemptionDelay = 1;

    // AccessControl Roles
    bytes32 private constant MINT_PAUSER = keccak256('MINT_PAUSER');
    bytes32 private constant REDEEM_PAUSER = keccak256('REDEEM_PAUSER');
    bytes32 private constant BUYBACK_PAUSER = keccak256('BUYBACK_PAUSER');
    bytes32 private constant RECOLLATERALIZE_PAUSER =
        keccak256('RECOLLATERALIZE_PAUSER');
    bytes32 private constant COLLATERAL_PRICE_PAUSER =
        keccak256('COLLATERAL_PRICE_PAUSER');
    bytes32 private constant AMO_ROLE = keccak256('AMO_ROLE');

    // AccessControl state variables
    bool public mintPaused = false;
    bool public redeemPaused = false;
    bool public recollateralizePaused = false;
    bool public buyBackPaused = false;
    bool public collateralPricePaused = false;

    event Repay(address indexed from, uint256 amount);
    event Borrow(address indexed from, uint256 amount);
    event StabilityFeesCharged(address indexed from, uint256 fee);

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == timelock_address || msg.sender == ownerAddress,
            'You are not the owner or the governance timelock'
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'You are not the owner or the governance timelock'
        );
        _;
    }

    modifier onlyAdminOrOwnerOrGovernance() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
                msg.sender == timelock_address ||
                msg.sender == ownerAddress,
            'ArthPool: forbidden'
        );
        _;
    }

    modifier onlyAMOS {
        require(hasRole(AMO_ROLE, _msgSender()), 'ArthPool: forbidden');
        _;
    }

    modifier notRedeemPaused() {
        require(redeemPaused == false, 'Redeeming is paused');
        _;
    }

    modifier notMintPaused() {
        require(mintPaused == false, 'Minting is paused');
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _arth_contract_address,
        address _arthx_contract_address,
        address _collateralAddress,
        address _creator_address,
        address _timelock_address,
        address _stabilityFeeToken,
        address _arth_stability_token_oracle,
        uint256 _pool_ceiling
    ) {
        ARTH = ARTHStablecoin(_arth_contract_address);
        ARTHX = ARTHShares(_arthx_contract_address);
        arth_contract_address = _arth_contract_address;
        arthx_contract_address = _arthx_contract_address;
        collateralAddress = _collateralAddress;
        timelock_address = _timelock_address;
        ownerAddress = _creator_address;
        collateralToken = ERC20(_collateralAddress);
        pool_ceiling = _pool_ceiling;
        missing_decimals = uint256(18).sub(collateralToken.decimals());

        stabilityFeeToken = ERC20(_stabilityFeeToken);
        arth_stability_token_oracle = ISimpleOracle(
            _arth_stability_token_oracle
        );

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(MINT_PAUSER, timelock_address);
        grantRole(REDEEM_PAUSER, timelock_address);
        grantRole(RECOLLATERALIZE_PAUSER, timelock_address);
        grantRole(BUYBACK_PAUSER, timelock_address);
        grantRole(COLLATERAL_PRICE_PAUSER, timelock_address);
    }

    function setStabilityFee(uint256 percent)
        public
        onlyAdminOrOwnerOrGovernance
    {
        require(percent <= 100, 'ArthPool: percent > 100');

        stabilityFee = percent;
    }

    /* ========== VIEWS ========== */

    // Returns dollar value of collateral held in this Arth pool
    function collatDollarBalance() public view returns (uint256) {
        if (collateralPricePaused == true) {
            return
                (
                    collateralToken.balanceOf(address(this)).sub(
                        unclaimedPoolCollateral
                    )
                )
                    .mul(10**missing_decimals)
                    .mul(pausedPrice)
                    .div(PRICE_PRECISION);
        } else {
            uint256 eth_usd_price = controller.eth_usd_price();
            uint256 eth_collat_price =
                collatEthOracle.consult(
                    weth_address,
                    PRICE_PRECISION * (10**missing_decimals)
                );

            uint256 collat_usd_price =
                eth_usd_price.mul(PRICE_PRECISION).div(eth_collat_price);
            return
                (
                    collateralToken.balanceOf(address(this)).sub(
                        unclaimedPoolCollateral
                    )
                )
                    .mul(10**missing_decimals)
                    .mul(collat_usd_price)
                    .div(PRICE_PRECISION); //.mul(getCollateralPrice()).div(1e6);
        }
    }

    // Returns the value of excess collateral held in this Arth pool, compared to what is needed to maintain the global collateral ratio
    function availableExcessCollatDV() public view returns (uint256) {
        uint256 total_supply = ARTH.totalSupply();
        uint256 globalCollateralRatio = controller.globalCollateralRatio();
        uint256 globalCollatValue = controller.globalCollateralValue();

        if (globalCollateralRatio > COLLATERAL_RATIO_PRECISION)
            globalCollateralRatio = COLLATERAL_RATIO_PRECISION; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 =
            (total_supply.mul(globalCollateralRatio)).div(
                COLLATERAL_RATIO_PRECISION
            ); // Calculates collateral needed to back each 1 ARTH with $1 of collateral at current collat ratio

        // todo: add a 10-20% buffer for volatile collaterals
        if (globalCollatValue > required_collat_dollar_value_d18)
            return globalCollatValue.sub(required_collat_dollar_value_d18);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Returns the price of the pool collateral in USD
    function getCollateralPrice() public view returns (uint256) {
        if (collateralPricePaused == true) {
            return pausedPrice;
        } else {
            uint256 eth_usd_price = controller.eth_usd_price();
            return
                eth_usd_price.mul(PRICE_PRECISION).div(
                    collatEthOracle.consult(
                        weth_address,
                        PRICE_PRECISION * (10**missing_decimals)
                    )
                );
        }
    }

    function setCollatETHOracle(
        address _collateral_weth_oracle_address,
        address _weth_address
    ) external onlyByOwnerOrGovernance {
        collat_eth_oracle_address = _collateral_weth_oracle_address;
        collatEthOracle = UniswapPairOracle(_collateral_weth_oracle_address);
        weth_address = _weth_address;
    }

    function borrow(uint256 _amount) external onlyAMOS {
        require(
            collateralToken.balanceOf(address(this)) > _amount,
            'ArthPool: Insufficent funds in the pool'
        );

        collateralToken.transfer(msg.sender, _amount);
        borrowedCollateral[msg.sender] += _amount;
        emit Borrow(msg.sender, _amount);
    }

    function repay(uint256 _amount) external onlyAMOS {
        require(
            borrowedCollateral[msg.sender] > 0,
            "ArthPool: Repayer doesn't not have any debt"
        );

        collateralToken.transferFrom(msg.sender, address(this), _amount);
        borrowedCollateral[msg.sender] -= _amount;
        emit Repay(msg.sender, _amount);
    }

    // We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency
    function mint1t1ARTH(uint256 collateralAmount, uint256 ARTHOutMin)
        external
        notMintPaused
        returns (uint256)
    {
        uint256 collateralAmount_d18 =
            collateralAmount * (10**missing_decimals);

        require(
            controller.globalCollateralRatio() >= COLLATERAL_RATIO_MAX,
            'Collateral ratio must be >= 1'
        );
        require(
            (collateralToken.balanceOf(address(this)))
                .sub(unclaimedPoolCollateral)
                .add(collateralAmount) <= pool_ceiling,
            "[Pool's Closed]: Ceiling reached"
        );

        uint256 arth_amount_d18 =
            ArthPoolLibrary.calcMint1t1ARTH(
                getCollateralPrice(),
                collateralAmount_d18
            ); //1 ARTH for each $1 worth of collateral

        arth_amount_d18 = (arth_amount_d18.mul(uint256(1e6).sub(mintingFee)))
            .div(1e6); //remove precision at the end
        require(ARTHOutMin <= arth_amount_d18, 'Slippage limit reached');

        collateralToken.transferFrom(
            msg.sender,
            address(this),
            collateralAmount
        );

        ARTH.poolMint(msg.sender, arth_amount_d18);

        return arth_amount_d18;
    }

    // 0% collateral-backed
    function mintAlgorithmicARTH(uint256 arthxAmount_d18, uint256 ARTHOutMin)
        external
        notMintPaused
        returns (uint256)
    {
        uint256 arthxPrice = controller.arthxPrice();
        require(
            controller.globalCollateralRatio() == 0,
            'Collateral ratio must be 0'
        );

        uint256 arth_amount_d18 =
            ArthPoolLibrary.calcMintAlgorithmicARTH(
                arthxPrice, // X ARTHX / 1 USD
                arthxAmount_d18
            );

        arth_amount_d18 = (arth_amount_d18.mul(uint256(1e6).sub(mintingFee)))
            .div(1e6);
        require(ARTHOutMin <= arth_amount_d18, 'Slippage limit reached');

        ARTHX.poolBurnFrom(msg.sender, arthxAmount_d18);
        ARTH.poolMint(msg.sender, arth_amount_d18);

        return arth_amount_d18;
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    function mintFractionalARTH(
        uint256 collateralAmount,
        uint256 arthxAmount,
        uint256 ARTHOutMin
    ) external notMintPaused returns (uint256) {
        uint256 arthxPrice = controller.arthxPrice();
        uint256 globalCollateralRatio = controller.globalCollateralRatio();

        require(
            globalCollateralRatio < COLLATERAL_RATIO_MAX &&
                globalCollateralRatio > 0,
            'Collateral ratio needs to be between .000001 and .999999'
        );
        require(
            collateralToken
                .balanceOf(address(this))
                .sub(unclaimedPoolCollateral)
                .add(collateralAmount) <= pool_ceiling,
            'Pool ceiling reached, no more ARTH can be minted with this collateral'
        );

        uint256 collateralAmount_d18 =
            collateralAmount * (10**missing_decimals);
        ArthPoolLibrary.MintFF_Params memory input_params =
            ArthPoolLibrary.MintFF_Params(
                arthxPrice,
                getCollateralPrice(),
                arthxAmount,
                collateralAmount_d18,
                globalCollateralRatio
            );

        (uint256 mint_amount, uint256 arthx_needed) =
            ArthPoolLibrary.calcMintFractionalARTH(input_params);

        mint_amount = (mint_amount.mul(uint256(1e6).sub(mintingFee))).div(1e6);
        require(ARTHOutMin <= mint_amount, 'Slippage limit reached');
        require(arthx_needed <= arthxAmount, 'Not enough ARTHX inputted');

        ARTHX.poolBurnFrom(msg.sender, arthx_needed);
        collateralToken.transferFrom(
            msg.sender,
            address(this),
            collateralAmount
        );
        ARTH.poolMint(address(this), mint_amount);

        return mint_amount;
    }

    function getARTHStabilityTokenOraclePrice() public view returns (uint256) {
        return arth_stability_token_oracle.getPrice();
    }

    function _chargeStabilityFee(uint256 amount) internal {
        require(amount > 0, 'ArthPool: amount = 0');

        if (stabilityFee > 0) {
            uint256 stabilityFee_in_ARTH = amount.mul(stabilityFee).div(100);

            uint256 stabilityFee_to_charge =
                getARTHStabilityTokenOraclePrice()
                    .mul(stabilityFee_in_ARTH)
                    .div(1e18); // NOTE: this is might change asper ARTH's decimals and price precision.

            stabilityFeeToken.burnFrom(msg.sender, stabilityFee_to_charge);

            emit StabilityFeesCharged(msg.sender, stabilityFee_to_charge);
        }

        return;
    }

    // Redeem collateral. 100% collateral-backed
    function redeem1t1ARTH(uint256 ARTH_amount, uint256 COLLATERAL_out_min)
        external
        notRedeemPaused
    {
        require(
            controller.globalCollateralRatio() == COLLATERAL_RATIO_MAX,
            'Collateral ratio must be == 1'
        );

        // Need to adjust for decimals of collateral
        uint256 ARTH_amount_precision = ARTH_amount.div(10**missing_decimals);
        uint256 collateral_needed =
            ArthPoolLibrary.calcRedeem1t1ARTH(
                getCollateralPrice(),
                ARTH_amount_precision
            );

        collateral_needed = (
            collateral_needed.mul(uint256(1e6).sub(redemptionFee))
        )
            .div(1e6);
        require(
            collateral_needed <=
                collateralToken.balanceOf(address(this)).sub(
                    unclaimedPoolCollateral
                ),
            'Not enough collateral in pool'
        );
        require(
            COLLATERAL_out_min <= collateral_needed,
            'Slippage limit reached'
        );

        redeemCollateralBalances[msg.sender] = redeemCollateralBalances[
            msg.sender
        ]
            .add(collateral_needed);
        unclaimedPoolCollateral = unclaimedPoolCollateral.add(
            collateral_needed
        );
        lastRedeemed[msg.sender] = block.number;

        _chargeStabilityFee(ARTH_amount);

        // Move all external functions to the end
        ARTH.poolBurnFrom(msg.sender, ARTH_amount);
    }

    // Will fail if fully collateralized or algorithmic
    // Redeem ARTH for collateral and ARTHX. > 0% and < 100% collateral-backed
    function redeemFractionalARTH(
        uint256 ARTH_amount,
        uint256 ARTHXOutMin,
        uint256 COLLATERAL_out_min
    ) external notRedeemPaused {
        uint256 arthxPrice = controller.arthxPrice();
        uint256 globalCollateralRatio = controller.globalCollateralRatio();

        require(
            globalCollateralRatio < COLLATERAL_RATIO_MAX &&
                globalCollateralRatio > 0,
            'Collateral ratio needs to be between .000001 and .999999'
        );
        uint256 col_price_usd = getCollateralPrice();

        uint256 ARTH_amount_post_fee =
            (ARTH_amount.mul(uint256(1e6).sub(redemptionFee))).div(
                PRICE_PRECISION
            );

        uint256 arthx_dollar_value_d18 =
            ARTH_amount_post_fee.sub(
                ARTH_amount_post_fee.mul(globalCollateralRatio).div(
                    PRICE_PRECISION
                )
            );
        uint256 arthxAmount =
            arthx_dollar_value_d18.mul(PRICE_PRECISION).div(arthxPrice);

        // Need to adjust for decimals of collateral
        uint256 ARTH_amount_precision =
            ARTH_amount_post_fee.div(10**missing_decimals);
        uint256 collateral_dollar_value =
            ARTH_amount_precision.mul(globalCollateralRatio).div(
                PRICE_PRECISION
            );
        uint256 collateralAmount =
            collateral_dollar_value.mul(PRICE_PRECISION).div(col_price_usd);

        require(
            collateralAmount <=
                collateralToken.balanceOf(address(this)).sub(
                    unclaimedPoolCollateral
                ),
            'Not enough collateral in pool'
        );
        require(
            COLLATERAL_out_min <= collateralAmount,
            'Slippage limit reached [collateral]'
        );
        require(ARTHXOutMin <= arthxAmount, 'Slippage limit reached [ARTHX]');

        redeemCollateralBalances[msg.sender] += collateralAmount;
        unclaimedPoolCollateral += collateralAmount;

        redeemARTHXBalances[msg.sender] += arthxAmount;
        unclaimedPoolARTHX += arthxAmount;

        lastRedeemed[msg.sender] = block.number;

        _chargeStabilityFee(ARTH_amount);

        // Move all external functions to the end
        ARTH.poolBurnFrom(msg.sender, ARTH_amount);
        ARTHX.poolMint(address(this), arthxAmount);
    }

    // Redeem ARTH for ARTHX. 0% collateral-backed
    function redeemAlgorithmicARTH(uint256 ARTH_amount, uint256 ARTHXOutMin)
        external
        notRedeemPaused
    {
        uint256 arthxPrice = controller.arthxPrice();
        uint256 globalCollateralRatio = controller.globalCollateralRatio();

        require(globalCollateralRatio == 0, 'Collateral ratio must be 0');
        uint256 arthx_dollar_value_d18 = ARTH_amount;

        arthx_dollar_value_d18 = (
            arthx_dollar_value_d18.mul(uint256(1e6).sub(redemptionFee))
        )
            .div(PRICE_PRECISION); // apply fees

        uint256 arthxAmount =
            arthx_dollar_value_d18.mul(PRICE_PRECISION).div(arthxPrice);

        redeemARTHXBalances[msg.sender] = redeemARTHXBalances[msg.sender].add(
            arthxAmount
        );
        unclaimedPoolARTHX += arthxAmount;

        lastRedeemed[msg.sender] = block.number;

        require(ARTHXOutMin <= arthxAmount, 'Slippage limit reached');

        _chargeStabilityFee(ARTH_amount);

        // Move all external functions to the end
        ARTH.poolBurnFrom(msg.sender, ARTH_amount);
        ARTHX.poolMint(address(this), arthxAmount);
    }

    // After a redemption happens, transfer the newly minted ARTHX and owed collateral from this pool
    // contract to the user. Redemption is split into two functions to prevent flash loans from being able
    // to take out ARTH/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
    function collectRedemption() external {
        require(
            (lastRedeemed[msg.sender].add(redemptionDelay)) <= block.number,
            'Must wait for redemptionDelay blocks before collecting redemption'
        );
        bool sendARTHX = false;
        bool sendCollateral = false;
        uint256 ARTHXAmount;
        uint256 CollateralAmount;

        // Use Checks-Effects-Interactions pattern
        if (redeemARTHXBalances[msg.sender] > 0) {
            ARTHXAmount = redeemARTHXBalances[msg.sender];
            redeemARTHXBalances[msg.sender] = 0;
            unclaimedPoolARTHX = unclaimedPoolARTHX.sub(ARTHXAmount);

            sendARTHX = true;
        }

        if (redeemCollateralBalances[msg.sender] > 0) {
            CollateralAmount = redeemCollateralBalances[msg.sender];
            redeemCollateralBalances[msg.sender] = 0;
            unclaimedPoolCollateral = unclaimedPoolCollateral.sub(
                CollateralAmount
            );

            sendCollateral = true;
        }

        if (sendARTHX == true) {
            ARTHX.transfer(msg.sender, ARTHXAmount);
        }
        if (sendCollateral == true) {
            collateralToken.transfer(msg.sender, CollateralAmount);
        }
    }

    function getTargetCollateralValue() public view returns (uint256) {
        return
            ARTH.totalSupply().mul(controller.globalCollateralRatio()).div(1e6);
    }

    // keep this in another function
    function getCurveExponent() public view returns (uint256) {
        uint256 targetCollatValue = getTargetCollateralValue();
        uint256 currentCollatValue = controller.globalCollateralValue();

        if (targetCollatValue <= currentCollatValue) return 0;

        return
            targetCollatValue
                .sub(currentCollatValue)
                .mul(1e6)
                .div(targetCollatValue)
                .div(1e6);
    }

    // TODO make this into another contract which handles the curve
    function getCurvedDiscount() public view returns (uint256) {
        uint256 exponent = getCurveExponent();
        if (exponent == 0) return 0;

        uint256 discount = (10**exponent).sub(1).div(10).mul(bonus_rate);

        // Fail safe cap to bonus_rate.
        return discount > bonus_rate ? bonus_rate : discount;
    }

    // When the protocol is recollateralizing, we need to give a discount of ARTHX to hit the new CR target
    // Thus, if the target collateral ratio is higher than the actual value of collateral, minters get ARTHX for adding collateral
    // This function simply rewards anyone that sends collateral to a pool with the same amount of ARTHX + the bonus rate
    // Anyone can call this function to recollateralize the protocol and take the extra ARTHX value from the bonus rate as an arb opportunity
    function recollateralizeARTH(uint256 collateralAmount, uint256 ARTHXOutMin)
        external
        returns (uint256)
    {
        require(recollateralizePaused == false, 'Recollateralize is paused');
        uint256 collateralAmount_d18 =
            collateralAmount * (10**missing_decimals);
        uint256 arthxPrice = controller.arthxPrice();
        uint256 arth_total_supply = ARTH.totalSupply();
        uint256 globalCollateralRatio = controller.globalCollateralRatio();
        uint256 globalCollatValue = controller.globalCollateralValue();

        (uint256 collateral_units, uint256 amount_to_recollat) =
            ArthPoolLibrary.calcRecollateralizeARTHInner(
                collateralAmount_d18,
                getCollateralPrice(),
                globalCollatValue,
                arth_total_supply,
                globalCollateralRatio
            );

        uint256 collateral_units_precision =
            collateral_units.div(10**missing_decimals);

        // NEED to make sure that recollatFee is less than 1e6.
        uint256 arthx_paid_back =
            amount_to_recollat
                .mul(uint256(1e6).add(getCurvedDiscount()).sub(recollatFee))
                .div(arthxPrice);

        require(ARTHXOutMin <= arthx_paid_back, 'Slippage limit reached');

        // TODO: check balance of the user; to avoid forcedao type bugs

        collateralToken.transferFrom(
            msg.sender,
            address(this),
            collateral_units_precision
        );

        ARTHX.poolMint(msg.sender, arthx_paid_back);
        return arthx_paid_back;
    }

    // Function can be called by an ARTHX holder to have the protocol buy back ARTHX with excess collateral value from a desired collateral pool
    // This can also happen if the collateral ratio > 1
    function buyBackARTHX(uint256 arthxAmount, uint256 COLLATERAL_out_min)
        external
    {
        require(buyBackPaused == false, 'Buyback is paused');
        uint256 arthxPrice = controller.arthxPrice();

        ArthPoolLibrary.BuybackARTHX_Params memory input_params =
            ArthPoolLibrary.BuybackARTHX_Params(
                availableExcessCollatDV(),
                arthxPrice,
                getCollateralPrice(),
                arthxAmount
            );

        uint256 collateral_equivalent_d18 =
            (ArthPoolLibrary.calcBuyBackARTHX(input_params))
                .mul(uint256(1e6).sub(buybackFee))
                .div(1e6);
        uint256 collateral_precision =
            collateral_equivalent_d18.div(10**missing_decimals);

        require(
            COLLATERAL_out_min <= collateral_precision,
            'Slippage limit reached'
        );
        // Give the sender their desired collateral and burn the ARTHX
        ARTHX.poolBurnFrom(msg.sender, arthxAmount);
        collateralToken.transfer(msg.sender, collateral_precision);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function toggleMinting() external {
        require(hasRole(MINT_PAUSER, msg.sender));
        mintPaused = !mintPaused;
    }

    function toggleRedeeming() external {
        require(hasRole(REDEEM_PAUSER, msg.sender));
        redeemPaused = !redeemPaused;
    }

    function toggleRecollateralize() external {
        require(hasRole(RECOLLATERALIZE_PAUSER, msg.sender));
        recollateralizePaused = !recollateralizePaused;
    }

    function toggleBuyBack() external {
        require(hasRole(BUYBACK_PAUSER, msg.sender));
        buyBackPaused = !buyBackPaused;
    }

    function toggleCollateralPrice(uint256 _new_price) external {
        require(hasRole(COLLATERAL_PRICE_PAUSER, msg.sender));
        // If pausing, set paused price; else if unpausing, clear pausedPrice
        if (collateralPricePaused == false) {
            pausedPrice = _new_price;
        } else {
            pausedPrice = 0;
        }
        collateralPricePaused = !collateralPricePaused;
    }

    // Combined into one function due to 24KiB contract memory limit
    function setPoolParameters(
        uint256 new_ceiling,
        uint256 new_bonus_rate,
        uint256 new_redemptionDelay,
        uint256 new_mint_fee,
        uint256 new_redeem_fee,
        uint256 new_buybackFee,
        uint256 new_recollatFee
    ) external onlyByOwnerOrGovernance {
        pool_ceiling = new_ceiling;
        bonus_rate = new_bonus_rate;
        redemptionDelay = new_redemptionDelay;
        mintingFee = new_mint_fee;
        redemptionFee = new_redeem_fee;
        buybackFee = new_buybackFee;
        recollatFee = new_recollatFee;
    }

    function setTimelock(address new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        timelock_address = new_timelock;
    }

    function setOwner(address _ownerAddress) external onlyByOwnerOrGovernance {
        ownerAddress = _ownerAddress;
    }
}
