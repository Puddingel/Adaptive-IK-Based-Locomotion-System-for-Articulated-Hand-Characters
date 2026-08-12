import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import Application from '../Application.js'
import config from "../../config.js";

export default class Mirror
{
    constructor(roomModel)
    {
        this.application = new Application()
        this.scene = this.application.scene

        this.originalMirror = null

        roomModel.traverse((child) =>
        {
            if(child.name === 'mirror')
            {
                this.originalMirror = child
                child.visible = false
            }
        })

        this.setReflector()
    }

    setReflector()
    {
        const geometry = new THREE.PlaneGeometry(1.65, 1.156)

        this.reflector = new Reflector(geometry, {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0xffffff
        })

        this.reflector.position.set(1.066 * config.hand.scale, 0.75 * config.hand.scale, 0 * config.hand.scale)

        this.reflector.rotation.y = -Math.PI / 2
        this.reflector.scale.setScalar(config.hand.scale)
        this.scene.add(this.reflector)
    }
}