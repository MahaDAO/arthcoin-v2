const chalk = require('chalk');
const Multicall = artifacts.require('Multicall');
const Migrations = artifacts.require("Util/Migrations");

module.exports = async function (deployer, network, accounts) {
  console.log(chalk.yellow("\nUsing following accounts: "));
  console.log(accounts);

  deployer.deploy(Migrations);
  if (network === 'development') await deployer.deploy(Multicall);
};
