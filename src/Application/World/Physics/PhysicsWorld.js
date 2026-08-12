import * as CANNON from 'cannon-es'
import * as THREE  from 'three'
import config from '../../../config.js'

export default class PhysicsWorld
{
    constructor()
    {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, 0, 0),
        })

        this._rayFrom   = new CANNON.Vec3()
        this._rayTo     = new CANNON.Vec3()
        this._rayResult = new CANNON.RaycastResult()
    }

    configureGravity()
    {
        this.world.gravity.set(0, -config.character.gravity, 0)
    }

    addStaticObject(object)
    {
        const bodies = []
        object.updateWorldMatrix(true, true)

        object.traverse((child) =>
        {
            if(!child.isMesh) return
            const body = this._buildTrimeshBody(child)
            if(!body) return
            this.world.addBody(body)
            bodies.push(body)
        })

        return bodies
    }

    addStaticMesh(mesh)
    {
        mesh.updateWorldMatrix(true, true)
        const body = this._buildTrimeshBody(mesh)
        if(!body) return null
        this.world.addBody(body)
        return body
    }

    removeBody(body)
    {
        if(body) this.world.removeBody(body)
    }

    removeBodies(bodies)
    {
        if(bodies) bodies.forEach(b => this.world.removeBody(b))
    }

    raycastDown(x, startY, z, maxDist = 20)
    {
        this._rayFrom.set(x, startY, z)
        this._rayTo.set(x, startY - maxDist, z)
        this._rayResult.reset()

        this.world.raycastClosest(this._rayFrom, this._rayTo, {}, this._rayResult)

        if(!this._rayResult.hasHit) return null

        return {
            y:       this._rayResult.hitPointWorld.y,
            normalY: this._rayResult.hitNormalWorld.y,
        }
    }

    update(deltaMs)
    {
        this.world.step(1 / 60, deltaMs / 1000, 3)
    }

    _buildTrimeshBody(mesh)
    {
        const geo = mesh.geometry
        if(!geo || !geo.attributes.position) return null

        const posAttr = geo.attributes.position
        const matrix  = mesh.matrixWorld

        const vertices = new Float32Array(posAttr.count * 3)
        const tmp = new THREE.Vector3()

        for(let i = 0; i < posAttr.count; i++)
        {
            tmp.fromBufferAttribute(posAttr, i).applyMatrix4(matrix)
            vertices[i * 3 + 0] = tmp.x
            vertices[i * 3 + 1] = tmp.y
            vertices[i * 3 + 2] = tmp.z
        }

        let indices
        if(geo.index)
        {
            indices = Array.from(geo.index.array)
        }
        else
        {
            indices = Array.from({ length: posAttr.count }, (_, i) => i)
        }

        if(indices.length < 3) return null

        const shape = new CANNON.Trimesh(vertices, indices)
        const body  = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC })
        body.addShape(shape)
        return body
    }
}
