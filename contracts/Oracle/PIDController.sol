// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Arth/Arth.sol';
import '../Math/SafeMath.sol';
import './ReserveTracker.sol';
import '../Curve/IMetaImplementationUSD.sol';
import '../Arth/ArthController.sol';

/**
 *  Original code written by:
 *  - Travis Moore, Jason Huan, Same Kazemian, Sam Sun.
 *  Code modified by:
 *  - Steven Enamakel, Yash Agrawal & Sagar Behara.
 */
contract PIDController {
    using SafeMath for uint256;

    ARTHStablecoin public ARTH;
    ARTHShares public ARTHS;
    ReserveTracker public reserve_tracker;
    IMetaImplementationUSD arth_metapool;
    ArthController private controller;

    address public arth_contract_address;
    address public arths_contract_address;

    address public owner_address;
    address public timelock_address;

    address public reserve_tracker_address;
    address public arth_metapool_address;

    // 6 decimals of precision
    uint256 public growth_ratio;
    uint256 public arth_step;
    uint256 public GR_top_band;
    uint256 public GR_bottom_band;

    uint256 public ARTH_top_band;
    uint256 public ARTH_bottom_band;

    uint256 public internal_cooldown;
    bool public is_active;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == owner_address || msg.sender == timelock_address,
            'You are not the owner, controller, or the governance timelock'
        );
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _arth_contract_address,
        address _arths_contract_address,
        address _creator_address,
        address _timelock_address,
        address _reserve_tracker_address
    ) {
        arth_contract_address = _arth_contract_address;
        arths_contract_address = _arths_contract_address;
        owner_address = _creator_address;
        timelock_address = _timelock_address;
        reserve_tracker_address = _reserve_tracker_address;
        reserve_tracker = ReserveTracker(reserve_tracker_address);
        arth_step = 2500;
        ARTH = ARTHStablecoin(arth_contract_address);
        ARTHS = ARTHShares(arths_contract_address);

        // Upon genesis, if GR changes by more than 1% percent, enable change of collateral ratio
        GR_top_band = 1000;
        GR_bottom_band = 1000;
        is_active = false;
    }

    function setReserveTracker(address _reserve_tracker_address)
        external
        onlyByOwnerOrGovernance
    {
        reserve_tracker_address = _reserve_tracker_address;
        reserve_tracker = ReserveTracker(_reserve_tracker_address);
    }

    function setMetapool(address _metapool_address)
        external
        onlyByOwnerOrGovernance
    {
        arth_metapool_address = _metapool_address;
        arth_metapool = IMetaImplementationUSD(_metapool_address);
    }

    uint256 last_arth_supply;
    uint256 last_update;
    uint256[2] public old_twap;

    function setCollateralRatio() public onlyByOwnerOrGovernance {
        require(
            block.timestamp - last_update >= internal_cooldown,
            'internal cooldown not passed'
        );
        uint256 arths_reserves = reserve_tracker.getARTHSReserves();
        uint256 arths_price = reserve_tracker.getARTHSPrice();

        uint256 arths_liquidity = (arths_reserves.mul(arths_price)); // Has 6 decimals of precision

        uint256 arth_supply = ARTH.totalSupply();
        //uint256 arth_price = reserve_tracker.getARTHPrice(); // Using Uniswap
        // Get the ARTH TWAP on Curve Metapool
        uint256[2] memory new_twap = arth_metapool.get_price_cumulative_last();
        uint256[2] memory balances =
            arth_metapool.get_twap_balances(
                old_twap,
                new_twap,
                block.timestamp - last_update
            );
        old_twap = new_twap;
        uint256 arth_price =
            arth_metapool.get_dy(1, 0, 1e18, balances).mul(1e6).div(
                arth_metapool.get_virtual_price()
            );

        uint256 new_growth_ratio = arths_liquidity.div(arth_supply); // (E18 + E6) / E18

        uint256 last_collateral_ratio = controller.global_collateral_ratio();
        uint256 new_collateral_ratio = last_collateral_ratio;

        // First, check if the price is out of the band
        if (arth_price > ARTH_top_band) {
            new_collateral_ratio = last_collateral_ratio.sub(arth_step);
        } else if (arth_price < ARTH_bottom_band) {
            new_collateral_ratio = last_collateral_ratio.add(arth_step);

            // Else, check if the growth ratio has increased or decreased since last update
        } else {
            if (
                new_growth_ratio > growth_ratio.mul(1e6 + GR_top_band).div(1e6)
            ) {
                new_collateral_ratio = last_collateral_ratio.sub(arth_step);
            } else if (
                new_growth_ratio <
                growth_ratio.mul(1e6 - GR_bottom_band).div(1e6)
            ) {
                new_collateral_ratio = last_collateral_ratio.add(arth_step);
            }
        }

        // No need for checking CR under 0 as the last_collateral_ratio.sub(arth_step) will throw
        // an error above in that case
        if (new_collateral_ratio > 1e6) {
            new_collateral_ratio = 1e6;
        }

        // For testing purposes
        if (is_active) {
            uint256 delta_collateral_ratio;
            if (new_collateral_ratio > last_collateral_ratio) {
                delta_collateral_ratio =
                    new_collateral_ratio -
                    last_collateral_ratio;
                controller.setPriceTarget(0); // Set to zero to increase CR
                emit ARTHdecollateralize(new_collateral_ratio);
            } else if (new_collateral_ratio < last_collateral_ratio) {
                delta_collateral_ratio =
                    last_collateral_ratio -
                    new_collateral_ratio;
                controller.setPriceTarget(1000e6); // Set to high value to decrease CR
                emit ARTHrecollateralize(new_collateral_ratio);
            }

            controller.setArthStep(delta_collateral_ratio); // Change by the delta
            uint256 cooldown_before = controller.refresh_cooldown(); // Note the existing cooldown period
            controller.setRefreshCooldown(0); // Unlock the CR cooldown

            controller.refreshCollateralRatio(); // Refresh CR

            // Reset params
            controller.setArthStep(0);
            controller.setRefreshCooldown(cooldown_before); // Set the cooldown period to what it was before, or until next controller refresh
            controller.setPriceTarget(1e6);
        }

        growth_ratio = new_growth_ratio;
        last_update = block.timestamp;
    }

    function activate(bool _state) external onlyByOwnerOrGovernance {
        is_active = _state;
    }

    // As a percentage added/subtracted from the previous; e.g. top_band = 4000 = 0.4% -> will decollat if GR increases by 0.4% or more
    function setGrowthRatioBands(uint256 _GR_top_band, uint256 _GR_bottom_band)
        external
        onlyByOwnerOrGovernance
    {
        GR_top_band = _GR_top_band;
        GR_bottom_band = _GR_bottom_band;
    }

    function setInternalCooldown(uint256 _internal_cooldown)
        external
        onlyByOwnerOrGovernance
    {
        internal_cooldown = _internal_cooldown;
    }

    function setArthStep(uint256 _new_step) external onlyByOwnerOrGovernance {
        arth_step = _new_step;
    }

    function setPriceBands(uint256 _top_band, uint256 _bottom_band)
        external
        onlyByOwnerOrGovernance
    {
        ARTH_top_band = _top_band;
        ARTH_bottom_band = _bottom_band;
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    function setTimelock(address new_timelock)
        external
        onlyByOwnerOrGovernance
    {
        timelock_address = new_timelock;
    }

    /* ========== EVENTS ========== */

    event ARTHdecollateralize(uint256 new_collateral_ratio);
    event ARTHrecollateralize(uint256 new_collateral_ratio);
}
