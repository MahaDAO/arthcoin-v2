const Raffles = artifacts.require("Raffles")

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
        var winners = [];
        
        const raffle = await Raffles.deployed()
        console.log('raffle fetched', raffle.address)

        const winnersCount = await raffle.prizeCounter()
        const totalLottries = await raffle.tokenCounter()

        while (winners.length < winnersCount) {
            var id = Math.floor(Math.random() * totalLottries) + 1;
            if (winners.indexOf(r) === -1) winners.push(id);
        }

        console.log(winners);
    }
    catch (error) {
        console.log(error)
    }

    callback()
}