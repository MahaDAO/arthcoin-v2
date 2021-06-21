import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Bytes, Contract, ContractFactory, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import deploy from './Deployments';

chai.use(solidity);

describe('ARTHPool AMOS', () => {
  let attacker: SignerWithAddress;
  let timelock: SignerWithAddress;
  let owner: SignerWithAddress;
  let ETH: BigNumber;
  let provider: JsonRpcProvider;
  let dai: Contract;
  let arthPool: Contract;

  beforeEach(' - Get deployment', async() => {
    const deployments = await deploy();

    dai = deployments.dai;
    provider = deployments.provider;
    ETH = deployments.ETH;
    arthPool = deployments.arthPool;
    attacker = deployments.attacker;
    timelock = deployments.timelock;
    owner = deployments.owner;
  });

  describe(' - AMO_ROLE', async () => {
    let AMO_ROLE_BYTES: Bytes;

    beforeEach('- Fetch AMO ROLE from contract', async () => {
      AMO_ROLE_BYTES = await arthPool._AMO_ROLE();
      await dai.transfer(arthPool.address, ETH.mul(2));
    });

    it('- Nobody should have AMO_ROLE by default', async () => {
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, owner.address)).to.eq(false);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, timelock.address)).to.eq(false);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, attacker.address)).to.eq(false);
    });

    it('- Nobody should be able to use borrow if not AMO_ROLE', async () => {
      await expect(arthPool.connect(timelock).borrow(ETH)).to.revertedWith('ArthPool: forbidden');
      await expect(arthPool.connect(attacker).borrow(ETH)).to.revertedWith('ArthPool: forbidden');
      await expect(arthPool.connect(owner).borrow(ETH)).to.revertedWith('ArthPool: forbidden');
    });

    it('- Nobody should be able to use borrow if not AMO_ROLE', async () => {
      await expect(arthPool.connect(attacker).repay(ETH)).to.revertedWith('ArthPool: forbidden');
      await expect(arthPool.connect(owner).repay(ETH)).to.revertedWith('ArthPool: forbidden');
      await expect(arthPool.connect(timelock).repay(ETH)).to.revertedWith('ArthPool: forbidden');
    });

    it('- Should not be able to give and revoke AMO_ROLE if not DEFAULT_ADMIN', async () => {
      await expect(arthPool.connect(timelock).grantRole(AMO_ROLE_BYTES, timelock.address))
        .to.revertedWith('AccessControl: sender must be an admin to grant');

      await expect(arthPool.connect(attacker).grantRole(AMO_ROLE_BYTES, timelock.address))
        .to.revertedWith('AccessControl: sender must be an admin to grant');

      await expect(arthPool.connect(timelock).grantRole(AMO_ROLE_BYTES, attacker.address))
        .to.revertedWith('AccessControl: sender must be an admin to grant');

      await expect(arthPool.connect(attacker).grantRole(AMO_ROLE_BYTES, attacker.address))
        .to.revertedWith('AccessControl: sender must be an admin to grant');

      await expect(arthPool.connect(timelock).revokeRole(AMO_ROLE_BYTES, timelock.address))
        .to.revertedWith('AccessControl: sender must be an admin to revoke');

      await expect(arthPool.connect(attacker).revokeRole(AMO_ROLE_BYTES, timelock.address))
        .to.revertedWith('AccessControl: sender must be an admin to revoke');

      await expect(arthPool.connect(timelock).revokeRole(AMO_ROLE_BYTES, attacker.address))
        .to.revertedWith('AccessControl: sender must be an admin to revoke');

      await expect(arthPool.connect(attacker).revokeRole(AMO_ROLE_BYTES, attacker.address))
        .to.revertedWith('AccessControl: sender must be an admin to revoke');
    });

    it('- Should be able to give and revoke AMO_ROLE if not DEFAULT_ADMIN', async () => {
      await expect(arthPool.connect(owner).grantRole(AMO_ROLE_BYTES, owner.address))
        .to.not.reverted;

      expect(await arthPool.hasRole(AMO_ROLE_BYTES, owner.address)).to.eq(true);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, timelock.address)).to.eq(false);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, attacker.address)).to.eq(false);

      await expect(arthPool.connect(owner).grantRole(AMO_ROLE_BYTES, timelock.address))
        .to.not.reverted;

      expect(await arthPool.hasRole(AMO_ROLE_BYTES, owner.address)).to.eq(true);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, timelock.address)).to.eq(true);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, attacker.address)).to.eq(false);

      await expect(arthPool.connect(owner).revokeRole(AMO_ROLE_BYTES, timelock.address))
        .to.not.reverted;

      expect(await arthPool.hasRole(AMO_ROLE_BYTES, owner.address)).to.eq(true);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, timelock.address)).to.eq(false);
      expect(await arthPool.hasRole(AMO_ROLE_BYTES, attacker.address)).to.eq(false);
    });

    it('- Should be able to borrow if AMO_ROLE', async () => {
      await expect(arthPool.connect(owner).grantRole(AMO_ROLE_BYTES, owner.address))
        .to.not.reverted;

      const poolCollateralBalanceBeforeBorrow = await dai.balanceOf(arthPool.address);
      const amoCollateralBalanceBeforeBorrow = await dai.balanceOf(owner.address);

      expect(await arthPool.connect(owner).borrow(ETH))
        .to.emit(arthPool, 'Borrow')
        .withArgs(owner.address, ETH);

      expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBeforeBorrow.sub(ETH));
      expect(await dai.balanceOf(owner.address)).to.eq(amoCollateralBalanceBeforeBorrow.add(ETH));
    });

    it('- Should be able to repay if AMO_ROLE', async () => {
      await expect(arthPool.connect(owner).grantRole(AMO_ROLE_BYTES, owner.address))
        .to.not.reverted;

      const poolCollateralBalanceBeforeBorrow = await dai.balanceOf(arthPool.address);
      const amoCollateralBalanceBeforeBorrow = await dai.balanceOf(owner.address);

      expect(await arthPool.connect(owner).borrow(ETH))
        .to.emit(arthPool, 'Borrow')
        .withArgs(owner.address, ETH);

      const poolCollateralBalanceAfterBorrow = await dai.balanceOf(arthPool.address);
      const amoCollateralBalanceAfterBorrow = await dai.balanceOf(owner.address);

      expect(poolCollateralBalanceAfterBorrow).to.eq(poolCollateralBalanceBeforeBorrow.sub(ETH));
      expect(amoCollateralBalanceAfterBorrow).to.eq(amoCollateralBalanceBeforeBorrow.add(ETH));

      await dai.connect(owner).approve(arthPool.address, ETH);

      expect(await arthPool.connect(owner).repay(ETH))
        .to.emit(arthPool, 'Repay')
        .withArgs(owner.address, ETH);

      expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceBeforeBorrow);
      expect(await dai.balanceOf(owner.address)).to.eq(amoCollateralBalanceBeforeBorrow);
      expect(await dai.balanceOf(arthPool.address)).to.eq(poolCollateralBalanceAfterBorrow.add(ETH));
      expect(await dai.balanceOf(owner.address)).to.eq(amoCollateralBalanceAfterBorrow.sub(ETH));
    });
  });
});
