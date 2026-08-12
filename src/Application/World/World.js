import Application from "../Application.js";
import Environment from "./Environment.js";
import Room from "./Room.js";
import Hand from "./Hand.js";
import EventEmitter from "../Utils/EventEmitter.js";

export default class World extends EventEmitter
{
    constructor()
    {
        super()

        this.application = new Application()
        this.scene = this.application.scene
        this.resources = this.application.resources

        this.resources.on('ready', () =>
        {
            this.room = new Room()
            this.hand = new Hand()
            this.environment = new Environment()

            this.trigger('characterReady', [this.hand])
        })
    }

    update()
    {
        if(this.hand)
        {
            this.hand.update()
        }
        if(this.room)
        {
            this.room.update()
        }
    }
}