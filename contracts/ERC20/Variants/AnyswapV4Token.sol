// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '../ERC20Custom.sol';
import './IAnyswapV4Token.sol';
import '../../Governance/AccessControl.sol';

interface IApprovalReceiver {
    function onTokenApproval(
        address,
        uint256,
        bytes calldata
    ) external returns (bool);
}

interface ITransferReceiver {
    function onTokenTransfer(
        address,
        uint256,
        bytes calldata
    ) external returns (bool);
}

contract AnyswapV4Token is ERC20Custom, AccessControl, IAnyswapV4Token {
    /**
     * State variables.
     */

    bytes32 public constant BRIDGE_ROLE = keccak256('BRIDGE_ROLE');

    bytes32 public constant PERMIT_TYPEHASH =
        keccak256(
            'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
        );
    bytes32 public constant TRANSFER_TYPEHASH =
        keccak256(
            'Transfer(address owner,address to,uint256 value,uint256 nonce,uint256 deadline)'
        );
    bytes32 public immutable DOMAIN_SEPARATOR;

    bool private _vaultOnly = false;

    mapping(address => uint256) public override nonces;

    /**
     * Modifier.
     */
    modifier onlyBridge {
        require(
            hasRole(BRIDGE_ROLE, _msgSender()),
            'AnyswapV4Token: forbidden'
        );
        _;
    }

    /**
     * Constructor.
     */
    constructor(
        string memory name /*, address _vault */
    ) {
        _vaultOnly = false;

        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
                ),
                keccak256(bytes(name)),
                keccak256(bytes('2')),
                chainId,
                address(this)
            )
        );
    }

    /**
     * Mutations.
     */

    function verifyEIP712(
        address target,
        bytes32 hashStruct,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (bool) {
        bytes32 hash =
            keccak256(
                abi.encodePacked('\x19\x01', DOMAIN_SEPARATOR, hashStruct)
            );
        address signer = ecrecover(hash, v, r, s);

        return (signer != address(0) && signer == target);
    }

    /// @dev Builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked('\x19Ethereum Signed Message:\n32', hash)
            );
    }

    function verifyPersonalSign(
        address target,
        bytes32 hashStruct,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (bool) {
        bytes32 hash = prefixed(hashStruct);
        address signer = ecrecover(hash, v, r, s);

        return (signer != address(0) && signer == target);
    }

    function permit(
        address target,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        require(block.timestamp <= deadline, 'AnyswapV3ERC20: Expired permit');

        bytes32 hashStruct =
            keccak256(
                abi.encode(
                    PERMIT_TYPEHASH,
                    target,
                    spender,
                    value,
                    nonces[target]++,
                    deadline
                )
            );

        require(
            verifyEIP712(target, hashStruct, v, r, s) ||
                verifyPersonalSign(target, hashStruct, v, r, s)
        );

        // _approve(owner, spender, value);
        _allowances[target][spender] = value;

        emit Approval(target, spender, value);
    }

    /// @dev Only Auth needs to be implemented
    function Swapin(
        bytes32 txhash,
        address account,
        uint256 amount
    ) public override onlyBridge returns (bool) {
        _mint(account, amount);

        emit LogSwapin(txhash, account, amount);
        return true;
    }

    function Swapout(uint256 amount, address bindaddr)
        public
        override
        onlyBridge
        returns (bool)
    {
        // @Sagar: is the below two require necessary?
        // require(!_vaultOnly, 'AnyswapV4ERC20: onlyAuth');
        require(bindaddr != address(0), 'AnyswapV4ERC20: address(0x0)');

        _burn(msg.sender, amount);

        emit LogSwapout(msg.sender, bindaddr, amount);
        return true;
    }

    function approveAndCall(
        address spender,
        uint256 value,
        bytes calldata data
    ) external override returns (bool) {
        // _approve(msg.sender, spender, value);
        _allowances[msg.sender][spender] = value;

        emit Approval(msg.sender, spender, value);
        return
            IApprovalReceiver(spender).onTokenApproval(msg.sender, value, data);
    }

    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external override returns (bool) {
        require(to != address(0) || to != address(this));

        uint256 balance = balanceOf(msg.sender);
        require(
            balance >= value,
            'AnyswapV3ERC20: transfer amount exceeds balance'
        );

        // _balances[msg.sender] = balance - value;
        // _balances[to] += value;
        _transfer(msg.sender, to, value);

        return ITransferReceiver(to).onTokenTransfer(msg.sender, value, data);
    }

    function transferWithPermit(
        address target,
        address to,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override returns (bool) {
        require(block.timestamp <= deadline, 'AnyswapV3ERC20: Expired permit');

        bytes32 hashStruct =
            keccak256(
                abi.encode(
                    TRANSFER_TYPEHASH,
                    target,
                    to,
                    value,
                    nonces[target]++,
                    deadline
                )
            );

        require(
            verifyEIP712(target, hashStruct, v, r, s) ||
                verifyPersonalSign(target, hashStruct, v, r, s)
        );

        // NOTE: is this check needed, was there in the refered contract.
        require(to != address(0) || to != address(this));
        require(
            balanceOf(target) >= value,
            'AnyswapV3ERC20: transfer amount exceeds balance'
        );

        // _balances[target] = balance - value;
        // _balances[to] += value;

        _transfer(target, to, value);
        return true;
    }
}