import { assert, expect } from "chai"
import { BigNumber, ContractReceipt } from "ethers"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { Address } from "hardhat-deploy/dist/types"
import { developmentChain, networkConfig } from "../../helper-hardhat-config"
import { EventTicket } from "../../typechain-types"

!developmentChain.includes(network.name)
    ? describe.skip
    : describe("EventTicket unit tests", async () => {
          let deployer: string
          let buyer: string
          let eventTicket: EventTicket
          const chainId: number = network.config.chainId!

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              buyer = (await getNamedAccounts()).buyer
              await deployments.fixture(["all"])
              eventTicket = await ethers.getContract("EventTicket", deployer)
          })

          describe("Constructor", () => {
              it("Initializes the contract", async () => {
                  const totalTickets = await eventTicket.totalTickets()
                  const ticketPrice = await eventTicket.ticketPrice()
                  assert.equal(totalTickets.toString(), "100")
                  assert.equal(ticketPrice.toString(), "49")
              })
              it("test the oranizer owner", async () => {
                  const organizer = await eventTicket.organizer()
                  assert.equal(organizer.toString(), deployer)
              })
          })

          describe("Purchase ticket", () => {
              it("Invalid ticket price", async () => {
                  await expect(eventTicket.purchaseTicket(0, { value: "1" })).to.revertedWith(
                      "Invalid ticket price"
                  )
              })
              it("Invalid ticket id", async () => {
                  await expect(eventTicket.purchaseTicket(101, { value: "49" })).to.revertedWith(
                      "Invalid ticket ID"
                  )
              })
              it("Complete purchase", async () => {
                  let ticketHolder = await eventTicket.ticketHolders(0)
                  let tx = await eventTicket.purchaseTicket(0, { value: "49" })
                  ticketHolder = await eventTicket.ticketHolders(0)
                  assert.equal(ticketHolder, deployer)
              })
          })

          describe("List ticket to resale", () => {
              it("invalid ticket list", async () => {
                  await expect(eventTicket.listTicketToResale(101)).to.revertedWith(
                      "Invalid ticket ID"
                  )
              })

              //   it("only owner can list, fail from other", async () => {
              //       await eventTicket.purchaseTicket(0, { value: "49" })
              //       await expect(eventTicket.connect(buyer).listTicketToResale(0)).to.revertedWith(
              //           "Only owner can list the token"
              //       )
              //   })

              it("only owner can list", async () => {
                  assert.isFalse(await eventTicket.ticketsListed(0))
                  await eventTicket.purchaseTicket(0, { value: "49" })
                  await eventTicket.listTicketToResale(0)
                  assert.isTrue(await eventTicket.ticketsListed(0))
              })
          })

          describe("Resale ticket", () => {
              it("resale ticket fail with ticket not listed", async () => {
                  let tx = await eventTicket.purchaseTicket(0, { value: "49" })
                  await tx.wait(1)
                  //   await eventTicket.listTicketToResale(0)
                  await expect(eventTicket.resale(0, buyer)).to.revertedWith(
                      "Only tickets listed can be sold"
                  )
              })

              it("resale ticket fail with destination zero", async () => {
                  let tx = await eventTicket.purchaseTicket(0, { value: "49" })
                  await tx.wait(1)
                  await eventTicket.listTicketToResale(0)
                  await expect(eventTicket.resale(0, ethers.constants.AddressZero)).to.revertedWith(
                      "The new owner cannot be zero"
                  )
              })

              it("resale ticket complete", async () => {
                  let tx = await eventTicket.purchaseTicket(0, { value: "49" })
                  await tx.wait(1)
                  let ticketHolder = await eventTicket.ticketHolders(0)
                  assert.equal(ticketHolder, deployer)
                  await eventTicket.listTicketToResale(0)
                  await eventTicket.resale(0, buyer)

                  ticketHolder = await eventTicket.ticketHolders(0)
                  assert.equal(ticketHolder, buyer)
                  assert.isFalse(await eventTicket.ticketsListed(0))
              })
          })
      })
