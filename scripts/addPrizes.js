const Raffles = artifacts.require("Raffles")
const prizes = require('./prizes')
// Utils
const ether = (n) => {
    return new web3.utils.BN(
        web3.utils.toWei(n.toString(), 'ether')
    )
}

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts()
        const user1 = accounts[0]

        const raffle = await Raffles.deployed()
        console.log('raffle fetched', raffle.address)
        
        prizes.forEach(async (data) => {
            await raffle.setPrize(
                data.name,
                data.description,
                data.address,
                data.tokenId,
                data.image
            )
        })

    }
    catch (error) {
        console.log(error)
    }

    callback()
}