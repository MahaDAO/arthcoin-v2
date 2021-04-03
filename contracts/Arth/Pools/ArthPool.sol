// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../../Arth/Arth.sol';
import '../../ARTHS/ARTHS.sol';
import '../../ERC20/ERC20.sol';
import './ArthPoolLibrary.sol';
import '../../Math/SafeMath.sol';
import '../../Oracle/ISimpleOracle.sol';
import '../../Oracle/UniswapPairOracle.sol';
import '../../Governance/AccessControl.sol';
import '../../Staking/IMintAndCallFallBack.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
contract ArthPool is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    ERC20 private stability_fee_token;

    // TODO: replace this oracle with chainlink oracle.
    ISimpleOracle public arth_stability_token_oracle;

    address private owner_address;
    address private collateral_address;

    ARTHShares private ARTHS;
    ARTHStablecoin private ARTH;
    address private timelock_address;
    address private arths_contract_address;
    address private arth_contract_address;

    address private weth_address;
    address public collat_eth_oracle_address;
    UniswapPairOracle private collatEthOracle;

    uint256 public buyback_fee;
    uint256 public minting_fee;
    uint256 public recollat_fee;
    uint256 public redemption_fee;
    uint256 public stability_fee = 1; // In %.

    uint256 public unclaimedPoolARTHS;
    uint256 public unclaimedPoolCollateral;
    mapping(address => uint256) public lastRedeemed;
    mapping(address => uint256) public redeemARTHSBalances;
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

    // Bonus rate on ARTHS minted during recollateralizeARTH(); 6 decimals of precision, set to 0.75% on genesis
    uint256 public bonus_rate = 7500;

    // Number of blocks to wait before being able to collectRedemption()
    uint256 public redemption_delay = 1;

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
    event StabilityFeesCharged(address indexed from, uint256 amount);

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == timelock_address || msg.sender == owner_address,
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
                msg.sender == owner_address,
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
        address _arths_contract_address,
        address _collateral_address,
        address _creator_address,
        address _timelock_address,
        address _stability_fee_token,
        address _arth_stability_token_oracle,
        uint256 _pool_ceiling
    ) {
        ARTH = ARTHStablecoin(_arth_contract_address);
        ARTHS = ARTHShares(_arths_contract_address);
        arth_contract_address = _arth_contract_address;
        arths_contract_address = _arths_contract_address;
        collateral_address = _collateral_address;
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        collateral_token = ERC20(_collateral_address);
        pool_ceiling = _pool_ceiling;
        missing_decimals = uint256(18).sub(collateral_token.decimals());

        stability_fee_token = ERC20(_stability_fee_token);
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

        stability_fee = percent;
    }

    /* ========== VIEWS ========== */

    // Returns dollar value of collateral held in this Arth pool
    function collatDollarBalance() public view returns (uint256) {
        if (collateralPricePaused == true) {
            return
                (
                    collateral_token.balanceOf(address(this)).sub(
                        unclaimedPoolCollateral
                    )
                )
                    .mul(10**missing_decimals)
                    .mul(pausedPrice)
                    .div(PRICE_PRECISION);
        } else {
            uint256 eth_usd_price = ARTH.eth_usd_price();
            uint256 eth_collat_price =
                collatEthOracle.consult(
                    weth_address,
                    PRICE_PRECISION * (10**missing_decimals)
                );

            uint256 collat_usd_price =
                eth_usd_price.mul(PRICE_PRECISION).div(eth_collat_price);
            return
                (
                    collateral_token.balanceOf(address(this)).sub(
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
        uint256 global_collateral_ratio = ARTH.global_collateral_ratio();
        uint256 global_collat_value = ARTH.globalCollateralValue();

        if (global_collateral_ratio > COLLATERAL_RATIO_PRECISION)
            global_collateral_ratio = COLLATERAL_RATIO_PRECISION; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 =
            (total_supply.mul(global_collateral_ratio)).div(
                COLLATERAL_RATIO_PRECISION
            ); // Calculates collateral needed to back each 1 ARTH with $1 of collateral at current collat ratio
        if (global_collat_value > required_collat_dollar_value_d18)
            return global_collat_value.sub(required_collat_dollar_value_d18);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    // Returns the price of the pool collateral in USD
    function getCollateralPrice() public view returns (uint256) {
        if (collateralPricePaused == true) {
            return pausedPrice;
        } else {
            uint256 eth_usd_price = ARTH.eth_usd_price();
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
            collateral_token.balanceOf(address(this)) > _amount,
            'ArthPool: Insufficent funds in the pool'
        );

        collateral_token.transfer(msg.sender, _amount);
        borrowedCollateral[msg.sender] += _amount;
        emit Borrow(msg.sender, _amount);
    }

    function repay(uint256 _amount) external onlyAMOS {
        require(
            borrowedCollateral[msg.sender] > 0,
            "ArthPool: Repayer doesn't not have any debt"
        );

        collateral_token.transferFrom(msg.sender, address(this), _amount);
        borrowedCollateral[msg.sender] -= _amount;
        emit Repay(msg.sender, _amount);
    }

    // We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency
    function _mint1t1ARTH(uint256 collateral_amount, uint256 ARTH_out_min)
        private
        notMintPaused
        returns (uint256)
    {
        uint256 collateral_amount_d18 =
            collateral_amount * (10**missing_decimals);

        require(
            ARTH.global_collateral_ratio() >= COLLATERAL_RATIO_MAX,
            'Collateral ratio must be >= 1'
        );
        require(
            (collateral_token.balanceOf(address(this)))
                .sub(unclaimedPoolCollateral)
                .add(collateral_amount) <= pool_ceiling,
            "[Pool's Closed]: Ceiling reached"
        );

        uint256 arth_amount_d18 =
            ArthPoolLibrary.calcMint1t1ARTH(
                getCollateralPrice(),
                collateral_amount_d18
            ); //1 ARTH for each $1 worth of collateral

        arth_amount_d18 = (arth_amount_d18.mul(uint256(1e6).sub(minting_fee)))
            .div(1e6); //remove precision at the end
        require(ARTH_out_min <= arth_amount_d18, 'Slippage limit reached');

        collateral_token.transferFrom(
            msg.sender,
            address(this),
            collateral_amount
        );

        ARTH.pool_mint(msg.sender, arth_amount_d18);

        return arth_amount_d18;
    }

    function mint1t1ARTH(uint256 collateral_amount, uint256 ARTH_out_min)
        external
    {
        _mint1t1ARTH(collateral_amount, ARTH_out_min);
    }

    function mint1t1ARTHAndCall(
        uint256 collateral_amount,
        uint256 ARTH_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 amountToStake = _mint1t1ARTH(collateral_amount, ARTH_out_min);

        ARTH.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)), //amountToStake,
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountToStake, _extraData);
    }

    // 0% collateral-backed
    function _mintAlgorithmicARTH(
        uint256 arths_amount_d18,
        uint256 ARTH_out_min
    ) private notMintPaused returns (uint256) {
        uint256 arths_price = ARTH.arths_price();
        require(
            ARTH.global_collateral_ratio() == 0,
            'Collateral ratio must be 0'
        );

        uint256 arth_amount_d18 =
            ArthPoolLibrary.calcMintAlgorithmicARTH(
                arths_price, // X ARTHS / 1 USD
                arths_amount_d18
            );

        arth_amount_d18 = (arth_amount_d18.mul(uint256(1e6).sub(minting_fee)))
            .div(1e6);
        require(ARTH_out_min <= arth_amount_d18, 'Slippage limit reached');

        ARTHS.pool_burn_from(msg.sender, arths_amount_d18);
        ARTH.pool_mint(msg.sender, arth_amount_d18);

        return arth_amount_d18;
    }

    // 0% collateral-backed
    function mintAlgorithmicARTH(uint256 arths_amount_d18, uint256 ARTH_out_min)
        external
        notMintPaused
    {
        _mintAlgorithmicARTH(arths_amount_d18, ARTH_out_min);
    }

    // 0% collateral-backed
    function mintAlgorithmicARTHAndCall(
        uint256 arths_amount_d18,
        uint256 ARTH_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 amountToStake =
            _mintAlgorithmicARTH(arths_amount_d18, ARTH_out_min);

        ARTH.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountToStake, _extraData);
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    function _mintFractionalARTH(
        uint256 collateral_amount,
        uint256 arths_amount,
        uint256 ARTH_out_min
    ) private notMintPaused returns (uint256) {
        uint256 arths_price = ARTH.arths_price();
        uint256 global_collateral_ratio = ARTH.global_collateral_ratio();

        require(
            global_collateral_ratio < COLLATERAL_RATIO_MAX &&
                global_collateral_ratio > 0,
            'Collateral ratio needs to be between .000001 and .999999'
        );
        require(
            collateral_token
                .balanceOf(address(this))
                .sub(unclaimedPoolCollateral)
                .add(collateral_amount) <= pool_ceiling,
            'Pool ceiling reached, no more ARTH can be minted with this collateral'
        );

        uint256 collateral_amount_d18 =
            collateral_amount * (10**missing_decimals);
        ArthPoolLibrary.MintFF_Params memory input_params =
            ArthPoolLibrary.MintFF_Params(
                arths_price,
                getCollateralPrice(),
                arths_amount,
                collateral_amount_d18,
                global_collateral_ratio
            );

        (uint256 mint_amount, uint256 arths_needed) =
            ArthPoolLibrary.calcMintFractionalARTH(input_params);

        mint_amount = (mint_amount.mul(uint256(1e6).sub(minting_fee))).div(1e6);
        require(ARTH_out_min <= mint_amount, 'Slippage limit reached');
        require(arths_needed <= arths_amount, 'Not enough ARTHS inputted');

        ARTHS.pool_burn_from(msg.sender, arths_needed);
        collateral_token.transferFrom(
            msg.sender,
            address(this),
            collateral_amount
        );
        ARTH.pool_mint(address(this), mint_amount);

        return mint_amount;
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    function mintFractionalARTH(
        uint256 collateral_amount,
        uint256 arths_amount,
        uint256 ARTH_out_min
    ) external notMintPaused {
        _mintFractionalARTH(collateral_amount, arths_amount, ARTH_out_min);
    }

    function mintFractionalARTHAndCall(
        uint256 collateral_amount,
        uint256 arths_amount,
        uint256 ARTH_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external notMintPaused {
        uint256 amountToStake =
            _mintFractionalARTH(collateral_amount, arths_amount, ARTH_out_min);

        ARTH.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountToStake, _extraData);
    }

    function getARTHStabilityTokenOraclePrice() public view returns (uint256) {
        return arth_stability_token_oracle.getPrice();
    }

    function _chargeStabilityFee(uint256 amount) internal {
        require(amount > 0, 'ArthPool: amount = 0');

        if (stability_fee > 0) {
            uint256 stability_fee_in_ARTH = amount.mul(stability_fee).div(100);

            uint256 stability_fee_to_charge =
                getARTHStabilityTokenOraclePrice()
                    .mul(stability_fee_in_ARTH)
                    .div(1e18); // NOTE: this is might change asper ARTH's decimals and price precision.

            stability_fee_token.burnFrom(msg.sender, stability_fee_to_charge);

            emit StabilityFeesCharged(msg.sender, stability_fee_to_charge);
        }

        return;
    }

    // Redeem collateral. 100% collateral-backed
    function redeem1t1ARTH(uint256 ARTH_amount, uint256 COLLATERAL_out_min)
        external
        notRedeemPaused
    {
        require(
            ARTH.global_collateral_ratio() == COLLATERAL_RATIO_MAX,
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
            collateral_needed.mul(uint256(1e6).sub(redemption_fee))
        )
            .div(1e6);
        require(
            collateral_needed <=
                collateral_token.balanceOf(address(this)).sub(
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
        ARTH.pool_burn_from(msg.sender, ARTH_amount);
    }

    // Will fail if fully collateralized or algorithmic
    // Redeem ARTH for collateral and ARTHS. > 0% and < 100% collateral-backed
    function redeemFractionalARTH(
        uint256 ARTH_amount,
        uint256 ARTHS_out_min,
        uint256 COLLATERAL_out_min
    ) external notRedeemPaused {
        uint256 arths_price = ARTH.arths_price();
        uint256 global_collateral_ratio = ARTH.global_collateral_ratio();

        require(
            global_collateral_ratio < COLLATERAL_RATIO_MAX &&
                global_collateral_ratio > 0,
            'Collateral ratio needs to be between .000001 and .999999'
        );
        uint256 col_price_usd = getCollateralPrice();

        uint256 ARTH_amount_post_fee =
            (ARTH_amount.mul(uint256(1e6).sub(redemption_fee))).div(
                PRICE_PRECISION
            );

        uint256 arths_dollar_value_d18 =
            ARTH_amount_post_fee.sub(
                ARTH_amount_post_fee.mul(global_collateral_ratio).div(
                    PRICE_PRECISION
                )
            );
        uint256 arths_amount =
            arths_dollar_value_d18.mul(PRICE_PRECISION).div(arths_price);

        // Need to adjust for decimals of collateral
        uint256 ARTH_amount_precision =
            ARTH_amount_post_fee.div(10**missing_decimals);
        uint256 collateral_dollar_value =
            ARTH_amount_precision.mul(global_collateral_ratio).div(
                PRICE_PRECISION
            );
        uint256 collateral_amount =
            collateral_dollar_value.mul(PRICE_PRECISION).div(col_price_usd);

        require(
            collateral_amount <=
                collateral_token.balanceOf(address(this)).sub(
                    unclaimedPoolCollateral
                ),
            'Not enough collateral in pool'
        );
        require(
            COLLATERAL_out_min <= collateral_amount,
            'Slippage limit reached [collateral]'
        );
        require(
            ARTHS_out_min <= arths_amount,
            'Slippage limit reached [ARTHS]'
        );

        redeemCollateralBalances[msg.sender] += collateral_amount;
        unclaimedPoolCollateral += collateral_amount;

        redeemARTHSBalances[msg.sender] += arths_amount;
        unclaimedPoolARTHS += arths_amount;

        lastRedeemed[msg.sender] = block.number;

        _chargeStabilityFee(ARTH_amount);

        // Move all external functions to the end
        ARTH.pool_burn_from(msg.sender, ARTH_amount);
        ARTHS.pool_mint(address(this), arths_amount);
    }

    // Redeem ARTH for ARTHS. 0% collateral-backed
    function redeemAlgorithmicARTH(uint256 ARTH_amount, uint256 ARTHS_out_min)
        external
        notRedeemPaused
    {
        uint256 arths_price = ARTH.arths_price();
        uint256 global_collateral_ratio = ARTH.global_collateral_ratio();

        require(global_collateral_ratio == 0, 'Collateral ratio must be 0');
        uint256 arths_dollar_value_d18 = ARTH_amount;

        arths_dollar_value_d18 = (
            arths_dollar_value_d18.mul(uint256(1e6).sub(redemption_fee))
        )
            .div(PRICE_PRECISION); //apply fees

        uint256 arths_amount =
            arths_dollar_value_d18.mul(PRICE_PRECISION).div(arths_price);

        redeemARTHSBalances[msg.sender] = redeemARTHSBalances[msg.sender].add(
            arths_amount
        );
        unclaimedPoolARTHS += arths_amount;

        lastRedeemed[msg.sender] = block.number;

        require(ARTHS_out_min <= arths_amount, 'Slippage limit reached');

        _chargeStabilityFee(ARTH_amount);

        // Move all external functions to the end
        ARTH.pool_burn_from(msg.sender, ARTH_amount);
        ARTHS.pool_mint(address(this), arths_amount);
    }

    // After a redemption happens, transfer the newly minted ARTHS and owed collateral from this pool
    // contract to the user. Redemption is split into two functions to prevent flash loans from being able
    // to take out ARTH/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
    function collectRedemption() external {
        require(
            (lastRedeemed[msg.sender].add(redemption_delay)) <= block.number,
            'Must wait for redemption_delay blocks before collecting redemption'
        );
        bool sendARTHS = false;
        bool sendCollateral = false;
        uint256 ARTHSAmount;
        uint256 CollateralAmount;

        // Use Checks-Effects-Interactions pattern
        if (redeemARTHSBalances[msg.sender] > 0) {
            ARTHSAmount = redeemARTHSBalances[msg.sender];
            redeemARTHSBalances[msg.sender] = 0;
            unclaimedPoolARTHS = unclaimedPoolARTHS.sub(ARTHSAmount);

            sendARTHS = true;
        }

        if (redeemCollateralBalances[msg.sender] > 0) {
            CollateralAmount = redeemCollateralBalances[msg.sender];
            redeemCollateralBalances[msg.sender] = 0;
            unclaimedPoolCollateral = unclaimedPoolCollateral.sub(
                CollateralAmount
            );

            sendCollateral = true;
        }

        if (sendARTHS == true) {
            ARTHS.transfer(msg.sender, ARTHSAmount);
        }
        if (sendCollateral == true) {
            collateral_token.transfer(msg.sender, CollateralAmount);
        }
    }

    function getTargetCollateralValue() public view returns (uint256) {
        return ARTH.totalSupply().mul(ARTH.global_collateral_ratio()).div(1e6);
    }

    function getCurveExponent() public view returns (uint256) {
        uint256 targetCollatValue = getTargetCollateralValue();
        uint256 currentCollatValue = ARTH.globalCollateralValue();

        if (targetCollatValue <= currentCollatValue) return 0;

        return
            targetCollatValue
                .sub(currentCollatValue)
                .mul(1e6)
                .div(targetCollatValue)
                .div(1e6);
    }

    function getCurvedDiscount() public view returns (uint256) {
        uint256 exponent = getCurveExponent();
        if (exponent == 0) return 0;

        uint256 discount = (10**exponent).sub(1).div(10).mul(bonus_rate);

        // Fail safe cap to bonus_rate.
        return discount > bonus_rate ? bonus_rate : discount;
    }

    // When the protocol is recollateralizing, we need to give a discount of ARTHS to hit the new CR target
    // Thus, if the target collateral ratio is higher than the actual value of collateral, minters get ARTHS for adding collateral
    // This function simply rewards anyone that sends collateral to a pool with the same amount of ARTHS + the bonus rate
    // Anyone can call this function to recollateralize the protocol and take the extra ARTHS value from the bonus rate as an arb opportunity
    function _recollateralizeARTH(
        uint256 collateral_amount,
        uint256 ARTHS_out_min
    ) private returns (uint256) {
        require(recollateralizePaused == false, 'Recollateralize is paused');
        uint256 collateral_amount_d18 =
            collateral_amount * (10**missing_decimals);
        uint256 arths_price = ARTH.arths_price();
        uint256 arth_total_supply = ARTH.totalSupply();
        uint256 global_collateral_ratio = ARTH.global_collateral_ratio();
        uint256 global_collat_value = ARTH.globalCollateralValue();

        (uint256 collateral_units, uint256 amount_to_recollat) =
            ArthPoolLibrary.calcRecollateralizeARTHInner(
                collateral_amount_d18,
                getCollateralPrice(),
                global_collat_value,
                arth_total_supply,
                global_collateral_ratio
            );

        uint256 collateral_units_precision =
            collateral_units.div(10**missing_decimals);

        // NEED to make sure that recollat_fee is less than 1e6.
        uint256 arths_paid_back =
            amount_to_recollat
                .mul(uint256(1e6).add(getCurvedDiscount()).sub(recollat_fee))
                .div(arths_price);

        require(ARTHS_out_min <= arths_paid_back, 'Slippage limit reached');
        collateral_token.transferFrom(
            msg.sender,
            address(this),
            collateral_units_precision
        );

        ARTHS.pool_mint(msg.sender, arths_paid_back);

        return arths_paid_back;
    }

    function recollateralizeARTH(
        uint256 collateral_amount,
        uint256 ARTHS_out_min
    ) external {
        _recollateralizeARTH(collateral_amount, ARTHS_out_min);
    }

    function recollateralizeARTHAndCall(
        uint256 collateral_amount,
        uint256 ARTHS_out_min,
        IMintAndCallFallBack _spender,
        bytes memory _extraData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        uint256 amountToStake =
            _recollateralizeARTH(collateral_amount, ARTHS_out_min);

        ARTHS.permit(
            msg.sender,
            address(_spender),
            uint256(int256(-1)),
            block.timestamp,
            v,
            r,
            s
        );

        _spender.receiveMint(msg.sender, amountToStake, _extraData);
    }

    // Function can be called by an ARTHS holder to have the protocol buy back ARTHS with excess collateral value from a desired collateral pool
    // This can also happen if the collateral ratio > 1
    function buyBackARTHS(uint256 ARTHS_amount, uint256 COLLATERAL_out_min)
        external
    {
        require(buyBackPaused == false, 'Buyback is paused');
        uint256 arths_price = ARTH.arths_price();

        ArthPoolLibrary.BuybackARTHS_Params memory input_params =
            ArthPoolLibrary.BuybackARTHS_Params(
                availableExcessCollatDV(),
                arths_price,
                getCollateralPrice(),
                ARTHS_amount
            );

        uint256 collateral_equivalent_d18 =
            (ArthPoolLibrary.calcBuyBackARTHS(input_params))
                .mul(uint256(1e6).sub(buyback_fee))
                .div(1e6);
        uint256 collateral_precision =
            collateral_equivalent_d18.div(10**missing_decimals);

        require(
            COLLATERAL_out_min <= collateral_precision,
            'Slippage limit reached'
        );
        // Give the sender their desired collateral and burn the ARTHS
        ARTHS.pool_burn_from(msg.sender, ARTHS_amount);
        collateral_token.transfer(msg.sender, collateral_precision);
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
        uint256 new_redemption_delay,
        uint256 new_mint_fee,
        uint256 new_redeem_fee,
        uint256 new_buyback_fee,
        uint256 new_recollat_fee
    ) external onlyByOwnerOrGovernance {
        pool_ceiling = new_ceiling;
        bonus_rate = new_bonus_rate;
        redemption_delay = new_redemption_delay;
        minting_fee = new_mint_fee;
        redemption_fee = new_redeem_fee;
        buyback_fee = new_buyback_fee;
        recollat_fee = new_recollat_fee;
    }

    function setTimelock(address new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    /* ========== EVENTS ========== */
}
