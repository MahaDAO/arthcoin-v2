// // SPDX-License-Identifier: MIT

// pragma solidity ^0.8.0;
// pragma experimental ABIEncoderV2;

// import '../../Arth/Arth.sol';
// import '../../Math/Math.sol';
// import '../../ERC20/ERC20.sol';
// import '../../ARTHS/ARTHS.sol';
// import '../../Math/SafeMath.sol';
// import '../../Uniswap/UniswapV2Library.sol';
// import '../../Oracle/UniswapPairOracle.sol';
// import '../../Governance/AccessControl.sol';

// /**
//  *  Original code written by:
//  *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun,
//  *  - github.com/denett
//  *  - github.com/realisation
//  *  Code modified by:
//  *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
//  * TODO: 1) Have to call getVirtualReserves() on every update of the reserve, such that we can call _update with the averages of the reserve
//  */
// contract ArthPoolvAMM is AccessControl {
//     using SafeMath for uint256;

//     ERC20 private collateral_token;
//     ARTHStablecoin private ARTH;
//     ARTHShares private ARTHS;
//     UniswapPairOracle private arthsUSDCOracle;

//     address private collateral_address;
//     address private arth_contract_address;
//     address private arths_contract_address;
//     address public arths_usdc_oracle_address;
//     address private uniswap_factory;

//     address private owner_address;
//     address private timelock_address;

//     uint256 public minting_fee;
//     uint256 public redemption_fee;
//     uint256 public buyback_fee;
//     uint256 public recollat_fee;

//     // Mint check tolerance
//     uint256 public max_drift_band;

//     mapping(address => uint256) public redeemARTHSBalances;
//     mapping(address => uint256) public redeemCollateralBalances;
//     uint256 public unclaimedPoolCollateral;
//     uint256 public unclaimedPoolARTHS;
//     mapping(address => uint256) public lastRedeemed;

//     // Constants for various precisions
//     uint256 private constant PRICE_PRECISION = 1e6;
//     uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;
//     uint256 private constant COLLATERAL_RATIO_MAX = 1e6;

//     // Number of decimals needed to get to 18
//     uint256 public immutable missing_decimals;
//     // Pool_ceiling is the total units of collateral that a pool contract can hold
//     uint256 public pool_ceiling;
//     // Stores price of the collateral, if price is paused
//     uint256 public pausedPrice;
//     // Bonus rate on ARTHS minted during recollateralizeARTH(); 6 decimals of precision
//     uint256 public bonus_rate;
//     // Number of blocks to wait before being able to collectRedemption()
//     uint256 public redemption_delay;
//     // Number of seconds to wait before refreshing virtual AMM reserves
//     uint256 public reserve_refresh_cooldown;
//     // Last reserve refresh
//     uint256 public last_reserve_refresh;

//     // For investing collateral
//     uint256 public global_investment_cap_percentage = 10000; // 1e6 precision
//     uint256 public collateral_invested = 0; // Keeps track of how much collateral the investor was given
//     address public investor_contract_address; // All of the investing code logic will be offloaded to the investor contract

//     // AccessControl Roles
//     bytes32 private constant MINT_PAUSER = keccak256('MINT_PAUSER');
//     bytes32 private constant REDEEM_PAUSER = keccak256('REDEEM_PAUSER');
//     bytes32 private constant BUYBACK_PAUSER = keccak256('BUYBACK_PAUSER');
//     bytes32 private constant RECOLLATERALIZE_PAUSER =
//         keccak256('RECOLLATERALIZE_PAUSER');
//     bytes32 private constant COLLATERAL_PRICE_PAUSER =
//         keccak256('COLLATERAL_PRICE_PAUSER');

//     // AccessControl state variables
//     bool public mintPaused = false;
//     bool public redeemPaused = false;
//     bool public recollateralizePaused = false;
//     bool public buyBackPaused = false;
//     bool public collateralPricePaused = false;

//     // Drift related
//     uint256 public drift_end_time = 0;
//     uint256 public last_update_time = 0;
//     uint256 public collat_virtual_reserves = 0;
//     uint256 public arths_virtual_reserves = 0; // Needs to be nonzero here initially
//     uint256 drift_arths_positive = 0;
//     uint256 drift_arths_negative = 0;
//     uint256 drift_collat_positive = 0;
//     uint256 drift_collat_negative = 0;
//     uint256 public arths_price_cumulative = 0;
//     uint256 public arths_price_cumulative_prev = 0;
//     uint256 public last_drift_refresh = 0;
//     uint256 public drift_refresh_period = 0;
//     uint256 public k_virtual_amm = 0;

//     /* ========== MODIFIERS ========== */

//     modifier onlyByOwnerOrGovernance() {
//         require(
//             msg.sender == timelock_address || msg.sender == owner_address,
//             'You are not the owner or the governance timelock'
//         );
//         _;
//     }

//     modifier onlyInvestor() {
//         require(
//             msg.sender == investor_contract_address,
//             'You are not the investor'
//         );
//         _;
//     }

//     modifier notMintPaused() {
//         require(mintPaused == false, 'Minting is paused');
//         _;
//     }

//     modifier notRedeemPaused() {
//         require(redeemPaused == false, 'Redeeming is paused');
//         _;
//     }

//     /* ========== CONSTRUCTOR ========== */

//     constructor(
//         address _arth_contract_address,
//         address _arths_contract_address,
//         address _collateral_address,
//         address _creator_address,
//         address _timelock_address,
//         address _uniswap_factory_address,
//         address _arths_usdc_oracle_addr,
//         uint256 _pool_ceiling
//     ) {
//         ARTH = ARTHStablecoin(_arth_contract_address);
//         ARTHS = ARTHShares(_arths_contract_address);
//         arth_contract_address = _arth_contract_address;
//         arths_contract_address = _arths_contract_address;
//         collateral_address = _collateral_address;
//         timelock_address = _timelock_address;
//         owner_address = _creator_address;
//         collateral_token = ERC20(_collateral_address);
//         pool_ceiling = _pool_ceiling;
//         uniswap_factory = _uniswap_factory_address;

//         missing_decimals = uint256(18).sub(collateral_token.decimals());
//         pool_ceiling = 100000e6;
//         pausedPrice = 0;
//         bonus_rate = 0;
//         redemption_delay = 2;
//         reserve_refresh_cooldown = 3600;
//         minting_fee = 4500;
//         redemption_fee = 4500;
//         buyback_fee = 4500;
//         recollat_fee = 4500;
//         max_drift_band = 50000; // 5%. Also used to potentially curtail sandwich attacks

//         drift_refresh_period = 900;

//         last_update_time = block.timestamp.sub(drift_refresh_period + 1);
//         drift_end_time = block.timestamp.sub(1);

//         arths_usdc_oracle_address = _arths_usdc_oracle_addr;
//         arthsUSDCOracle = UniswapPairOracle(_arths_usdc_oracle_addr);

//         (uint112 reserve0, uint112 reserve1, ) =
//             arthsUSDCOracle.pair().getReserves();
//         if (arthsUSDCOracle.token0() == arths_contract_address) {
//             arths_virtual_reserves = reserve0;
//             collat_virtual_reserves = reserve1;
//         } else {
//             arths_virtual_reserves = reserve1;
//             collat_virtual_reserves = reserve0;
//         }

//         _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
//         grantRole(MINT_PAUSER, timelock_address);
//         grantRole(REDEEM_PAUSER, timelock_address);
//         grantRole(RECOLLATERALIZE_PAUSER, timelock_address);
//         grantRole(BUYBACK_PAUSER, timelock_address);
//         grantRole(COLLATERAL_PRICE_PAUSER, timelock_address);
//     }

//     /* ========== VIEWS ========== */

//     // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
//     // uses constant product concept https://uniswap.org/docs/v2/core-concepts/swaps/
//     function getAmountOut(
//         uint256 amountIn,
//         uint256 reserveIn,
//         uint256 reserveOut,
//         uint256 the_fee
//     ) public pure returns (uint256 amountOut) {
//         require(amountIn > 0, 'ARTH_vAMM: INSUFFICIENT_INPUT_AMOUNT');
//         require(
//             reserveIn > 0 && reserveOut > 0,
//             'ARTH_vAMM: INSUFFICIENT_LIQUIDITY'
//         );
//         uint256 amountInWithFee = amountIn.mul(uint256(1e6).sub(the_fee));
//         uint256 numerator = amountInWithFee.mul(reserveOut);
//         uint256 denominator = (reserveIn.mul(1e6)).add(amountInWithFee);
//         amountOut = numerator / denominator;
//     }

//     // Courtesy of github.com/denett
//     function getVirtualReserves()
//         public
//         view
//         returns (
//             uint256 current_arths_virtual_reserves,
//             uint256 current_collat_virtual_reserves,
//             uint256 average_arths_virtual_reserves,
//             uint256 average_collat_virtual_reserves
//         )
//     {
//         current_arths_virtual_reserves = arths_virtual_reserves;
//         current_collat_virtual_reserves = collat_virtual_reserves;
//         uint256 drift_time = 0;
//         if (drift_end_time > last_update_time) {
//             drift_time =
//                 Math.min(block.timestamp, drift_end_time) -
//                 last_update_time;
//             if (drift_time > 0) {
//                 if (drift_arths_positive > 0)
//                     current_arths_virtual_reserves = current_arths_virtual_reserves
//                         .add(drift_arths_positive.mul(drift_time));
//                 else
//                     current_arths_virtual_reserves = current_arths_virtual_reserves
//                         .sub(drift_arths_negative.mul(drift_time));

//                 if (drift_collat_positive > 0)
//                     current_collat_virtual_reserves = current_collat_virtual_reserves
//                         .add(drift_collat_positive.mul(drift_time));
//                 else
//                     current_collat_virtual_reserves = current_collat_virtual_reserves
//                         .sub(drift_collat_negative.mul(drift_time));
//             }
//         }
//         average_arths_virtual_reserves = arths_virtual_reserves
//             .add(current_arths_virtual_reserves)
//             .div(2);
//         average_collat_virtual_reserves = collat_virtual_reserves
//             .add(current_collat_virtual_reserves)
//             .div(2);

//         // Adjust for when time was split between drift and no drift.
//         uint256 time_elapsed = block.timestamp - last_update_time;
//         if (time_elapsed > drift_time && drift_time > 0) {
//             average_arths_virtual_reserves = average_arths_virtual_reserves
//                 .mul(drift_time)
//                 .add(
//                 current_arths_virtual_reserves.mul(time_elapsed.sub(drift_time))
//             )
//                 .div(time_elapsed);
//             average_collat_virtual_reserves = average_collat_virtual_reserves
//                 .mul(drift_time)
//                 .add(
//                 current_collat_virtual_reserves.mul(
//                     time_elapsed.sub(drift_time)
//                 )
//             )
//                 .div(time_elapsed);
//         }
//     }

//     // Courtesy of github.com/denett
//     // Updates the reserve drifts
//     function refreshDrift() external {
//         require(
//             block.timestamp >= drift_end_time,
//             'Drift refresh is cooling down'
//         );

//         // First apply the drift of the previous period
//         (
//             uint256 current_arths_virtual_reserves,
//             uint256 current_collat_virtual_reserves,
//             uint256 average_arths_virtual_reserves,
//             uint256 average_collat_virtual_reserves
//         ) = getVirtualReserves();
//         _update(
//             current_arths_virtual_reserves,
//             current_collat_virtual_reserves,
//             average_arths_virtual_reserves,
//             average_collat_virtual_reserves
//         );

//         // Calculate the reserves at the average internal price over the last period and the current K
//         uint256 time_elapsed = block.timestamp - last_drift_refresh;
//         uint256 average_period_price_arths =
//             (arths_price_cumulative - arths_price_cumulative_prev).div(
//                 time_elapsed
//             );
//         uint256 internal_k =
//             current_arths_virtual_reserves.mul(current_collat_virtual_reserves);
//         uint256 collat_reserves_average_price =
//             sqrt(internal_k.mul(average_period_price_arths));
//         uint256 arths_reserves_average_price =
//             internal_k.div(collat_reserves_average_price);

//         // Calculate the reserves at the average external price over the last period and the target K
//         (uint256 ext_average_arths_usd_price, uint256 ext_k) = getOracleInfo();
//         uint256 targetK =
//             internal_k > ext_k
//                 ? Math.max(ext_k, internal_k.sub(internal_k.div(100))) // Decrease or
//                 : Math.min(ext_k, internal_k.add(internal_k.div(100))); // Increase K no more than 1% per period
//         uint256 ext_collat_reserves_average_price =
//             sqrt(targetK.mul(ext_average_arths_usd_price));
//         uint256 ext_arths_reserves_average_price =
//             targetK.div(ext_collat_reserves_average_price);

//         // Calculate the drifts per second
//         if (collat_reserves_average_price < ext_collat_reserves_average_price) {
//             drift_collat_positive = (ext_collat_reserves_average_price -
//                 collat_reserves_average_price)
//                 .div(drift_refresh_period);
//             drift_collat_negative = 0;
//         } else {
//             drift_collat_positive = 0;
//             drift_collat_negative = (collat_reserves_average_price -
//                 ext_collat_reserves_average_price)
//                 .div(drift_refresh_period);
//         }

//         if (arths_reserves_average_price < ext_arths_reserves_average_price) {
//             drift_arths_positive = (ext_arths_reserves_average_price -
//                 arths_reserves_average_price)
//                 .div(drift_refresh_period);
//             drift_arths_negative = 0;
//         } else {
//             drift_arths_positive = 0;
//             drift_arths_negative = (arths_reserves_average_price -
//                 ext_arths_reserves_average_price)
//                 .div(drift_refresh_period);
//         }

//         arths_price_cumulative_prev = arths_price_cumulative;
//         last_drift_refresh = block.timestamp;
//         drift_end_time = block.timestamp.add(drift_refresh_period);
//     }

//     // Gets the external average arths price over the previous period and the external K
//     function getOracleInfo()
//         public
//         view
//         returns (uint256 ext_average_arths_usd_price, uint256 ext_k)
//     {
//         ext_average_arths_usd_price = arthsUSDCOracle.consult(
//             arths_contract_address,
//             1e18
//         );
//         (uint112 reserve0, uint112 reserve1, ) =
//             arthsUSDCOracle.pair().getReserves();
//         ext_k = uint256(reserve0).mul(uint256(reserve1));
//     }

//     // Needed for compatibility with ArthPool standard
//     function collatDollarBalance() public view returns (uint256) {
//         return
//             (
//                 collateral_token
//                     .balanceOf(address(this))
//                     .add(collateral_invested)
//                     .sub(unclaimedPoolCollateral)
//             )
//                 .mul(10**missing_decimals);
//     }

//     function availableExcessCollatDV() public view returns (uint256) {
//         uint256 total_supply = ARTH.totalSupply();
//         uint256 global_collateral_ratio = ARTH.global_collateral_ratio();
//         uint256 global_collat_value = ARTH.globalCollateralValue();

//         uint256 target_collat_value =
//             total_supply.mul(global_collateral_ratio).div(1e6);

//         if (global_collat_value > target_collat_value) {
//             return global_collat_value.sub(target_collat_value);
//         } else {
//             return 0;
//         }
//     }

//     function availableForInvestment() public view returns (uint256 max_invest) {
//         uint256 curr_pool_bal =
//             collateral_token
//                 .balanceOf(address(this))
//                 .add(collateral_invested)
//                 .sub(unclaimedPoolCollateral);
//         max_invest = curr_pool_bal.mul(global_investment_cap_percentage).div(
//             1e6
//         );
//     }

//     /* ========== INTERNAL ========== */

//     // Courtesy of github.com/denett
//     // Update the reserves and the cumulative price
//     function _update(
//         uint256 current_arths_virtual_reserves,
//         uint256 current_collat_virtual_reserves,
//         uint256 average_arths_virtual_reserves,
//         uint256 average_collat_virtual_reserves
//     ) private {
//         uint256 time_elapsed = block.timestamp - last_update_time;
//         if (time_elapsed > 0) {
//             arths_price_cumulative += average_arths_virtual_reserves
//                 .mul(1e18)
//                 .div(average_collat_virtual_reserves)
//                 .mul(time_elapsed);
//         }
//         arths_virtual_reserves = current_arths_virtual_reserves;
//         collat_virtual_reserves = current_collat_virtual_reserves;
//         last_update_time = block.timestamp;
//     }

//     /* ========== PUBLIC FUNCTIONS ========== */

//     function mintFractionalARTH(
//         uint256 collateral_amount,
//         uint256 arths_amount,
//         uint256 ARTH_out_min
//     )
//         public
//         notMintPaused
//         returns (
//             uint256,
//             uint256,
//             uint256
//         )
//     {
//         uint256 global_collateral_ratio = ARTH.global_collateral_ratio();

//         // Do not need to equalize decimals between ARTHS and collateral, getAmountOut & reserves takes care of it
//         // Still need to adjust for ARTH (18 decimals) and collateral (not always 18 decimals)
//         uint256 total_arth_mint;
//         uint256 collat_needed;
//         uint256 arths_needed;
//         if (global_collateral_ratio == 1e6) {
//             // 1-to-1
//             total_arth_mint = collateral_amount.mul(10**missing_decimals);
//             collat_needed = collateral_amount;
//             arths_needed = 0;
//         } else if (global_collateral_ratio == 0) {
//             // Algorithmic
//             // Assumes 1 collat = 1 ARTH at all times
//             total_arth_mint = getAmountOut(
//                 arths_amount,
//                 arths_virtual_reserves,
//                 collat_virtual_reserves,
//                 minting_fee
//             );
//             _update(
//                 arths_virtual_reserves.add(arths_amount),
//                 collat_virtual_reserves.sub(total_arth_mint),
//                 arths_virtual_reserves,
//                 collat_virtual_reserves
//             );

//             total_arth_mint = total_arth_mint.mul(10**missing_decimals);
//             collat_needed = 0;
//             arths_needed = arths_amount;
//         } else {
//             // Fractional
//             // Assumes 1 collat = 1 ARTH at all times
//             uint256 arth_mint_from_arths =
//                 getAmountOut(
//                     arths_amount,
//                     arths_virtual_reserves,
//                     collat_virtual_reserves,
//                     minting_fee
//                 );
//             _update(
//                 arths_virtual_reserves.add(arths_amount),
//                 collat_virtual_reserves.sub(arth_mint_from_arths),
//                 arths_virtual_reserves,
//                 collat_virtual_reserves
//             );

//             collat_needed = arth_mint_from_arths.mul(1e6).div(
//                 uint256(1e6).sub(global_collateral_ratio)
//             ); // find collat needed at collateral ratio
//             require(
//                 collat_needed <= collateral_amount,
//                 'Not enough collateral inputted'
//             );

//             uint256 arth_mint_from_collat =
//                 collat_needed.mul(10**missing_decimals);
//             arth_mint_from_arths = arth_mint_from_arths.mul(
//                 10**missing_decimals
//             );
//             total_arth_mint = arth_mint_from_arths.add(arth_mint_from_collat);
//             arths_needed = arths_amount;
//         }

//         require(total_arth_mint >= ARTH_out_min, 'Slippage limit reached');
//         require(
//             collateral_token
//                 .balanceOf(address(this))
//                 .add(collateral_invested)
//                 .sub(unclaimedPoolCollateral)
//                 .add(collat_needed) <= pool_ceiling,
//             'Pool ceiling reached, no more ARTH can be minted with this collateral'
//         );

//         ARTHS.pool_burn_from(msg.sender, arths_needed);
//         collateral_token.transferFrom(msg.sender, address(this), collat_needed);

//         // Sanity check to make sure the ARTH mint amount is close to the expected amount from the collateral input
//         // Using collateral_needed here could cause problems if the reserves are off
//         // Useful in case of a sandwich attack or some other fault with the virtual reserves
//         // Assumes $1 collateral (USDC, USDT, DAI, etc)
//         require(
//             total_arth_mint <=
//                 collateral_amount
//                     .mul(10**missing_decimals)
//                     .mul(uint256(1e6).add(max_drift_band))
//                     .div(global_collateral_ratio),
//             '[max_drift_band] Too much ARTH being minted'
//         );
//         ARTH.pool_mint(msg.sender, total_arth_mint);

//         return (total_arth_mint, collat_needed, arths_needed);
//     }

//     function redeemFractionalARTH(
//         uint256 ARTH_amount,
//         uint256 arths_out_min,
//         uint256 collateral_out_min
//     )
//         public
//         notRedeemPaused
//         returns (
//             uint256,
//             uint256,
//             uint256
//         )
//     {
//         uint256 global_collateral_ratio = ARTH.global_collateral_ratio();

//         uint256 collat_out;
//         uint256 arths_out;

//         uint256 collat_equivalent = ARTH_amount.div(10**missing_decimals);

//         if (global_collateral_ratio == 1e6) {
//             // 1-to-1
//             collat_out = collat_equivalent;
//             arths_out = 0;
//         } else if (global_collateral_ratio == 0) {
//             // Algorithmic
//             arths_out = getAmountOut(
//                 collat_equivalent,
//                 collat_virtual_reserves,
//                 arths_virtual_reserves,
//                 redemption_fee
//             ); // switch ARTH to units of collateral and swap
//             collat_out = 0;

//             _update(
//                 arths_virtual_reserves.sub(arths_out),
//                 collat_virtual_reserves.add(collat_equivalent),
//                 arths_virtual_reserves,
//                 collat_virtual_reserves
//             );
//         } else {
//             // Fractional
//             collat_out = collat_equivalent.mul(global_collateral_ratio).div(
//                 1e6
//             );
//             arths_out = getAmountOut(
//                 collat_equivalent
//                     .mul((uint256(1e6).sub(global_collateral_ratio)))
//                     .div(1e6),
//                 collat_virtual_reserves,
//                 arths_virtual_reserves,
//                 redemption_fee
//             );

//             _update(
//                 arths_virtual_reserves.sub(arths_out),
//                 collat_virtual_reserves.add(
//                     collat_equivalent
//                         .mul((uint256(1e6).sub(global_collateral_ratio)))
//                         .div(1e6)
//                 ),
//                 arths_virtual_reserves,
//                 collat_virtual_reserves
//             );
//         }

//         require(
//             collat_out <=
//                 collateral_token.balanceOf(address(this)).sub(
//                     unclaimedPoolCollateral
//                 ),
//             'Not enough collateral in pool'
//         );
//         require(
//             collat_out >= collateral_out_min,
//             'Slippage limit reached [collateral]'
//         );
//         require(arths_out >= arths_out_min, 'Slippage limit reached [ARTHS]');

//         // Sanity check to make sure the collat amount is close to the expected amount from the ARTH input
//         // This check is redundant since collat_out is essentially supplied by the user
//         // Useful in case of a sandwich attack or some other fault with the virtual reserves	        // arths_out should receive a sanity check instead
//         // Assumes $1 collateral (USDC, USDT, DAI, etc)	        // one possible way to do this may be to obtain the twap price while infering how much slippage
//         // a trade at that price might incur according to the percentage of the reserves that were
//         // traded and that may approximate a sane transaction.
//         // Alternatively, maybe it could be done as it is done on lines 496 and 497.

//         require(
//             collat_out.mul(10**missing_decimals) <=
//                 ARTH_amount
//                     .mul(global_collateral_ratio)
//                     .mul(uint256(1e6).add(max_drift_band))
//                     .div(1e12),
//             '[max_drift_band] Too much collateral being released'
//         );

//         redeemCollateralBalances[msg.sender] = redeemCollateralBalances[
//             msg.sender
//         ]
//             .add(collat_out);
//         unclaimedPoolCollateral = unclaimedPoolCollateral.add(collat_out);

//         redeemARTHSBalances[msg.sender] = redeemARTHSBalances[msg.sender].add(
//             arths_out
//         );
//         unclaimedPoolARTHS = unclaimedPoolARTHS.add(arths_out);

//         lastRedeemed[msg.sender] = block.number;

//         ARTH.pool_burn_from(msg.sender, ARTH_amount);
//         ARTHS.pool_mint(address(this), arths_out);

//         return (ARTH_amount, collat_out, arths_out);
//     }

//     // After a redemption happens, transfer the newly minted ARTHS and owed collateral from this pool
//     // contract to the user. Redemption is split into two functions to prevent flash loans from being able
//     // to take out ARTH/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
//     function collectRedemption() external returns (uint256, uint256) {
//         require(
//             (lastRedeemed[msg.sender].add(redemption_delay)) <= block.number,
//             'Must wait for redemption_delay blocks before collecting redemption'
//         );
//         bool sendARTHS = false;
//         bool sendCollateral = false;
//         uint256 ARTHSAmount;
//         uint256 CollateralAmount;

//         // Use Checks-Effects-Interactions pattern
//         if (redeemARTHSBalances[msg.sender] > 0) {
//             ARTHSAmount = redeemARTHSBalances[msg.sender];
//             redeemARTHSBalances[msg.sender] = 0;
//             unclaimedPoolARTHS = unclaimedPoolARTHS.sub(ARTHSAmount);

//             sendARTHS = true;
//         }

//         if (redeemCollateralBalances[msg.sender] > 0) {
//             CollateralAmount = redeemCollateralBalances[msg.sender];
//             redeemCollateralBalances[msg.sender] = 0;
//             unclaimedPoolCollateral = unclaimedPoolCollateral.sub(
//                 CollateralAmount
//             );

//             sendCollateral = true;
//         }

//         if (sendARTHS == true) {
//             ARTHS.transfer(msg.sender, ARTHSAmount);
//         }
//         if (sendCollateral == true) {
//             collateral_token.transfer(msg.sender, CollateralAmount);
//         }

//         return (CollateralAmount, ARTHSAmount);
//     }

//     function recollateralizeARTH(
//         uint256 collateral_amount,
//         uint256 ARTHS_out_min
//     ) external returns (uint256, uint256) {
//         require(recollateralizePaused == false, 'Recollateralize is paused');
//         uint256 arths_out =
//             getAmountOut(
//                 collateral_amount,
//                 collat_virtual_reserves,
//                 arths_virtual_reserves,
//                 recollat_fee
//             );

//         _update(
//             arths_virtual_reserves.sub(arths_out),
//             collat_virtual_reserves.add(collateral_amount),
//             arths_virtual_reserves,
//             collat_virtual_reserves
//         );
//         require(arths_out >= ARTHS_out_min, 'Slippage limit reached');

//         uint256 total_supply = ARTH.totalSupply();
//         uint256 global_collateral_ratio = ARTH.global_collateral_ratio();
//         uint256 global_collat_value = ARTH.globalCollateralValue();
//         uint256 target_collat_value = total_supply.mul(global_collateral_ratio);

//         require(
//             target_collat_value >=
//                 global_collat_value +
//                     collateral_amount.mul(10**missing_decimals),
//             'Too much recollateralize inputted'
//         );

//         collateral_token.transferFrom(
//             msg.sender,
//             address(this),
//             collateral_amount
//         );

//         // Sanity check to make sure the value of the outgoing ARTHS amount is close to the expected amount based on the collateral input
//         // Ignores the bonus, as it will be added in later
//         // Useful in case of a sandwich attack or some other fault with the virtual reserves
//         // Assumes $1 collateral (USDC, USDT, DAI, etc)
//         uint256 arths_price =
//             arthsUSDCOracle.consult(arths_contract_address, 1e18); // comes out e6
//         require(
//             arths_out.mul(arths_price).div(1e6) <=
//                 collateral_amount
//                     .mul(10**missing_decimals)
//                     .mul(uint256(1e6).add(max_drift_band))
//                     .div(1e6),
//             '[max_drift_band] Too much ARTHS being released'
//         );

//         // Add in the bonus
//         arths_out = arths_out.add(arths_out.mul(bonus_rate).div(1e6));

//         ARTHS.pool_mint(msg.sender, arths_out);

//         return (collateral_amount, arths_out);
//     }

//     function buyBackARTHS(uint256 ARTHS_amount, uint256 COLLATERAL_out_min)
//         external
//         returns (uint256, uint256)
//     {
//         require(buyBackPaused == false, 'Buyback is paused');
//         uint256 buyback_available =
//             availableExcessCollatDV().div(10**missing_decimals);
//         uint256 collat_out =
//             getAmountOut(
//                 ARTHS_amount,
//                 arths_virtual_reserves,
//                 collat_virtual_reserves,
//                 buyback_fee
//             );

//         require(buyback_available > 0, 'Zero buyback available');
//         require(
//             collat_out <= buyback_available,
//             'Not enough buyback available'
//         );
//         require(collat_out >= COLLATERAL_out_min, 'Slippage limit reached');
//         _update(
//             arths_virtual_reserves.sub(ARTHS_amount),
//             collat_virtual_reserves.add(collat_out),
//             arths_virtual_reserves,
//             collat_virtual_reserves
//         );

//         ARTHS.pool_burn_from(msg.sender, ARTHS_amount);

//         // Sanity check to make sure the value of the outgoing collat amount is close to the expected amount based on the ARTHS input
//         // Useful in case of a sandwich attack or some other fault with the virtual reserves
//         // Assumes $1 collateral (USDC, USDT, DAI, etc)
//         uint256 arths_price =
//             arthsUSDCOracle.consult(arths_contract_address, 1e18); // comes out e6
//         require(
//             collat_out.mul(10**missing_decimals) <=
//                 ARTHS_amount
//                     .mul(arths_price)
//                     .mul(uint256(1e6).add(max_drift_band))
//                     .div(1e12),
//             '[max_drift_band] Too much collateral being released'
//         );

//         collateral_token.transfer(msg.sender, collat_out);

//         return (ARTHS_amount, collat_out);
//     }

//     // Send collateral to investor contract
//     // Called by INVESTOR CONTRACT
//     function takeOutCollat_Inv(uint256 amount) external onlyInvestor {
//         require(
//             collateral_invested.add(amount) <= availableForInvestment(),
//             'Investment cap reached'
//         );
//         collateral_invested = collateral_invested.add(amount);
//         collateral_token.transfer(investor_contract_address, amount);
//     }

//     // Deposit collateral back to this contract
//     // Called by INVESTOR CONTRACT
//     function putBackCollat_Inv(uint256 amount) external onlyInvestor {
//         if (amount < collateral_invested)
//             collateral_invested = collateral_invested.sub(amount);
//         else collateral_invested = 0;
//         collateral_token.transferFrom(
//             investor_contract_address,
//             address(this),
//             amount
//         );
//     }

//     /* ========== MISC FUNCTIONS ========== */

//     // SQRT from here: https://ethereum.stackexchange.com/questions/2910/can-i-square-root-in-solidity
//     function sqrt(uint256 x) internal pure returns (uint256 y) {
//         uint256 z = (x + 1) / 2;
//         y = x;
//         while (z < y) {
//             y = z;
//             z = (x / z + z) / 2;
//         }
//     }

//     /* ========== RESTRICTED FUNCTIONS ========== */

//     function toggleMinting(bool state) external {
//         require(hasRole(MINT_PAUSER, msg.sender));
//         mintPaused = state;
//     }

//     function toggleRedeeming(bool state) external {
//         require(hasRole(REDEEM_PAUSER, msg.sender));
//         redeemPaused = state;
//     }

//     function toggleRecollateralize(bool state) external {
//         require(hasRole(RECOLLATERALIZE_PAUSER, msg.sender));
//         recollateralizePaused = state;
//     }

//     function toggleBuyBack(bool state) external {
//         require(hasRole(BUYBACK_PAUSER, msg.sender));
//         buyBackPaused = state;
//     }

//     function toggleCollateralPrice(bool state, uint256 _new_price) external {
//         require(hasRole(COLLATERAL_PRICE_PAUSER, msg.sender));
//         collateralPricePaused = state;

//         if (collateralPricePaused == true) {
//             pausedPrice = _new_price;
//         }
//     }

//     // Combined into one function due to 24KiB contract memory limit
//     function setPoolParameters(
//         uint256 new_ceiling,
//         uint256 new_bonus_rate,
//         uint256 new_redemption_delay,
//         uint256 new_mint_fee,
//         uint256 new_redeem_fee,
//         uint256 new_buyback_fee,
//         uint256 new_recollat_fee,
//         uint256 _reserve_refresh_cooldown,
//         uint256 _max_drift_band
//     ) external onlyByOwnerOrGovernance {
//         pool_ceiling = new_ceiling;
//         bonus_rate = new_bonus_rate;
//         redemption_delay = new_redemption_delay;
//         minting_fee = new_mint_fee;
//         redemption_fee = new_redeem_fee;
//         buyback_fee = new_buyback_fee;
//         recollat_fee = new_recollat_fee;
//         reserve_refresh_cooldown = _reserve_refresh_cooldown;
//         max_drift_band = _max_drift_band;
//     }

//     // Sets the ARTHS_USDC Uniswap oracle address
//     function setARTHSUSDCOracle(address _arths_usdc_oracle_addr)
//         public
//         onlyByOwnerOrGovernance
//     {
//         arths_usdc_oracle_address = _arths_usdc_oracle_addr;
//         arthsUSDCOracle = UniswapPairOracle(_arths_usdc_oracle_addr);
//     }

//     function setTimelock(address new_timelock)
//         external
//         onlyByOwnerOrGovernance
//     {
//         timelock_address = new_timelock;
//     }

//     function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
//         owner_address = _owner_address;
//     }

//     function setInvestorParameters(
//         address _investor_contract_address,
//         uint256 _global_investment_cap_percentage
//     ) external onlyByOwnerOrGovernance {
//         investor_contract_address = _investor_contract_address;
//         global_investment_cap_percentage = _global_investment_cap_percentage;
//     }
// }
