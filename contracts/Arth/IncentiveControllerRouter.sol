// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import './IIncentive.sol';
import '../Governance/AccessControl.sol';

contract IncentiveControllerRouter is AccessControl, IIncentive {
    mapping(address => address) public senderMapping;
    mapping(address => address) public receiverMapping;
    mapping(address => address) public operatorMapping;

    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'IncentiveControllerRouter: FORBIDDEN'
        );
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function setSenderIncentiveControllers(address target, address controller)
        external
        onlyAdmin
    {
        senderMapping[target] = controller;
    }

    function setRecieverIncentiveControllers(address target, address controller)
        external
        onlyAdmin
    {
        receiverMapping[target] = controller;
    }

    function incentivize(
        address sender,
        address receiver,
        address operator,
        uint256 amountIn
    ) public override {
        address senderCtrl = senderMapping[sender];
        if (senderCtrl != address(0)) {
            IIncentive(senderCtrl).incentivize(
                sender,
                receiver,
                operator,
                amountIn
            );
            return;
        }

        address recvrCtrl = receiverMapping[sender];
        if (recvrCtrl != address(0)) {
            IIncentive(recvrCtrl).incentivize(
                sender,
                receiver,
                operator,
                amountIn
            );
            return;
        }
    }
}
