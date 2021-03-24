pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./IAnyswapToken.sol";
import "../IERC677.sol";
import "../IERC2612.sol";

interface IApprovalReceiver {
    function onTokenApproval(address, uint, bytes calldata) external returns (bool);
}

interface ITransferReceiver {
    function onTokenTransfer(address, uint, bytes calldata) external returns (bool);
}

// AnyswapToken
contract AnyswapToken is IAnyswapToken, IERC677, IERC2612 {

    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant TRANSFER_TYPEHASH = keccak256("Transfer(address owner,address to,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @dev Records number of AnyswapV3ERC20 token that account (second) will be allowed to spend on behalf of another account (first) through {transferFrom}.
    mapping (address => mapping (address => uint256)) public allowance;
    mapping (address => uint256) public balanceOf;
    mapping (address => uint256) public override nonces;
    
    uint256 private _totalSupply;
    bool private _vaultOnly;
    string public name;

    constructor(string memory _name, address _vault) public {
        name = _name;
        _vaultOnly = false;

        uint256 chainId;
        assembly {chainId := chainid()}
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                chainId,
                address(this)));
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        balanceOf[account] += amount;
        //emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        balanceOf[account] -= amount;
        _totalSupply -= amount;
        //emit Transfer(account, address(0), amount);
    }

    function verifyEIP712(
        address target, 
        bytes32 hashStruct, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) internal view returns (bool) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hashStruct));
        address signer = ecrecover(hash, v, r, s);
        return (signer != address(0) && signer == target);
    }

    // Builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function verifyPersonalSign(address target, bytes32 hashStruct, uint8 v, bytes32 r, bytes32 s) internal pure returns (bool) {
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
        require(block.timestamp <= deadline, "AnyswapV3ERC20: Expired permit");

        bytes32 hashStruct = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                target,
                spender,
                value,
                nonces[target]++,
                deadline));

        require(verifyEIP712(target, hashStruct, v, r, s) || verifyPersonalSign(target, hashStruct, v, r, s));

        // _approve(owner, spender, value);
        allowance[target][spender] = value;
        //emit Approval(target, spender, value);
    }

    // only Auth needs to be implemented
    function Swapin(
        bytes32 txhash, 
        address account, 
        uint256 amount
    ) public override returns (bool) {
        _mint(account, amount);
        // emit LogSwapin(txhash, account, amount);
        return true;
    }

    function Swapout(
        uint256 amount, 
        address bindaddr
    ) public override returns (bool) {
        require(!_vaultOnly, "AnyswapV4ERC20: onlyAuth");
        require(bindaddr != address(0), "AnyswapV3ERC20: address(0x0)");
        _burn(msg.sender, amount);
        // emit LogSwapout(msg.sender, bindaddr, amount);
        return true;
    }

    function approveAndCall(
        address spender, 
        uint256 value, 
        bytes calldata data
    ) external override returns (bool) {
        // _approve(msg.sender, spender, value);
        allowance[msg.sender][spender] = value;
        //emit Approval(msg.sender, spender, value);

        return IApprovalReceiver(spender).onTokenApproval(msg.sender, value, data);
    }

    function transferAndCall(
        address to, 
        uint value, 
        bytes calldata data
    ) external override returns (bool) {
        require(to != address(0) || to != address(this));

        uint256 balance = balanceOf[msg.sender];
        require(balance >= value, "AnyswapV3ERC20: transfer amount exceeds balance");

        balanceOf[msg.sender] = balance - value;
        balanceOf[to] += value;
        //emit Transfer(msg.sender, to, value);

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
        require(block.timestamp <= deadline, "AnyswapV3ERC20: Expired permit");

        bytes32 hashStruct = keccak256(
            abi.encode(
                TRANSFER_TYPEHASH,
                target,
                to,
                value,
                nonces[target]++,
                deadline));

        require(verifyEIP712(target, hashStruct, v, r, s) || verifyPersonalSign(target, hashStruct, v, r, s));

        require(to != address(0) || to != address(this));

        uint256 balance = balanceOf[target];
        require(balance >= value, "AnyswapV3ERC20: transfer amount exceeds balance");

        balanceOf[target] = balance - value;
        balanceOf[to] += value;
        //emit Transfer(target, to, value);

        return true;
    }
}