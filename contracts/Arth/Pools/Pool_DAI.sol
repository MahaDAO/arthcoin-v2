// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './ARTHPool.sol';

contract Pool_DAI is ARTHPool {
    /**
     * State variables.
     */
    address public DAI_address;

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
            _poolCeiling
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DAI_address = _collateralAddress;
    }
}
