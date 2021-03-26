// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../../Math/Math.sol';
import '../../Math/SafeMath.sol';

contract TestDriftingReserves {
    using SafeMath for uint256;
    uint256 end_dift;
    uint256 last_update_time;
    uint256 arths_virtual_reserves;
    uint256 collat_virtual_reserves;
    uint256 drift_arths_positive;
    uint256 drift_arths_negative;
    uint256 drift_collat_positive;
    uint256 drift_collat_negative;
    uint256 arths_price_cumulative;
    uint256 arths_price_cumulative_prev;
    uint256 minting_fee;
    uint256 last_drift_refresh;
    uint256 drift_refresh_period;

    // Example reserve update flow
    function mint(uint256 arths_amount) external {
        // Get current reserves
        (
            uint256 current_arths_virtual_reserves,
            uint256 current_collat_virtual_reserves,
            uint256 average_arths_virtual_reserves,
            uint256 average_collat_virtual_reserves
        ) = getVirtualReserves();

        // Calc reserve updates
        uint256 total_arth_mint =
            getAmountOut(
                arths_amount,
                current_arths_virtual_reserves,
                current_collat_virtual_reserves
            );

        // Call _update with new reserves and average over last period
        _update(
            current_arths_virtual_reserves.add(arths_amount),
            current_collat_virtual_reserves.sub(total_arth_mint),
            average_arths_virtual_reserves,
            average_collat_virtual_reserves
        );
    }

    // Updates the reserve drifts
    function refreshDrift() external {
        require(block.timestamp >= end_dift, 'Drift refresh on cooldown');

        // First apply the drift of the previous period
        (
            uint256 current_arths_virtual_reserves,
            uint256 current_collat_virtual_reserves,
            uint256 average_arths_virtual_reserves,
            uint256 average_collat_virtual_reserves
        ) = getVirtualReserves();
        _update(
            current_arths_virtual_reserves,
            current_collat_virtual_reserves,
            average_arths_virtual_reserves,
            average_collat_virtual_reserves
        );

        // Calculate the reserves at the average internal price over the last period and the current K
        uint256 time_elapsed = block.timestamp - last_drift_refresh;
        uint256 average_period_price_arths =
            (arths_price_cumulative - arths_price_cumulative_prev).div(
                time_elapsed
            );
        uint256 internal_k =
            current_arths_virtual_reserves.mul(current_collat_virtual_reserves);
        uint256 collat_reserves_average_price =
            sqrt(internal_k.mul(average_period_price_arths));
        uint256 arths_reserves_average_price =
            internal_k.div(collat_reserves_average_price);

        // Calculate the reserves at the average external price over the last period and the target K
        (uint256 ext_average_arths_usd_price, uint256 ext_k) = getOracleInfo();
        uint256 targetK = Math.min(ext_k, internal_k.add(internal_k.div(100))); // Increase K with max 1% per period
        uint256 ext_collat_reserves_average_price =
            sqrt(targetK.mul(ext_average_arths_usd_price));
        uint256 ext_arths_reserves_average_price =
            targetK.div(ext_collat_reserves_average_price);

        // Calculate the drifts per second
        if (collat_reserves_average_price < ext_collat_reserves_average_price) {
            drift_collat_positive = (ext_collat_reserves_average_price -
                collat_reserves_average_price)
                .div(drift_refresh_period);
            drift_collat_negative = 0;
        } else {
            drift_collat_positive = 0;
            drift_collat_negative = (collat_reserves_average_price -
                ext_collat_reserves_average_price)
                .div(drift_refresh_period);
        }
        if (arths_reserves_average_price < ext_arths_reserves_average_price) {
            drift_arths_positive = (ext_arths_reserves_average_price -
                arths_reserves_average_price)
                .div(drift_refresh_period);
            drift_arths_negative = 0;
        } else {
            drift_arths_positive = 0;
            drift_arths_negative = (arths_reserves_average_price -
                ext_arths_reserves_average_price)
                .div(drift_refresh_period);
        }

        arths_price_cumulative_prev = arths_price_cumulative;
        last_drift_refresh = block.timestamp;
        end_dift = block.timestamp.add(drift_refresh_period);
    }

    // Gets the external average arths price over the previous period and the external K
    function getOracleInfo()
        internal
        returns (uint256 ext_average_arths_usd_price, uint256 ext_k)
    {
        // TODO
    }

    // Update the reserves and the cumulative price
    function _update(
        uint256 current_arths_virtual_reserves,
        uint256 current_collat_virtual_reserves,
        uint256 average_arths_virtual_reserves,
        uint256 average_collat_virtual_reserves
    ) private {
        uint256 time_elapsed = block.timestamp - last_update_time;
        if (time_elapsed > 0) {
            arths_price_cumulative += average_arths_virtual_reserves
                .mul(1e18)
                .div(average_collat_virtual_reserves)
                .mul(time_elapsed);
        }
        arths_virtual_reserves = current_arths_virtual_reserves;
        collat_virtual_reserves = current_collat_virtual_reserves;
        last_update_time = block.timestamp;
    }

    // Returns the current reserves and the average reserves over the last period
    function getVirtualReserves()
        public
        view
        returns (
            uint256 current_arths_virtual_reserves,
            uint256 current_collat_virtual_reserves,
            uint256 average_arths_virtual_reserves,
            uint256 average_collat_virtual_reserves
        )
    {
        current_arths_virtual_reserves = arths_virtual_reserves;
        current_collat_virtual_reserves = collat_virtual_reserves;
        uint256 drift_time = 0;
        if (end_dift > last_update_time) {
            drift_time = Math.min(block.timestamp, end_dift) - last_update_time;
            if (drift_time > 0) {
                if (drift_arths_positive > 0)
                    current_arths_virtual_reserves = current_arths_virtual_reserves
                        .add(drift_arths_positive.mul(drift_time));
                else
                    current_arths_virtual_reserves = current_arths_virtual_reserves
                        .sub(drift_arths_negative.mul(drift_time));

                if (drift_collat_positive > 0)
                    current_collat_virtual_reserves = current_collat_virtual_reserves
                        .add(drift_collat_positive.mul(drift_time));
                else
                    current_collat_virtual_reserves = current_collat_virtual_reserves
                        .sub(drift_collat_negative.mul(drift_time));
            }
        }
        average_arths_virtual_reserves = arths_virtual_reserves
            .add(current_arths_virtual_reserves)
            .div(2);
        average_collat_virtual_reserves = collat_virtual_reserves
            .add(current_collat_virtual_reserves)
            .div(2);

        // Adjust for when time was split between drift and no drift.
        uint256 time_elapsed = block.timestamp - last_update_time;
        if (time_elapsed > drift_time && drift_time > 0) {
            average_arths_virtual_reserves = average_arths_virtual_reserves
                .mul(drift_time)
                .add(
                current_arths_virtual_reserves.mul(time_elapsed.sub(drift_time))
            )
                .div(time_elapsed);
            average_collat_virtual_reserves = average_collat_virtual_reserves
                .mul(drift_time)
                .add(
                current_collat_virtual_reserves.mul(
                    time_elapsed.sub(drift_time)
                )
            )
                .div(time_elapsed);
        }
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public view returns (uint256 amountOut) {
        require(amountIn > 0, 'ARTH_vAMM: INSUFFICIENT_INPUT_AMOUNT');
        require(
            reserveIn > 0 && reserveOut > 0,
            'ARTH_vAMM: INSUFFICIENT_LIQUIDITY'
        );
        uint256 amountInWithFee = amountIn.mul(uint256(1e6).sub(minting_fee));
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = (reserveIn.mul(1e6)).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // SQRT from here: https://ethereum.stackexchange.com/questions/2910/can-i-square-root-in-solidity
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
