import * as THREE from 'three'
import Application from '../../Application.js'

export default class WallVisibility
{
    constructor(roomModel)
    {
        this.application = new Application()
        this.camera = this.application.camera

        this.walls = {}

        // Extract wall groups from room model by name
        roomModel.traverse((child) =>
        {
            if(child.name === 'wallFront') this.walls.wallFront = child
            if(child.name === 'wallBack') this.walls.wallBack = child
            if(child.name === 'wallLeft') this.walls.wallLeft = child
            if(child.name === 'wallRight') this.walls.wallRight = child
        })

        // Inward facing normals for each wall
        // These point toward the interior of the room
        this.wallNormals = {
            wallFront: new THREE.Vector3(1, 0, 0),
            wallBack:  new THREE.Vector3(-1, 0,  0),
            wallLeft:  new THREE.Vector3( 0, 0,  -1),
            wallRight: new THREE.Vector3(0, 0,  1),
        }
    }

    update()
    {
        const cameraPosition = this.camera.instance.position

        for(const [name, wall] of Object.entries(this.walls))
        {
            if(!wall) continue

            const wallPosition = new THREE.Vector3()
            wall.getWorldPosition(wallPosition)

            const cameraToWall = wallPosition.clone().sub(cameraPosition).normalize()
            const inwardNormal = this.wallNormals[name]
            const dot = cameraToWall.dot(inwardNormal)

            wall.visible = dot > -0.3
        }
    }
}