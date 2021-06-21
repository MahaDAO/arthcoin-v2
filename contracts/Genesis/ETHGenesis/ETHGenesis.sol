// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {AccessControl} from '../../access/AccessControl.sol';
import {SafeMath} from '../../utils/math/SafeMath.sol';
import {IOracle} from '../../Oracle/IOracle.sol';
import {IERC20} from '../../ERC20/IERC20.sol';
import {ILotteryRaffle} from '../ILotteryRaffle.sol';
import {Math} from '../../utils/math/Math.sol';
import {ICurve} from '../../Curves/ICurve.sol';

contract ETHGenesis {
    using SafeMath for uint256;

    IERC20 public _COLLATERAL;
    IOracle public _collateralGMUOracle;
    ILotteryRaffle public lottery;
    ICurve public recollateralizeDiscountCruve;

    uint256 private constant _PRICE_PRECISION = 1e6;
    uint256 public immutable _missingDeciamls;
    address public _ownerAddress;
    address public _timelockAddress;
    address public collateralGMUOracleAddress;

    // ETH Genesis variables
    bool public genesisStatus;
    uint256 public _arthxPrice;
    uint256 public _arthSupply;
    uint256 public _getGlobalCollateralRatio;
    uint256 public _getGlobalCollateralValue;
    uint256 public maxRecollateralizeDiscount = 750000;
    uint256 public _percentCollateralized;
    uint256 public _collateralRaisedOnMatic;
    uint256 public _collateralRaisedOnETH;

    mapping(address => uint256) public usersArthx;

    event RedeemAlgorithmicARTH(uint256 arthAmount, uint256 arthxOutMin);

    modifier onlyByOwnerOrGovernance() {
        require(
            msg.sender == _timelockAddress || msg.sender == _ownerAddress,
            'ArthPool: You are not the owner or the governance timelock'
        );
        _;
    }

    constructor (
        address __collateralAddress,
        address _creatorAddress,
        address __timelockAddress,
        IOracle __collateralGMUOracle
    ) {
        _COLLATERAL = IERC20(__collateralAddress);

        _missingDeciamls = uint256(18).sub(_COLLATERAL.decimals());
        _ownerAddress = _creatorAddress;
        _timelockAddress = __timelockAddress;
        _collateralGMUOracle = __collateralGMUOracle;
    }

    function usersLotteriesCount(address _address) public view returns (uint256) {
        return lottery.usersLottery(_address);
    }

    function lotteryAllocated() public view returns (uint256) {
        return lottery.getTokenCounts();
    }

    function lotteryOwner(uint256 _tokenID) public view returns (address) {
        address owner = lottery.tokenIdOwner(_tokenID);
        return owner;
    }

    function setLotteryContract(address _lotterContract) public onlyByOwnerOrGovernance{
        lottery = ILotteryRaffle(_lotterContract);
    }

    function getLotteryAmount(uint256 _collateralAmount) internal view returns (uint256) {
        uint256 collateralValue = _collateralGMUOracle.getPrice().mul(_collateralAmount).div(10 ** 6);
        uint256 lotteryAmount = 0;
        if(collateralValue >= 1000 * 10 ** _COLLATERAL.decimals() ) {
            lotteryAmount = collateralValue.div(10 * 10 ** _COLLATERAL.decimals() );
        }

        return lotteryAmount;
    }

    function recollateralizeARTH(
        uint256 collateralAmount,
        uint256 arthxOutMin
    )
        external
        returns (uint256)
    {
        require(getIsGenesisActive(), 'Genesis: Genessis is inactive');

        uint256 arthxPrice = getArthxPrice();

        (uint256 collateralUnits, uint256 amountToRecollateralize, ) =
            estimateAmountToRecollateralize(collateralAmount);

        uint256 collateralUnitsPrecision =
            collateralUnits.div(10**_missingDeciamls);

        // NEED to make sure that recollatFee is less than 1e6.
        uint256 arthxPaidBack =
            amountToRecollateralize
                .mul(getRecollateralizationDiscount().add(1e6))
                .div(arthxPrice);

        require(arthxOutMin <= arthxPaidBack, 'Genesis: Slippage limit reached');
        require(
            _COLLATERAL.balanceOf(msg.sender) >= collateralUnitsPrecision,
            'Genesis: balance < required'
        );
        require(
            _COLLATERAL.transferFrom(
                msg.sender,
                _ownerAddress,//address(this),
                collateralUnitsPrecision
            ),
            'Genesis: transfer from failed'
        );

        uint256 lottriesCount = getLotteryAmount(collateralAmount);
        _collateralRaisedOnETH = collateralAmount.mul(getCollateralPrice()).add(_collateralRaisedOnETH);

        if (lottriesCount > 0) {
            lottery.rewardLottery(msg.sender, lottriesCount);
        }

        usersArthx[msg.sender] = usersArthx[msg.sender].add(arthxPaidBack);
        //_ARTHX.poolMint(msg.sender, arthxPaidBack);

        return arthxPaidBack;
    }

    function estimateAmountToRecollateralize(uint256 collateralAmount)
        public
        view
        returns (
            uint256 collateralUnits,
            uint256 amountToRecollateralize,
            uint256 recollateralizePossible
        )
    {
        uint256 collateralAmountD18 = collateralAmount * (10**_missingDeciamls);
        uint256 arthTotalSupply = getArthSupply();
        uint256 collateralRatioForRecollateralize =
            getGlobalCollateralRatio();
        uint256 globalCollatValue = getGlobalCollateralValue();

        return
            calcRecollateralizeARTHInner(
                collateralAmountD18,
                getCollateralPrice(),
                globalCollatValue,
                arthTotalSupply,
                collateralRatioForRecollateralize
            );
    }

    function getCollateralGMUBalance()
        external
        pure
        returns (uint256)
    {
        return 0;
    }

    function getCollateralPrice() public view returns (uint256) {
        return _collateralGMUOracle.getPrice();
    }

    // Genesis setters
    function setGenesisStatus(bool _status) public onlyByOwnerOrGovernance {
        genesisStatus = _status;
    }

    function setArthxPrice(uint256 _price) public onlyByOwnerOrGovernance {
        _arthxPrice = _price;
    }

    function setArthSupply(uint256 arthSupply) public onlyByOwnerOrGovernance {
        _arthSupply = arthSupply;
    }

    function setGlobalCollateralRation(uint256 _collateralRatio) public onlyByOwnerOrGovernance {
        _getGlobalCollateralRatio = _collateralRatio;
    }

    function setGlobalCollateralValue(uint256 _collateralValue) public onlyByOwnerOrGovernance {
        _getGlobalCollateralValue = _collateralValue;
    }

    function setRecollateralizationCurve(ICurve curve)
        external
        onlyByOwnerOrGovernance
    {
        recollateralizeDiscountCruve = curve;
    }

    function setPercentCollateralized(uint256 percentCollateralized) public onlyByOwnerOrGovernance {
        _percentCollateralized = percentCollateralized;
    }

    function setCollatGMUOracle(address _collateralGMUOracleAddress)
        public
        onlyByOwnerOrGovernance
    {
        collateralGMUOracleAddress = _collateralGMUOracleAddress;
        _collateralGMUOracle = IOracle(_collateralGMUOracleAddress);
    }

    function setCollateralRaisedOnMatic(uint256 _colletaralAmount) public onlyByOwnerOrGovernance {
        _collateralRaisedOnMatic = _colletaralAmount;
    }

    // Genesis getters
    function getIsGenesisActive() public view returns (bool) {
        return genesisStatus;
    }

    function getArthxPrice() public view returns (uint256) {
        return _arthxPrice;
    }

    function getArthSupply() public view returns (uint256) {
        return _arthSupply;
    }

    function getGlobalCollateralRatio() public view returns (uint256) {
       return _getGlobalCollateralRatio;
    }

    function getGlobalCollateralValue() public view returns (uint256) {
        return _getGlobalCollateralValue;
    }

    function getRecollateralizationDiscount()
        public
        view
        returns (uint256)
    {
        return
            Math.min(
                recollateralizeDiscountCruve
                    .getY(getPercentCollateralized())
                    .mul(_PRICE_PRECISION)
                    .div(100),
                maxRecollateralizeDiscount
            );
    }

    // function getPercentCollateralized()
    //     public
    //     view
    //     returns (uint256)
    // {
    //     return _percentCollateralized;
    // }

    function getTargetCollateralValue() public view returns (uint256) {
        return getArthSupply().mul(getGlobalCollateralRatio()).div(1e6);
    }

    function getPercentCollateralized() public view  returns (uint256) {
        uint256 targetCollatValue = getTargetCollateralValue();
        uint256 currentCollatValue = getGlobalCollateralValue().add(_collateralRaisedOnMatic);

        return currentCollatValue.mul(1e18).div(targetCollatValue);
    }

    // Arthpool Library
    function calcRecollateralizeARTHInner(
        uint256 collateralAmount,
        uint256 collateralPrice,
        uint256 globalCollatValue,
        uint256 arthTotalSupply,
        uint256 globalCollateralRatio
    )
        public
        pure
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 collateralValueAttempted =
            collateralAmount.mul(collateralPrice).div(1e6);
        uint256 effectiveCollateralRatio =
            globalCollatValue.mul(1e6).div(arthTotalSupply); //returns it in 1e6

        uint256 recollateralizePossible =
            (
                globalCollateralRatio.mul(arthTotalSupply).sub(
                    arthTotalSupply.mul(effectiveCollateralRatio)
                )
            )
                .div(1e6);

        uint256 amountToRecollateralize;
        if (collateralValueAttempted <= recollateralizePossible) {
            amountToRecollateralize = collateralValueAttempted;
        } else {
            amountToRecollateralize = recollateralizePossible;
        }

        return (
            amountToRecollateralize.mul(1e6).div(collateralPrice),
            amountToRecollateralize,
            recollateralizePossible
        );
    }
}
