import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, BigNumber, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

chai.use(solidity);

describe('Basic Staking', () => {
  const DAY = 24 * 60 * 60;
  const ETH = utils.parseEther('1');
  const HALF_ETH = ETH.mul(50).div(100);

  let owner: SignerWithAddress;
  let whale: SignerWithAddress;
  let whale2: SignerWithAddress;

  let ARTH: ContractFactory;
  let ARTHX: ContractFactory;
  let BasicStaking: ContractFactory;

  let arth: Contract;
  let arthx: Contract;
  let staking: Contract;

  before(' - Setup accounts', async () => {
    [owner, whale, whale2] = await ethers.getSigners();
  });

  before(' - Fetch contract factories', async () => {
    ARTHX = await ethers.getContractFactory('ARTHShares');
    ARTH = await ethers.getContractFactory('ARTHStablecoin');
    BasicStaking = await ethers.getContractFactory('BasicStaking');
  });

  beforeEach(' - Deploy contracts', async () => {
    arth = await ARTH.deploy();
    arthx = await ARTHX.deploy();

    staking = await BasicStaking.deploy(
      owner.address,
      arthx.address,
      arth.address,
      7 * DAY
    );
  });

  beforeEach(' - Set some contract variables', async () => {
    await staking.initializeDefault();
    await arth.transfer(whale.address, ETH.mul(5));
    await arth.transfer(whale2.address, ETH.mul(5));
  });

  describe('- Access restricted functions', async () => {
    it (' - Should not work if not reward distribuent', async () => {
      await expect(staking.connect(whale).initializeDefault())
        .to.revertedWith('Caller is not RewardsDistribution contract');
    });
  });

  describe('- Stake', async () => {
    beforeEach(' - Approve staking token', async () => {
      await arth.approve(staking.address, ETH.mul(2));
      await arth.connect(whale).approve(staking.address, ETH.mul(2));
    });

    it(' - Should not work with 0 amount', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const contractARTHBalanceBefore = await arth.balanceOf(staking.address);

      await expect(staking.stake(0)).to.revertedWith('Cannot stake 0');

      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBefore);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBefore);
      expect(await staking.totalSupply()).to.eq(0);
      expect(await staking.balanceOf(owner.address)).to.eq(0);
    });

    it(' - Should work for 1 account', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const contractARTHBalanceBefore = await arth.balanceOf(staking.address);

      await expect(staking.stake(ETH))
        .to.emit(staking, 'Staked')
        .withArgs(owner.address, ETH);

      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBefore.add(ETH));
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBefore.sub(ETH));

      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);

      await expect(staking.stake(ETH))
        .to.emit(staking, 'Staked')
        .withArgs(owner.address, ETH);

      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBefore.add(ETH).add(ETH));
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBefore.sub(ETH).sub(ETH));
      expect(await staking.totalSupply()).to.eq(ETH.add(ETH));
      expect(await staking.balanceOf(owner.address)).to.eq(ETH.add(ETH));
    });

    it(' - Should work for 2 accounts with same amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(staking.address);

      await expect(staking.stake(ETH))
        .to.emit(staking, 'Staked')
        .withArgs(owner.address, ETH);

      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBefore.add(ETH));
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBefore.sub(ETH));

      expect(await arth.balanceOf(whale.address)).to.eq(whaleARTHBalanceBefore);
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);
      expect(await staking.balanceOf(whale.address)).to.eq(0);

      await expect(staking.connect(whale).stake(ETH))
        .to.emit(staking, 'Staked')
        .withArgs(whale.address, ETH);

      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBefore.add(ETH).add(ETH));
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBefore.sub(ETH));
      expect(await arth.balanceOf(whale.address)).to.eq(whaleARTHBalanceBefore.sub(ETH));

      expect(await staking.totalSupply()).to.eq(ETH.add(ETH));
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);
      expect(await staking.balanceOf(whale.address)).to.eq(ETH);
    });

    it(' - Should work for 2 accounts with different amounts', async () => {
      const ownerARTHBalanceBefore = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBefore = await arth.balanceOf(whale.address);
      const contractARTHBalanceBefore = await arth.balanceOf(staking.address);

      await expect(staking.stake(ETH))
        .to.emit(staking, 'Staked')
        .withArgs(owner.address, ETH);

      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBefore.add(ETH));
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBefore.sub(ETH));

      expect(await arth.balanceOf(whale.address)).to.eq(whaleARTHBalanceBefore);
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);
      expect(await staking.balanceOf(whale.address)).to.eq(0);

      await expect(staking.connect(whale).stake(ETH.mul(2)))
        .to.emit(staking, 'Staked')
        .withArgs(whale.address, ETH.mul(2));

      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBefore.add(ETH).add(ETH).add(ETH));
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBefore.sub(ETH));
      expect(await arth.balanceOf(whale.address)).to.eq(whaleARTHBalanceBefore.sub(ETH).sub(ETH));

      expect(await staking.totalSupply()).to.eq(ETH.add(ETH).add(ETH));
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);
      expect(await staking.balanceOf(whale.address)).to.eq(ETH.add(ETH));
    });
  });

  describe('- Withdraw', async () => {
    beforeEach(' - Approve staking token', async () => {
      await arth.approve(staking.address, ETH.mul(2));
      await arth.connect(whale).approve(staking.address, ETH.mul(2));
      await arth.connect(whale2).approve(staking.address, ETH.mul(2));
    });

    it(' - Should fail for amount = 0', async () => {
      await expect(staking.withdraw(0)).to.revertedWith('Cannot withdraw 0');
    });

    it(' - Should not withdraw for non staker', async () => {
      await expect(staking.connect(owner).withdraw(ETH)).to.revertedWith('');
      await expect(staking.connect(whale).withdraw(ETH)).to.revertedWith('');
    });

    it(' - Should not work if withdrawing > staked', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(staking.address);

      await staking.stake(ETH);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);

      await expect(staking.connect(owner).withdraw(ETH.mul(105).div(100))).to.revertedWith('');

      expect(await staking.balanceOf(owner.address)).to.eq(ETH);
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH));
    });

    it(' - Should work for 1 account', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(
        staking.address
      );

      await staking.stake(ETH);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);

      await staking.connect(owner).withdraw(ETH);

      expect(await staking.balanceOf(owner.address)).to.eq(0);
      expect(await staking.totalSupply()).to.eq(0);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking);
    });

    it(' - Should work properly for 1 account if withdrawing < staked', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(staking.address);

      await staking.stake(ETH);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);

      await staking.connect(owner).withdraw(HALF_ETH);

      expect(await staking.balanceOf(owner.address)).to.eq(HALF_ETH);
      expect(await staking.totalSupply()).to.eq(HALF_ETH);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(HALF_ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(HALF_ETH));
    });

    it(' - Should work properly if non staker tries withdraw after someone has staked', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(
        staking.address
      );

      await staking.stake(ETH);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);

      await expect(staking.connect(whale).withdraw(HALF_ETH)).to.revertedWith('');

      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH));
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);

      await staking.connect(owner).withdraw(HALF_ETH);

      expect(await staking.balanceOf(owner.address)).to.eq(HALF_ETH);
      expect(await staking.totalSupply()).to.eq(HALF_ETH);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking.sub(HALF_ETH));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(HALF_ETH) );
    });

    it(' - Should work for 2 accounts with same amount', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBeforeStaking = await arth.balanceOf(whale.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(staking.address);

      await staking.connect(owner).stake(ETH);
      await staking.connect(whale).stake(ETH);
      expect(await staking.totalSupply()).to.eq(ETH.mul(2));
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);
      expect(await staking.balanceOf(whale.address)).to.eq(ETH);
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH.mul(2)));

      await staking.connect(owner).withdraw(ETH);
      expect(await staking.totalSupply()).to.eq(ETH);
      expect(await staking.balanceOf(owner.address)).to.eq(0);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking);
      expect(await staking.balanceOf(whale.address)).to.eq(ETH);
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH));

      await staking.connect(whale).withdraw(ETH);
      expect(await staking.totalSupply()).to.eq(0);
      expect(await staking.balanceOf(owner.address)).to.eq(0);
      expect(await staking.balanceOf(whale.address)).to.eq(0);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(whale.address)).to.eq(whaleARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking);
    });

    it(' - Should work for 2 accounts with different amount', async () => {
      const ownerARTHBalanceBeforeStaking = await arth.balanceOf(owner.address);
      const whaleARTHBalanceBeforeStaking = await arth.balanceOf(whale.address);
      const contractARTHBalanceBeforeStaking = await arth.balanceOf(staking.address);

      await staking.connect(owner).stake(ETH);
      await staking.connect(whale).stake(ETH.mul(2));
      expect(await staking.totalSupply()).to.eq(ETH.mul(3));
      expect(await staking.balanceOf(owner.address)).to.eq(ETH);
      expect(await staking.balanceOf(whale.address)).to.eq(ETH.mul(2));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH.mul(3)));

      await staking.connect(owner).withdraw(ETH);
      expect(await staking.totalSupply()).to.eq(ETH.mul(2));
      expect(await staking.balanceOf(owner.address)).to.eq(0);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(whale.address)).to.eq(whaleARTHBalanceBeforeStaking.sub(ETH.mul(2)));
      expect(await staking.balanceOf(whale.address)).to.eq(ETH.mul(2));
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking.add(ETH).add(ETH));

      await staking.connect(whale).withdraw(ETH.mul(2));
      expect(await staking.totalSupply()).to.eq(0);
      expect(await staking.balanceOf(owner.address)).to.eq(0);
      expect(await staking.balanceOf(whale.address)).to.eq(0);
      expect(await arth.balanceOf(owner.address)).to.eq(ownerARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(whale.address)).to.eq(whaleARTHBalanceBeforeStaking);
      expect(await arth.balanceOf(staking.address)).to.eq(contractARTHBalanceBeforeStaking);
    });
  });

  describe('- Recover token', async () => {
    it('- Should not recover staking token', async () => {
      await arth.approve(staking.address, ETH);

      await staking.stake(ETH);
      await expect(staking.recoverERC20(arth.address, owner.address, ETH)).to.revertedWith('Cannot withdraw the staking token');
    });

    it('- Should not recover staking token', async () => {
      await arthx.transfer(staking.address, ETH);

      await expect(staking.recoverERC20(arthx.address, owner.address, ETH)).to.revertedWith('Cannot withdraw the rewards token');
    });
  });
});
