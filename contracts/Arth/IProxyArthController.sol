// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IARTHControllerGetters} from "./IARTHControllerGetters.sol";

interface IProxyARTHController is IARTHControllerGetters {
    function setArthController(IARTHControllerGetters controller) external;
}
