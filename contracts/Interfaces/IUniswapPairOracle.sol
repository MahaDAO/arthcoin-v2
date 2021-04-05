// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @dev Fixed window oracle that recomputes the average price for the entire period once every period
///  Note that the price average is only guaranteed to be over at least 1 period, but may be over a longer period
interface IUniswapPairOracle {
    function setOwner(address _owner_address) external;

    function setTimelock(address _timelock_address) external;

    function setPeriod(uint256 _period) external;

    function setConsultLeniency(uint256 _consult_leniency) external;

    function setAllowStaleConsults(bool _allow_stale_consults) external;

    // Check if update() can be called instead of wasting gas calling it
    function canUpdate() external returns (bool);

    function update() external;

    // Note this will always return 0 before update has been called successfully for the first time.
    function consult(address token, uint256 amountIn)
        external
        view
        returns (uint256);
}
