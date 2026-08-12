import * as THREE from 'three'
import Application from "../Application.js"
import IKTarget from "./IK/IKTarget.js"
import IKChain from "./IK/IKChain.js"
import config from "../../config.js";
import FootPlacementController from "./Locomotion/FootPlacementController.js";
import ProceduralNoise from "../ProceduralNoise.js";

export default class Hand
{
    constructor()
    {
        this.application = new Application()
        this.scene = this.application.scene
        this.resources = this.application.resources
        this.time = this.application.time
        this.debug = this.application.debug

        if(this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder('Noise')
            this.debugFolder.close()
        }

        this.resource = this.resources.items.handModel

        this.setTextures()
        this.setMaterial()
        this.setPivot()
        this.setModel()
        this.setIKTargets()
        this.setDebug()
        this.setIKChains()
        this.setFootPlacementController()
        this.setNoise()
    }

    setFootPlacementController()
    {
        this.footPlacementController = new FootPlacementController(
            this.ikTargets,
            this.chains,
            this.application.physicsWorld
        )
    }

    setTextures()
    {
        this.textures = {}

        this.textures.color = this.resources.items.handTexture
        this.textures.color.colorSpace = THREE.SRGBColorSpace
        this.textures.color.flipY = false

        this.textures.normal = this.resources.items.handNormal
        this.textures.normal.flipY = false

        this.textures.roughness = this.resources.items.handRoughness
        this.textures.roughness.flipY = false
    }

    setMaterial()
    {
        this.material = new THREE.MeshStandardMaterial({
            map: this.textures.color,
            roughnessMap: this.textures.roughness,
            normalMap: this.textures.normal
        })
    }

    setPivot()
    {
        this.pivot = new THREE.Group()
        this.pivot.position.set(0, 0, 0)
        this.pivot.scale.setScalar(config.hand.scale)
        this.scene.add(this.pivot)
    }

    setModel()
    {
        this.model = this.resource.scene

        // Tilt hand into Thing pose — palm down fingers forward
        // Pivot handles world Y rotation, model handles tilt only
        this.model.rotation.x = Math.PI / 2
        this.model.rotation.y = -Math.PI / 2

        this.model.traverse((child) =>
        {
            if(child instanceof THREE.Mesh)
            {
                child.castShadow = true
                child.receiveShadow = true
                child.material = this.material
                this.skinnedMesh = child
            }
        })

        this.skeleton = this.skinnedMesh.skeleton
        this.bones = {}

        this.skeleton.bones.forEach((bone) =>
        {
            this.bones[bone.name] = bone
        })



        //Modellgröße einmalig messen
        const box = new THREE.Box3().setFromObject(this.model)
        const size = new THREE.Vector3()
        box.getSize(size)
        this.modelLength = Math.max(size.x, size.y, size.z) * config.hand.scale

        console.log('modelLength:', this.modelLength)

        this.pivot.position.y = this.modelLength * config.hand.pivotYOffset
        this.pivot.add(this.model)
    }

    // Hand.js
    setIKTargets()
    {
        this.ikTargets = {}

        this.ikTargets.index  = new IKTarget('indexFinger',  this.pivot, this.bones['indexFingerEffector'],  1.0, this.modelLength)
        this.ikTargets.middle = new IKTarget('middleFinger', this.pivot, this.bones['middleFingerEffector'], 1.0, this.modelLength)
        this.ikTargets.ring   = new IKTarget('ringFinger',   this.pivot, this.bones['ringFingerEffector'],   1.0, this.modelLength)
        this.ikTargets.little = new IKTarget('littleFinger', this.pivot, this.bones['littleFingerEffector'], 1.0, this.modelLength)
        this.ikTargets.thumb  = new IKTarget('Thumb',        this.pivot, this.bones['thumbEffector'],        1.0, this.modelLength)
        this.ikTargets.thumb.mesh.position.y -= 0.03
    }

    setIKChains()
    {
        this.chains = IKChain.createAll(this.bones, this.ikTargets)
    }

    setNoise()
    {
        this.noise = new ProceduralNoise()

        this.noise.add('breathing', { octaves: 3, persistence: 0.5 })
        this.noise.add('wrist',    { octaves: 2, persistence: 0.4, seed: 2.13 })
        this.noise.add('palm',     { octaves: 2, persistence: 0.4, seed: 4.79 })

        this.noise.add('thumbX', { octaves: 2, persistence: 0.4, seed: 0 })
        this.noise.add('thumbY', { octaves: 2, persistence: 0.4, seed: 7.31 })
        this.noise.add('thumbZ', { octaves: 2, persistence: 0.4, seed: 13.47 })

        this._breathingOffset   = 0
        this._tiltHeightOffset  = 0
        this._movementBlend     = 0
        this._modelBaseRotZ     = this.model.rotation.z
        this._wristBaseRotX     = this.bones.wrist.rotation.x
        this._palmBaseRotX      = this.bones.palm.rotation.x
        this._thumbNoiseOffset   = new THREE.Vector3()
        this._mcpBoneNames      = ['indexFingerMCP', 'middleFingerMCP', 'ringFingerMCP', 'littleFingerMCP']
        this._mcpWorldPos       = new THREE.Vector3()

        const testAngle = 0.1
        this.model.rotation.z = this._modelBaseRotZ - testAngle
        this.pivot.updateMatrixWorld(true)
        let avgTilted = 0
        for(const name of this._mcpBoneNames)
        {
            this.bones[name].getWorldPosition(this._mcpWorldPos)
            avgTilted += this._mcpWorldPos.y
        }
        avgTilted /= this._mcpBoneNames.length

        this.model.rotation.z = this._modelBaseRotZ
        this.pivot.updateMatrixWorld(true)
        let avgBase = 0
        for(const name of this._mcpBoneNames)
        {
            this.bones[name].getWorldPosition(this._mcpWorldPos)
            avgBase += this._mcpWorldPos.y
        }
        avgBase /= this._mcpBoneNames.length

        this._mcpDropPerRadian = (avgBase - avgTilted) / testAngle
    }

    setDebug()
    {
        if(this.debug.active)
        {
            this.debugFolder.add(config.noise, 'enabled').name('Enabled')
            this.debugFolder.add(config.noise.breathing, 'speed', 0.05, 2, 0.05).name('Breathing Speed')
            this.debugFolder.add(config.noise.breathing, 'pivotAmplitude', 0, 0.02, 0.001).name('Pivot Amp')
            this.debugFolder.add(config.noise.breathing, 'wristAmplitude', 0, 0.1, 0.005).name('Wrist Amp')
            this.debugFolder.add(config.noise.breathing, 'palmAmplitude', 0, 0.1, 0.005).name('Palm Amp')
            this.debugFolder.add(config.noise.breathing, 'movementMultiplier', 1, 6, 0.1).name('Move Multiplier')
            this.debugFolder.add(config.noise.breathing, 'movementHeight', 0, 0.5, 0.01).name('Move Tilt')
            this.debugFolder.add(config.noise.thumb, 'speed', 0.02, 0.5, 0.01).name('Thumb Speed')
            this.debugFolder.add(config.noise.thumb, 'amplitude', 0, 0.02, 0.001).name('Thumb Amp')

            const fpFolder = this.debug.ui.addFolder('Foot Placement')
            fpFolder.add(config.footPlacement, 'penetrationCorrection').name('Penetration Correction')
            fpFolder.close()
        }
    }

    update()
    {
        this.pivot.position.y -= this._breathingOffset
        this.pivot.position.y -= this._tiltHeightOffset
        if(!config.ik.manualTargets)
            this.ikTargets.thumb.mesh.position.sub(this._thumbNoiseOffset)

        if(config.noise.enabled)
        {
            const t  = this.time.elapsed / 1000
            const dt = this.time.delta / 1000
            const c  = config.noise
            const breathSpeed = c.breathing.speed

            const sm = this.application.characterController.stateMachine
            let targetBlend = 0
            if(sm.is('walk')) targetBlend = 0.5
            else if(sm.is('run')) targetBlend = 1.0
            this._movementBlend += (targetBlend - this._movementBlend) * Math.min(1.0, 3.0 * dt)
            const moveScale = 1 + this._movementBlend * (c.breathing.movementMultiplier - 1)

            this._breathingOffset = this.noise.sample('breathing', t, breathSpeed) * c.breathing.pivotAmplitude * this.modelLength
            this.pivot.position.y += this._breathingOffset

            this.bones.wrist.rotation.x = this._wristBaseRotX + this.noise.sample('wrist', t, breathSpeed) * c.breathing.wristAmplitude * moveScale
            this.bones.palm.rotation.x  = this._palmBaseRotX  + this.noise.sample('palm',  t, breathSpeed) * c.breathing.palmAmplitude * moveScale

            const tiltAngle = this._movementBlend * c.breathing.movementHeight
            this.model.rotation.z = this._modelBaseRotZ - tiltAngle

            this._tiltHeightOffset = tiltAngle * this._mcpDropPerRadian
            config.footPlacement.palmHeightOffset = this._tiltHeightOffset
            this.pivot.position.y += this._tiltHeightOffset

            if(!config.ik.manualTargets)
            {
                const thumbAmp = c.thumb.amplitude * this.modelLength
                this._thumbNoiseOffset.set(
                    this.noise.sample('thumbX', t, c.thumb.speed) * thumbAmp,
                    this.noise.sample('thumbY', t, c.thumb.speed * 0.8) * thumbAmp * 0.7,
                    this.noise.sample('thumbZ', t, c.thumb.speed * 0.65) * thumbAmp
                )
                this.ikTargets.thumb.mesh.position.add(this._thumbNoiseOffset)
            }
        }
        else
        {
            this._breathingOffset = 0
            this._tiltHeightOffset = 0
            this.bones.wrist.rotation.x = this._wristBaseRotX
            this.bones.palm.rotation.x  = this._palmBaseRotX
            this.model.rotation.z = this._modelBaseRotZ
            config.footPlacement.palmHeightOffset = 0
            this._thumbNoiseOffset.set(0, 0, 0)
        }

        for(const chain of Object.values(this.chains))
        {
            chain.update()
        }
    }
}