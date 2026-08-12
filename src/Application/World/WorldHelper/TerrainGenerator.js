import * as THREE from 'three'
import Application from '../../Application.js'
import config from "../../../config.js";

export default class TerrainGenerator
{
    constructor()
    {
        this.application = new Application()
        this.scene = this.application.scene
        this.debug = this.application.debug

        // Platform dimensions and position
        this.platformCenter = new THREE.Vector3(0.125 * config.hand.scale, 0, 0)
        this.platformWidth = 1.25 * config.hand.scale
        this.platformLength = 1.5 * config.hand.scale

        // Current terrain
        this.currentTerrain = null
        this.currentMode = 'flat'
        this.skirting = null

        // Parameters
        this.params = {
            mode: 'flat',
            slope: {
                angle: 15,
                direction: 'forward'
            },
            noise: {
                amplitude: 0.05 * config.hand.scale,
                frequency: 3 * config.hand.scale,
                seed: Math.random() * 100
            }
        }

        // Geometry resolution
        this.segmentsW = 30
        this.segmentsL = 30

        // Material
        this.material = new THREE.MeshStandardMaterial({
            color: 0x444449,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        })

        this.generate('flat')
    }

    generate(mode)
    {
        this.currentMode = mode
        this.params.mode = mode

        // Remove existing terrain
        if(this.currentTerrain)
        {
            this.scene.remove(this.currentTerrain)
            this.currentTerrain.geometry.dispose()
            this.currentTerrain = null
        }

        // Remove existing skirting
        if(this.skirting)
        {
            this.scene.remove(this.skirting)
            this.skirting.children.forEach(child => child.geometry.dispose())
            this.skirting = null
        }

        const geometry = new THREE.PlaneGeometry(
            this.platformWidth,
            this.platformLength,
            this.segmentsW,
            this.segmentsL
        )

        geometry.rotateX(-Math.PI / 2)

        switch(mode)
        {
            case 'flat':
                this.generateFlat(geometry)
                break
            case 'slope':
                this.generateSlope(geometry)
                break
            case 'noise':
                this.generateNoise(geometry)
                break
        }

        geometry.computeVertexNormals()

        this.currentTerrain = new THREE.Mesh(geometry, this.material)
        this.currentTerrain.receiveShadow = true
        this.currentTerrain.castShadow = true
        this.currentTerrain.position.copy(this.platformCenter)
        this.scene.add(this.currentTerrain)

        this.addSkirting()
    }

    generateFlat(geometry)
    {
        // Flat — no vertex modification needed
    }

    generateSlope(geometry)
    {
        const positions = geometry.attributes.position
        const angleRad = (this.params.slope.angle * Math.PI) / 180
        const direction = this.params.slope.direction

        for(let i = 0; i < positions.count; i++)
        {
            const x = positions.getX(i)
            const z = positions.getZ(i)

            let height = 0

            switch(direction)
            {
                case 'forward':
                    height = (z / (this.platformLength / 2)) * Math.tan(angleRad) * (this.platformLength / 2)
                    break
                case 'backward':
                    height = -(z / (this.platformLength / 2)) * Math.tan(angleRad) * (this.platformLength / 2)
                    break
                case 'left':
                    height = (x / (this.platformWidth / 2)) * Math.tan(angleRad) * (this.platformWidth / 2)
                    break
                case 'right':
                    height = -(x / (this.platformWidth / 2)) * Math.tan(angleRad) * (this.platformWidth / 2)
                    break
                case 'diagonal':
                    height = ((x + z) / 2) * Math.tan(angleRad)
                    break
            }

            positions.setY(i, height)
        }

        // Shift so minimum Y is 0
        let minY = Infinity
        for(let i = 0; i < positions.count; i++)
        {
            minY = Math.min(minY, positions.getY(i))
        }
        for(let i = 0; i < positions.count; i++)
        {
            positions.setY(i, positions.getY(i) - minY)
        }

        positions.needsUpdate = true
    }

    generateNoise(geometry)
    {
        const positions = geometry.attributes.position
        const amplitude = this.params.noise.amplitude
        const frequency = this.params.noise.frequency
        const seed = this.params.noise.seed

        for(let i = 0; i < positions.count; i++)
        {
            const x = positions.getX(i)
            const z = positions.getZ(i)

            const height =
                amplitude * (
                    Math.sin((x * frequency + seed) * 2.1) *
                    Math.cos((z * frequency + seed) * 1.7) +
                    Math.sin((x * frequency * 0.5 + seed) * 3.3) *
                    Math.sin((z * frequency * 0.7 + seed) * 2.9) * 0.5
                )

            positions.setY(i, height)
        }

        // Shift so minimum Y is 0
        let minY = Infinity
        for(let i = 0; i < positions.count; i++)
        {
            minY = Math.min(minY, positions.getY(i))
        }
        for(let i = 0; i < positions.count; i++)
        {
            positions.setY(i, positions.getY(i) - minY)
        }

        positions.needsUpdate = true
    }

    addSkirting()
    {
        if(this.skirting)
        {
            this.scene.remove(this.skirting)
            this.skirting.children.forEach(child => child.geometry.dispose())
            this.skirting = null
        }

        const group = new THREE.Group()
        const skirtDepth = 0.1 // how far below Y=0 the skirting goes

        const skirtMaterial = new THREE.MeshStandardMaterial({
            color: 0x444449,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        })

        const positions = this.currentTerrain.geometry.attributes.position

        // Helper — build a skirt panel from an array of top edge points
        const buildPanel = (edgePoints) =>
        {
            const verts = []
            const indices = []

            for(let i = 0; i < edgePoints.length; i++)
            {
                const p = edgePoints[i]
                // Top vertex at terrain height
                verts.push(p.x, p.y, p.z)
                // Bottom vertex at skirt depth
                verts.push(p.x, -skirtDepth, p.z)
            }

            for(let i = 0; i < edgePoints.length - 1; i++)
            {
                const a = i * 2
                const b = i * 2 + 1
                const c = i * 2 + 2
                const d = i * 2 + 3
                indices.push(a, b, c)
                indices.push(b, d, c)
            }

            const geom = new THREE.BufferGeometry()
            geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
            geom.setIndex(indices)
            geom.computeVertexNormals()
            return new THREE.Mesh(geom, skirtMaterial)
        }

        // Collect edge vertices from terrain geometry
        const frontEdge = []  // z ≈ +platformLength/2
        const backEdge = []   // z ≈ -platformLength/2
        const leftEdge = []   // x ≈ -platformWidth/2
        const rightEdge = []  // x ≈ +platformWidth/2

        const halfW = this.platformWidth / 2
        const halfL = this.platformLength / 2
        const tolerance = 0.01

        for(let i = 0; i < positions.count; i++)
        {
            const x = positions.getX(i)
            const y = positions.getY(i)
            const z = positions.getZ(i)

            if(Math.abs(z - halfL) < tolerance)
                frontEdge.push({ x, y, z })
            else if(Math.abs(z + halfL) < tolerance)
                backEdge.push({ x, y, z })

            if(Math.abs(x + halfW) < tolerance)
                leftEdge.push({ x, y, z })
            else if(Math.abs(x - halfW) < tolerance)
                rightEdge.push({ x, y, z })
        }

        // Sort edges so vertices are in order
        frontEdge.sort((a, b) => a.x - b.x)
        backEdge.sort((a, b) => a.x - b.x)
        leftEdge.sort((a, b) => a.z - b.z)
        rightEdge.sort((a, b) => a.z - b.z)

        // Build panels
        if(frontEdge.length > 1) group.add(buildPanel(frontEdge))
        if(backEdge.length > 1) group.add(buildPanel(backEdge))
        if(leftEdge.length > 1) group.add(buildPanel(leftEdge))
        if(rightEdge.length > 1) group.add(buildPanel(rightEdge))

        // Bottom panel
        const bottomGeom = new THREE.PlaneGeometry(this.platformWidth, this.platformLength)
        const bottom = new THREE.Mesh(bottomGeom, skirtMaterial)
        bottom.rotation.x = Math.PI / 2
        bottom.position.set(0, -skirtDepth, 0)
        group.add(bottom)

        this.skirting = group
        this.skirting.position.copy(this.platformCenter)
        this.scene.add(this.skirting)
    }

    getHeightAt(worldX, worldZ)
    {
        const localX = worldX - this.platformCenter.x
        const localZ = worldZ - this.platformCenter.z

        switch(this.currentMode)
        {
            case 'flat':
                return 0

            case 'slope':
            {
                const angleRad = (this.params.slope.angle * Math.PI) / 180
                let height = 0
                switch(this.params.slope.direction)
                {
                    case 'forward':
                        height = (localZ / (this.platformLength / 2)) * Math.tan(angleRad) * (this.platformLength / 2)
                        break
                    case 'backward':
                        height = -(localZ / (this.platformLength / 2)) * Math.tan(angleRad) * (this.platformLength / 2)
                        break
                    case 'left':
                        height = (localX / (this.platformWidth / 2)) * Math.tan(angleRad) * (this.platformWidth / 2)
                        break
                    case 'right':
                        height = -(localX / (this.platformWidth / 2)) * Math.tan(angleRad) * (this.platformWidth / 2)
                        break
                    case 'diagonal':
                        height = ((localX + localZ) / 2) * Math.tan(angleRad)
                        break
                }
                // Apply same min shift
                const maxPossible = Math.tan(angleRad) * (this.platformLength / 2)
                return height + maxPossible
            }

            case 'noise':
            {
                const amplitude = this.params.noise.amplitude
                const frequency = this.params.noise.frequency
                const seed = this.params.noise.seed
                const height = amplitude * (
                    Math.sin((localX * frequency + seed) * 2.1) *
                    Math.cos((localZ * frequency + seed) * 1.7) +
                    Math.sin((localX * frequency * 0.5 + seed) * 3.3) *
                    Math.sin((localZ * frequency * 0.7 + seed) * 2.9) * 0.5
                )
                // Approximate min shift — not perfectly accurate but close enough
                return height + amplitude
            }

            default:
                return 0
        }
    }

    isWithinPlatform(worldX, worldZ)
    {
        const localX = worldX - this.platformCenter.x
        const localZ = worldZ - this.platformCenter.z
        return (
            Math.abs(localX) < this.platformWidth / 2 &&
            Math.abs(localZ) < this.platformLength / 2
        )
    }

    setDebug(onSwap)
    {
        if(!this.debug.active) return

        const rebuild = (mode) =>
        {
            if(onSwap) onSwap(mode)
            else this.generate(mode)
        }

        const folder = this.debug.ui.addFolder('Terrain')

        folder.add(this.params, 'mode', ['flat', 'slope', 'noise'])
            .name('Mode')
            .onChange((value) => rebuild(value))

        const slopeFolder = folder.addFolder('Slope')
        slopeFolder.add(this.params.slope, 'angle', 0, 35, 0.1)
            .name('Angle (°)')
            .onChange(() => { if(this.currentMode === 'slope') rebuild('slope') })
        slopeFolder.add(this.params.slope, 'direction', ['forward', 'backward', 'left', 'right', 'diagonal'])
            .name('Direction')
            .onChange(() => { if(this.currentMode === 'slope') rebuild('slope') })

        const noiseFolder = folder.addFolder('Noise')
        noiseFolder.add(this.params.noise, 'amplitude', 0.01, 0.15 * config.hand.scale, 0.001)
            .name('Amplitude')
            .onChange(() => { if(this.currentMode === 'noise') rebuild('noise') })
        noiseFolder.add(this.params.noise, 'frequency', 1, 10, 0.1)
            .name('Frequency')
            .onChange(() => { if(this.currentMode === 'noise') rebuild('noise') })
        noiseFolder.add({
            randomize: () =>
            {
                this.params.noise.seed = Math.random() * 100
                if(this.currentMode === 'noise') rebuild('noise')
            }
        }, 'randomize').name('Randomize Seed')
    }
}