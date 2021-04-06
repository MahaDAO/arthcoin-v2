// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './ArthPool.sol';

contract Pool_DAI is ArthPool {
    address public DAI_address;

    constructor(
        address _arth_contract_address,
        address _arthx_contract_address,
        address _collateralAddress,
        address _creator_address,
        address _timelock_address,
        address _stabilityFeeToken,
        address _arth_stability_token_oracle,
        uint256 _pool_ceiling
    )
        ArthPool(
            _arth_contract_address,
            _arthx_contract_address,
            _collateralAddress,
            _creator_address,
            _timelock_address,
            _stabilityFeeToken,
            _arth_stability_token_oracle,
            _pool_ceiling
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DAI_address = _collateralAddress;
    }
}
