// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTHController} from './IARTHController.sol';

interface IProxyArthController is IARTHController {
    function setArthController(IARTHController _arthcontroller) external;
}
