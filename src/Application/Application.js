import * as THREE from 'three'
import Sizes from "./Utils/Sizes.js";
import Time from "./Utils/Time.js";
import Camera from './Camera.js'
import Renderer from './Renderer.js';
import World from './World/World.js'
import Resources from "./Utils/Resources.js";
import Debug from "./Utils/Debug.js"
import sources from "./sources.js";
import CharacterController from "./CharacterController.js";
import PhysicsWorld from "./World/Physics/PhysicsWorld.js";
import Testing from "./Testing.js";

let instance = null

export default class Application
{
    constructor(canvas)
    {
        if(instance)
        {
            return instance
        } else
        {
            instance = this
        }
        window.application = this

        this.canvas = canvas

        this.debug = new Debug()
        this.sizes = new Sizes()
        this.time = new Time()
        this.scene = new THREE.Scene()
        this.resources = new Resources(sources)
        this.followTarget = new THREE.Vector3(0,1,0)
        this.physicsWorld = new PhysicsWorld()
        this.world = new World()
        this.camera = new Camera()
        this.renderer = new Renderer()

        this.characterController = new CharacterController()
        this.testing = new Testing()


        this.sizes.on('resize', () =>
        {
            this.resize()
        })

        this.time.on('tick', () =>
        {
            this.update()
        })
    }

    resize()
    {
        this.camera.resize()
        this.renderer.resize()
    }

    update()
    {
        this.physicsWorld.update(this.time.delta)
        this.characterController.update()
        this.camera.update()
        this.world.update()
        this.renderer.update()
        this.testing.update()
    }

    destroy()
    {
        this.sizes.off('resize')
        this.time.off('tick')

        this.scene.traverse((child) =>
        {
            if(child instanceof THREE.Mesh)
            {
                child.geometry.dispose()

                for(const key in child.material)
                {
                    const value = child.material[key]
                    if(value && typeof value.dispose === 'function')
                    {
                        value.dispose()
                    }
                }
            }
        })

        this.camera.controls.dispose()
        this.renderer.instance.dispose()

        if(this.debug.active)
        {
            this.debug.ui.destroy()
        }
    }
}