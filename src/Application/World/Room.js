import Application from "../Application.js";
import WallVisibility from "./WorldHelper/WallVisibility.js";
import Mirror from "./Mirror.js";
import TerrainGenerator from "./WorldHelper/TerrainGenerator.js";
import config from "../../config.js";

export default class Room
{
    constructor()
    {
        this.application = new Application()
        this.scene = this.application.scene
        this.resources = this.application.resources

        this.resource = this.resources.items.roomModel

        this.setMesh()
        this.setTerrain()
        this.setPhysicsBodies()
    }

    setTerrain()
    {
        this.terrain = new TerrainGenerator()
        this.terrain.setDebug((mode) => this.safeSwapTerrain(mode))
    }

    safeSwapTerrain(mode)
    {
        const hand = this.application.world.hand

        if(hand && this.terrain.isWithinPlatform(
            hand.model.position.x,
            hand.model.position.z
        ))
        {
            hand.model.position.set(0, 0, 0)
            this.application.followTarget.copy(hand.model.position)
        }

        this.terrain.generate(mode)

        this._swapTerrainBody()
    }

    setPhysicsBodies()
    {
        const physics = this.application.physicsWorld

        this._roomBodies = physics.addStaticObject(this.model)

        this._terrainBody = physics.addStaticMesh(this.terrain.currentTerrain)
    }

    _swapTerrainBody()
    {
        const physics = this.application.physicsWorld
        physics.removeBody(this._terrainBody)
        this._terrainBody = physics.addStaticMesh(this.terrain.currentTerrain)
    }

    setMesh()
    {
        this.model = this.resource.scene

        this.model.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.receiveShadow = true
                child.castShadow = true
            }
        })
        this.model.scale.setScalar(config.hand.scale)
        this.scene.add(this.model)
        this.wallVisibility = new WallVisibility(this.model)
        this.mirror = new Mirror(this.model)
    }

    update()
    {
         this.wallVisibility.update()
    }
}