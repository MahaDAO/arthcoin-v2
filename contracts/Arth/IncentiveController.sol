// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../Math/SafeMath.sol';
import '../Governance/AccessControl.sol';

//import '../'

contract IncentiveController is AccessControl {
    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'You are not the owner or the governance timelock'
        );
        _;
    }

    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function incentivize(
        address sender,
        address recipient,
        address,
        uint256 amount
    ) public {
        require(sender != receiver, 'UniswapIncentive: cannot send self');
        updateOracle();

        if (_isPair(sender)) {
            _incentivizeBuy(receiver, amountIn);
        }

        if (_isPair(receiver)) {
            _incentivizeSell(sender, amountIn);
        }
    }
}
