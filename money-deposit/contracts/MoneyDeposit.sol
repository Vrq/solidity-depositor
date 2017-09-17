pragma solidity ^0.4.4;

// This is a simple contract that keeps track of balances and accepts deposits of Ether.
// 1. Does deposit() function work as expected?
// 2. Implement the missing withdraw() function that will allow only withdraw
//    of Ether after 14 days from the first deposit.

contract MoneyDeposit {
    mapping (address => uint) balances;
    mapping (address => uint) releaseTime; //this could also be a mapping of: struct Balance { uint balance, uint releaseTime }

    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    function deposit(uint amount) payable {
        require(msg.value >= amount); //we could remove the amount argument and just deposit msg.value instead
        balances[msg.sender] += amount; //tx.origin is deprecated, since it is the original caller (in a nested transaction)
                                        //and not the direct caller of the contract
        if(releaseTime[msg.sender] == 0) { //not sure if this is the best way to check for an empty value in the mapping
            releaseTime[msg.sender] = now + 14 days;
        }
        Transfer(msg.sender, this, amount);
    }

    function withdraw(uint amount) {
        require(balances[msg.sender] >= amount && now >= releaseTime[msg.sender]);
        balances[msg.sender] -= amount;
        msg.sender.transfer(amount);
        Transfer(this, msg.sender, amount);
    }
}