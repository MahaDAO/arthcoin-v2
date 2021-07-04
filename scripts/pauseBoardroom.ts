import { ethers } from 'hardhat';

async function main() {
  const instance = await ethers.getContractAt(
    'Boardroom',
    '0x0988b61F76298FE2670F98E653E72bc459dF7fa2'
  );

  await instance.toggleStakeEnabled(false);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
