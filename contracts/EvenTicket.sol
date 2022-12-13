// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract EventTicket is ERC721 {
    using SafeMath for uint256;

    // The address of the event organizer
    address public organizer;

    // The total number of tickets available for the event
    uint256 public totalTickets;

    // The price of each ticket
    uint256 public ticketPrice;

    // The list of addresses that have purchased tickets
    mapping(uint256 => address) public ticketHolders;

    mapping(uint256 => bool) public ticketsListed;

    // The event organizer can create an event by providing the total number of tickets
    // and the price of each ticket
    constructor(uint256 _totalTickets, uint256 _ticketPrice) ERC721("TicketEvent", "ITM") {
        organizer = msg.sender;
        totalTickets = _totalTickets;
        ticketPrice = _ticketPrice;
    }

    // Anyone can purchase a ticket by calling this function and sending the correct
    // amount of ether to the contract
    function purchaseTicket(uint256 _tokenId) public payable {
        require(msg.value == ticketPrice, "Invalid ticket price");
        require(_tokenId <= totalTickets, "Invalid ticket ID");
        require(ticketHolders[_tokenId] == address(0), "Sorry, this ticket has already been sold");

        // Transfer the ticket to the buyer
        _safeMint(msg.sender, _tokenId);
        ticketHolders[_tokenId] = msg.sender;
    }

    // The event organizer can call this function to withdraw the revenue from ticket sales
    function withdrawRevenue() public {
        require(msg.sender == organizer, "Only the event organizer can withdraw revenue");

        // Calculate the total revenue from ticket sales
        uint256 revenue = ticketPrice * totalTickets;

        // Transfer the revenue to the event organizer
        payable(organizer).transfer(revenue.div(20).mul(19));
    }

    function listTicketToResale(uint256 _tokenId) public {
        require(_tokenId <= totalTickets, "Invalid ticket ID");
        require(ticketHolders[_tokenId] == msg.sender, "Only owner can list the token");

        ticketsListed[_tokenId] = true;
    }

    function unlistTicketToResale(uint256 _tokenId) public {
        require(_tokenId <= totalTickets, "Invalid ticket ID");
        require(ticketHolders[_tokenId] == msg.sender, "Only owner can list the token");

        ticketsListed[_tokenId] = false;
    }

    function resale(uint256 _tokenId, address to) public payable {
        require(_tokenId <= totalTickets, "Invalid ticket ID");
        require(ticketsListed[_tokenId], "Only tickets listed can be sold");
        require(to != address(0), "The new owner cannot be zero");

        uint256 newPrice = msg.value;
        address prevOwner = ticketHolders[_tokenId];

        // pay 10% to the original organizer (artist)
        payable(organizer).transfer(newPrice.div(10).mul(1)); // 10%
        payable(prevOwner).transfer(newPrice.div(10).mul(9)); // 90%

        _transfer(msg.sender, to, _tokenId);
        ticketHolders[_tokenId] = to;
        ticketsListed[_tokenId] = false;
    }
}
