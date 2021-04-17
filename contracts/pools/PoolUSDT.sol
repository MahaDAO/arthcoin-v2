// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './core/ARTHPool.sol';

contract PoolUSDT is ARTHPool {
    /**
     * State variable.
     */
    address public USDT_address;

    /**
     * Constructor.
     */
    constructor(
        address _arthContractAddres,
        address _arthxContractAddres,
        address _collateralAddress,
        address _creatorAddress,
        address _timelockAddress,
        address _mahaToken,
        address _arthMAHAOracle,
        address _arthController,
        uint256 _poolCeiling
    )
        ARTHPool(
            _arthContractAddres,
            _arthxContractAddres,
            _collateralAddress,
            _creatorAddress,
            _timelockAddress,
            _mahaToken,
            _arthMAHAOracle,
            _arthController,
            _poolCeiling
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        USDT_address = _collateralAddress;
    }
}