// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../Governance/AccessControl.sol';
import '../Math/SafeMath.sol';
import {ERC20} from './ERC20.sol';
import {IERC20} from './IERC20.sol';
import {Math} from '../Math/Math.sol';

contract PoolToken is AccessControl, ERC20 {
    using SafeMath for uint256;

    IERC20[] public poolTokens;

    modifier onlyAdmin {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            'PoolToken: FORBIDDEN'
        );
        _;
    }

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        IERC20[] memory poolTokens_
    ) ERC20(tokenName, tokenSymbol) {
        poolTokens = poolTokens_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function addPoolToken(IERC20 token) public onlyAdmin {
        poolTokens.push(token);
    }

    function mint(address to, uint256 amount) public onlyAdmin {
        _mint(to, amount);
    }

    // function pause() public virtual {
    //     require(
    //         hasRole(PAUSER_ROLE, _msgSender()),
    //         'ERC20PresetMinterPauser: must have pauser role to pause'
    //     );
    //     _pause();
    // }

    // function unpause() public virtual {
    //     require(
    //         hasRole(PAUSER_ROLE, _msgSender()),
    //         'ERC20PresetMinterPauser: must have pauser role to unpause'
    //     );
    //     _unpause();
    // }

    function withdraw(uint256 amount) external {
        require(amount > 0, 'PoolToken: amount = 0');
        require(amount <= balanceOf(msg.sender), 'PoolToken: amount > balance');

        // calculate how much share of the supply the user has
        uint256 percentage = amount.mul(1e8).div(totalSupply());

        // proportionately send each of the pool tokens to the user
        for (uint256 i = 0; i < poolTokens.length; i++) {
            uint256 balance = poolTokens[i].balanceOf(address(this));
            uint256 shareAmount = balance.mul(percentage).div(1e8);
            if (shareAmount > 0)
                poolTokens[i].transfer(msg.sender, shareAmount);
        }

        _burn(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    event Withdraw(address indexed who, uint256 liquidity);
}
