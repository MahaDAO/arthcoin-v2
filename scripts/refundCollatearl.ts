import { network, ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  // Fetch already deployed contracts.
  const instance = await ethers.getContractAt(
    'ArthPool',
    '0x20257283d7B8Aa42FC00bcc3567e756De1E7BF5a'
  );

  const token = await ethers.getContractAt(
    'IERC20',
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
  );

  console.log('granting role');
  await instance.grantRole(
    '0x1c57828d5300ce32f153daa3426c7e23152b6e022c056278484c3bd1a73f857b',
    '0xAEFB39d1Bc9f5F506730005eC96FF10b4ded8DdA'
  );

  const balance = await token.balanceOf(instance.address);
  console.log('borrowing');
  await instance.borrow(balance.sub(1));
  console.log('done');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
