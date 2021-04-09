import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract, ContractFactory, BigNumber, utils } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'

describe("ArthPool contract", function () {
  it("First deployment with arthpool", async function () {
    const [owner] = await ethers.getSigners();

    const ETH = utils.parseEther('1');

    let ArthPoolLibrary: ContractFactory;
    let arthPoolLibrary: Contract;
    let ArthPool: ContractFactory;
    let arthPool: Contract;

    const Arth = await ethers.getContractFactory("ARTHStablecoin");
    const arth = await Arth.deploy()
    const MockUniswapOracle = await ethers.getContractFactory("MockUniswapOracle");
    const mockUniswapOracle = await MockUniswapOracle.deploy();
    const ArthX = await ethers.getContractFactory("ARTHShares");
    const arthx = await ArthX.deploy('ARTHX', 'ARTHX', mockUniswapOracle.address, owner.address, owner.address)
    const FakeCollateralDAI = await ethers.getContractFactory("FakeCollateral_DAI");
    const fakeCollateralDAI = await FakeCollateralDAI.deploy(owner.address, ETH.mul(10000), 'DAI', 18);
    const MahaToken = await ethers.getContractFactory("MahaToken");
    const mahaToken = await MahaToken.deploy()
    const ARTHMAHAOracle = await ethers.getContractFactory("ARTHMAHAOracle");
    const arthmahaoracle = await ARTHMAHAOracle.deploy('ARTH/MAHA', ETH);
    const ArthController = await ethers.getContractFactory("ArthController");
    const arthController = await ArthController.deploy(owner.address, owner.address);

    ArthPoolLibrary = await ethers.getContractFactory('ArthPoolLibrary');
    arthPoolLibrary = await ArthPoolLibrary.deploy();

    ArthPool = await ethers.getContractFactory('ArthPool', {
      libraries: {
        ArthPoolLibrary: arthPoolLibrary.address
      }
    });

    arthPool = await ArthPool.deploy(
      arth.address,
      arthx.address,
      fakeCollateralDAI.address,
      owner.address,
      owner.address,
      mahaToken.address,
      arthmahaoracle.address,
      arthController.address,
      ETH.mul(90000)
    );

    await arthPool.setPoolParameters(
      ETH.mul(30000),
      1500,
      1000,
      1000,
      1000,
      1000
    )

    await fakeCollateralDAI.approve(arthPool.address, ETH);
    await arthPool.mint1t1ARTH(ETH, 0);
  });
});
