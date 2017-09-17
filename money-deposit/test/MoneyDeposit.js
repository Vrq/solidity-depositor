const MoneyDeposit = artifacts.require('./MoneyDeposit.sol');

const {
    getBalance,
    getEventFromLogs,
    assertThrowsInvalidOpcode,
    assertValueEqual,
    assertValueAlmostEqual
} = require('./Helpers.js');

const SMALL_VALUE = 0.05;
const VALUE = 0.1;
const BIG_VALUE = 0.2
const VALUE_WEI = web3.toWei(VALUE, 'ether');
const SMALL_VALUE_WEI = web3.toWei(SMALL_VALUE, 'ether');
const BIG_VALUE_WEI = web3.toWei(BIG_VALUE, 'ether');

const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [time], // 86400 is num seconds in day
            id: new Date().getTime()
        }, (err, result) => {
            if(err){ return reject(err) }
            return resolve(result)
        });
    })
}

contract(`MoneyDeposit`, accounts => {
    const OWNER = accounts[0];
    const NON_OWNER = accounts[1];

    let moneyDeposit;

    beforeEach(async () => {
        moneyDeposit = await MoneyDeposit.new();
    });

    context(`Given made deposit to the MoneyDeposit`, () => {
        let deposit;

        beforeEach(async () => {
            deposit = await moneyDeposit.deposit(VALUE_WEI, {
                from: OWNER,
                value: VALUE_WEI,
            });
        });

        it('Deposit should emit Transfer event', async () => {
            const event = getEventFromLogs(deposit.logs, 'Transfer');
            assert.ok(event);
            assert.equal(event.args._from, OWNER);
            assert.equal(event.args._to, moneyDeposit.address);
            assertValueEqual(event.args._value, VALUE_WEI);
        });

        it('MoneyDeposit balance should increase', async () => {
            const moneyDepositBalance = await getBalance(moneyDeposit.address);
            assertValueEqual(moneyDepositBalance, VALUE_WEI);
        });

        it('Owner should be able to withdraw his money', async () => {
            const initialBalance = await getBalance(OWNER);

            await timeTravel(86400 * 14);
            await moneyDeposit.withdraw(VALUE_WEI, {
                from: OWNER
            });

            const balance = await getBalance(OWNER);
            const newMoneyDepositBalance = await getBalance(moneyDeposit.address);
            const acceptableError = web3.toWei(0.01, 'ether');

            assertValueAlmostEqual(balance, initialBalance.add(VALUE_WEI), acceptableError);
            assertValueEqual(newMoneyDepositBalance, 0);
        });

        it('Withdraw should emit Transfer Event', async () => {
            let withdraw;
            await timeTravel(86400 * 14);
            withdraw = await moneyDeposit.withdraw(VALUE_WEI, {
                from: OWNER
            });

            const event = getEventFromLogs(withdraw.logs, 'Transfer');
            assert.ok(event);
            assert.equal(event.args._from, moneyDeposit.address);
            assert.equal(event.args._to, OWNER);
            assertValueEqual(event.args._value, VALUE_WEI);
        });

        it('Should throw on withdrawal within 14 days from first deposit', async () => {
            assertThrowsInvalidOpcode(async () => {
                await moneyDeposit.withdraw(VALUE_WEI, {
                    from: OWNER
                });
            });
        });

        it('Should throw on withdrawal by non-owner', async () => {
            assertThrowsInvalidOpcode(async () => {
                await timeTravel(86400 * 14);
                await moneyDeposit.withdraw(VALUE_WEI, {
                    from: NON_OWNER
                });
            });
        });

        it('Should throw when owner declares a higher deposit value than msg.value', async () => {
            assertThrowsInvalidOpcode(async () => {
                await moneyDeposit.deposit(BIG_VALUE_WEI, {
                    from: OWNER,
                    value: VALUE_WEI,
                });
            });
        });

    });
});
