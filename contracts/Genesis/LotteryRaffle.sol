// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import {SafeMath} from '../utils/math/SafeMath.sol';
import {ILotteryRaffle} from './ILotteryRaffle.sol';

contract LotteryRaffle is ERC721URIStorage, ILotteryRaffle, AccessControl {
    using SafeMath for uint256;

    uint256 public tokenCounter;
    uint256 public totalTickets;
    uint256 public prizeCounter;

    struct Lottery {
        uint256 tokenId;
        uint256 weight;
        address owner;
    }

    struct NftPrizeDetails {
        string description;
        address nftAddress;
        uint256 criteria;
        uint256 tokenId;
        string image;
        address winner;
    }

    mapping(address => uint256) public usersLotteries;
    mapping(string => NftPrizeDetails) public prizes;
    mapping(uint256 => Lottery) public lotteries;

    address[] public owners;
    mapping(address => bool) public ownerByAddress;

    modifier onlyOwner() {
        require(ownerByAddress[msg.sender] == true);
        _;
    }

    constructor(address[] memory genesis)
        ERC721('ARTH Genesis NFT Lottery Ticket', 'ARTH-GEN-LOTTERY')
    {
        tokenCounter = 0;
        prizeCounter = 0;

        ownerByAddress[msg.sender] = true;
        for (uint256 i = 0; i < genesis.length; i++) {
            ownerByAddress[genesis[i]] = true;
        }
    }

    function setOwner( address _owner ) public onlyOwner {
        ownerByAddress[_owner] = true;
    }

    function setPrizes(
        string memory _prize,
        string memory _description,
        uint256 _criteria,
        address _nftAddress,
        uint256 _nftId,
        string memory image
    ) public onlyOwner {
        prizeCounter = prizeCounter.add(1);
        prizes[_prize] = NftPrizeDetails(
            _description,
            _nftAddress,
            _criteria,
            _nftId,
            image,
            address(0)
        );
    }

    function setWinner(string memory _prize, uint256 _tokenId)
        public
        onlyOwner
    {
        NftPrizeDetails memory _nftDetails = prizes[_prize];

        address _tokenOwner = tokenIdOwner(_tokenId);
        _nftDetails.winner = _tokenOwner;

        prizes[_prize] = _nftDetails;
    }

    function rewardLottery(address _to, uint256 _amount)
        public
        override
        onlyOwner
    {
        tokenCounter = tokenCounter.add(1);
        totalTickets = totalTickets.add(_amount);

        lotteries[tokenCounter] = Lottery(tokenCounter, _amount, _to);
        usersLotteries[_to] = tokenCounter;

        _safeMint(_to, tokenCounter);
    }

    function checkResult(string memory _prize) public view returns (bool) {
        NftPrizeDetails memory _nftDetails = prizes[_prize];

        if (_nftDetails.winner == msg.sender) {
            return true;
        } else {
            return false;
        }
    }

    function getTokenCounts() public view override returns (uint256) {
        return tokenCounter;
    }

    function tokenIdOwner(uint256 _id) public view override returns (address) {
        return ownerOf(_id);
    }

    function usersLottery(address _address)
        public
        view
        override
        returns (uint256)
    {
        return usersLotteries[_address];
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
