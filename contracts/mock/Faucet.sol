// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from "../ERC20/IERC20.sol";

contract Faucet {
    IERC20[] public tokens;

    constructor(IERC20[] memory tokens_) {
        tokens = tokens_;
    }

    function faucet() external {
        uint256 noOfTokens = tokens.length;

        for (uint256 i = 0; i < noOfTokens; i++) {
            IERC20 token = tokens[i];
            uint256 tokenDecimals = token.decimals();
            token.transfer(msg.sender, 2 * (10 ** tokenDecimals));
        }
    }
}
