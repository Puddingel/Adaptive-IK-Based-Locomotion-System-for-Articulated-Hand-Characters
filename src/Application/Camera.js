import * as THREE from 'three'
import Application from './Application.js'
import config from '../config.js'

export default class Camera
{
    constructor()
    {
        this.application = new Application()
        this.sizes = this.application.sizes
        this.scene = this.application.scene
        this.canvas = this.application.canvas

        // Camera state
        this.target = null
        this.isReady = false
        this.orbitYOffset = 0

        // Spherical coordinates for orbiting
        this.spherical = new THREE.Spherical(1.2, config.camera.startPhi, 0)

        // Limits (werden in waitForTarget relativ gesetzt)
        this.minDistance = 0
        this.maxDistance = 0
        this.minPolarAngle = 0.1
        this.maxPolarAngle = Math.PI / 2 - 0.05

        // Mouse state
        this.mouse = {
            left: false,
            right: false,
            deltaX: 0,
            deltaY: 0
        }

        // Rotation speed
        this.rotateSpeed = config.camera.rotateSpeed
        this.keyRotateSpeed = config.camera.keyRotateSpeed

        this.setInstance()
        this.setupInput()
        this.waitForTarget()
    }

    setInstance()
    {
        this.instance = new THREE.PerspectiveCamera(
            60,
            this.sizes.width / this.sizes.height,
            0.001,
            10000
        )
        this.scene.add(this.instance)
    }

    waitForTarget()
    {
        this.application.world.on('characterReady', (hand) =>
        {
            this.target = hand.pivot
            this.isReady = true

            const l = hand.modelLength
            const c = config.camera

            // Alle distanzabhängigen Werte relativ zur Modellgröße
            this.minDistance      = l * c.minDistance
            this.maxDistance      = l * c.maxDistance
            this.spherical.radius = l * c.startRadius
            this.orbitYOffset     = l * c.orbitYOffset

            // Near/far relativ — near klein genug um Detailansicht zu erlauben
            // far groß genug um die gesamte Szene zu sehen
            this.instance.near = l * c.nearFactor
            this.instance.far  = l * c.farFactor
            this.instance.updateProjectionMatrix()

            // Startposition der Kamera
            this.instance.position.set(
                this.target.position.x,
                this.target.position.y + l * c.startHeightFactor,
                this.target.position.z + l * c.startDepthFactor
            )
        })
    }

    isGuiEvent(e)
    {
        return e.target.closest && e.target.closest('.lil-gui') !== null
    }

    setupInput()
    {
        window.addEventListener('mousedown', (e) =>
        {
            if(this.isGuiEvent(e)) return
            if(e.button === 0) this.mouse.left = true
            if(e.button === 2)
            {
                this.mouse.right = true
                this.canvas.requestPointerLock()
            }
        })

        window.addEventListener('mouseup', (e) =>
        {
            if(e.button === 0) this.mouse.left = false
            if(e.button === 2)
            {
                this.mouse.right = false
                document.exitPointerLock()
            }
        })

        window.addEventListener('mousemove', (e) =>
        {
            if(this.mouse.left)
            {
                this.mouse.deltaX = e.movementX
                this.mouse.deltaY = e.movementY
            }
            else if(document.pointerLockElement === this.canvas)
            {
                this.mouse.deltaX = e.movementX
                this.mouse.deltaY = e.movementY
            }
        })

        document.addEventListener('pointerlockchange', () =>
        {
            if(document.pointerLockElement !== this.canvas)
                this.mouse.right = false
        })

        window.addEventListener('wheel', (e) =>
        {
            if(!this.isReady || this.isGuiEvent(e)) return

            const scrollAmount = this.spherical.radius * config.camera.scrollSpeed * Math.sign(e.deltaY)
            this.spherical.radius = Math.max(
                this.minDistance,
                Math.min(
                    this.maxDistance,
                    this.spherical.radius + scrollAmount
                )
            )
        })

        window.addEventListener('contextmenu', (e) => e.preventDefault())
    }

    rotateAroundTarget(angle)
    {
        this.spherical.theta -= angle
    }

    update()
    {
        if(!this.isReady) return

        if(this.mouse.right || this.mouse.left)
        {
            this.spherical.theta -= this.mouse.deltaX * this.rotateSpeed
            this.spherical.phi   -= this.mouse.deltaY * this.rotateSpeed
        }

        this.spherical.phi = Math.max(
            this.minPolarAngle,
            Math.min(this.maxPolarAngle, this.spherical.phi)
        )

        const offset = new THREE.Vector3()
        offset.setFromSpherical(this.spherical)

        const targetPosition = this.target.position.clone()
        targetPosition.y += this.orbitYOffset

        this.instance.position.copy(targetPosition).add(offset)
        this.instance.lookAt(targetPosition)

        this.mouse.deltaX = 0
        this.mouse.deltaY = 0
    }

    resize()
    {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }
}